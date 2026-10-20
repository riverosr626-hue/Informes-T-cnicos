-- =====================================================================
-- Cuentas solo con aprobación
--   1. Nadie puede crear su propia cuenta: desde la pantalla de ingreso
--      solo se envía una SOLICITUD (nombre + correo + mensaje opcional).
--   2. Un propietario o administrador la ve en Configuración y la aprueba
--      (se crea la cuenta como Técnico con una contraseña temporal) o la rechaza.
--   3. Un bloqueo en la base de datos impide cualquier registro directo
--      (aunque alguien intente usar la API de Supabase por fuera de la app).
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- (requiere haber ejecutado antes 02, 03 y 04)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Solicitudes ----------
create table if not exists public.solicitudes_cuenta (
  id           bigint generated always as identity primary key,
  nombre       text not null check (length(trim(nombre)) between 3 and 120),
  correo       text not null check (length(trim(correo)) between 5 and 200),
  mensaje      text check (mensaje is null or length(mensaje) <= 500),
  creado_en    timestamptz not null default now(),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  atendida_por uuid references auth.users (id) on delete set null,
  atendida_en  timestamptz,
  usuario_id   uuid references auth.users (id) on delete set null
);
create index if not exists solicitudes_cuenta_pendientes_idx
  on public.solicitudes_cuenta (estado, creado_en desc);
-- Una sola solicitud pendiente por correo
create unique index if not exists solicitudes_cuenta_correo_pendiente_idx
  on public.solicitudes_cuenta (lower(correo)) where estado = 'pendiente';

alter table public.solicitudes_cuenta enable row level security;
-- Sin políticas: solo se accede mediante las funciones de abajo.

-- ---------- Bloqueo de registros directos ----------
-- Solo se pueden crear cuentas desde admin_aprobar_solicitud_cuenta,
-- que marca la transacción con app.alta_autorizada = 'si'.
create or replace function public.bloquear_registro_directo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(current_setting('app.alta_autorizada', true), '') <> 'si' then
    raise exception 'Las cuentas nuevas deben solicitarse a un administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists bloquear_registro_directo on auth.users;
create trigger bloquear_registro_directo
  before insert on auth.users
  for each row execute function public.bloquear_registro_directo();

-- ---------- 1. Pedir una cuenta (no requiere sesión) ----------
-- Devuelve: 'ok' | 'datos' (nombre o correo inválidos) | 'existe' (ese correo ya tiene cuenta) | 'lleno'
create or replace function public.solicitar_cuenta(p_nombre text, p_correo text, p_mensaje text default null)
returns text
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_nombre  text := trim(coalesce(p_nombre, ''));
  v_correo  text := lower(trim(coalesce(p_correo, '')));
  v_mensaje text := nullif(trim(coalesce(p_mensaje, '')), '');
begin
  if length(v_nombre) < 3 or length(v_nombre) > 120
     or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_correo) > 200 then
    return 'datos';
  end if;
  if v_mensaje is not null then
    v_mensaje := left(v_mensaje, 500);
  end if;

  if exists (select 1 from auth.users where lower(email) = v_correo) then
    return 'existe';
  end if;

  -- Freno contra abuso: como máximo 50 solicitudes pendientes en total
  if (select count(*) from public.solicitudes_cuenta where estado = 'pendiente') >= 50
     and not exists (select 1 from public.solicitudes_cuenta where estado = 'pendiente' and lower(correo) = v_correo) then
    return 'lleno';
  end if;

  -- Si ya había una pendiente con ese correo, se actualiza
  update public.solicitudes_cuenta
     set nombre = v_nombre, mensaje = v_mensaje, creado_en = now()
   where estado = 'pendiente' and lower(correo) = v_correo;
  if not found then
    insert into public.solicitudes_cuenta (nombre, correo, mensaje)
    values (v_nombre, v_correo, v_mensaje);
  end if;
  return 'ok';
end;
$$;

-- ---------- 2. Ver las solicitudes pendientes ----------
create or replace function public.admin_listar_solicitudes_cuenta()
returns table (id bigint, nombre text, correo text, mensaje text, creado_en timestamptz)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo administradores y propietarios pueden ver las solicitudes de cuenta';
  end if;
  return query
    select s.id, s.nombre, s.correo, s.mensaje, s.creado_en
    from public.solicitudes_cuenta s
    where s.estado = 'pendiente'
    order by s.creado_en desc;
end;
$$;

-- ---------- 3. Aprobar: crea la cuenta (Técnico) con contraseña temporal ----------
create or replace function public.admin_aprobar_solicitud_cuenta(p_id bigint, p_clave text)
returns uuid
language plpgsql
security definer set search_path = public, extensions, auth
as $$
declare
  s public.solicitudes_cuenta%rowtype;
  v_id uuid := gen_random_uuid();
begin
  if not public.es_admin() then
    raise exception 'Solo administradores y propietarios pueden aprobar cuentas';
  end if;
  if p_clave is null or length(p_clave) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;

  select * into s from public.solicitudes_cuenta where id = p_id and estado = 'pendiente' for update;
  if not found then
    raise exception 'La solicitud ya fue atendida o no existe';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(s.correo)) then
    raise exception 'Ese correo ya tiene una cuenta';
  end if;

  -- Autoriza el alta solo dentro de esta transacción
  perform set_config('app.alta_autorizada', 'si', true);

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    lower(s.correo), extensions.crypt(p_clave, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', s.nombre),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', lower(s.correo), 'email_verified', true),
    'email', now(), now(), now()
  );

  perform set_config('app.alta_autorizada', '', true);

  -- El perfil lo crea el disparador al_registrar_usuario (nivel Técnico)
  update public.solicitudes_cuenta
     set estado = 'aprobada', atendida_por = auth.uid(), atendida_en = now(), usuario_id = v_id
   where id = p_id;

  return v_id;
end;
$$;

-- ---------- 4. Rechazar ----------
create or replace function public.admin_rechazar_solicitud_cuenta(p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo administradores y propietarios pueden rechazar solicitudes';
  end if;
  update public.solicitudes_cuenta
     set estado = 'rechazada', atendida_por = auth.uid(), atendida_en = now()
   where id = p_id and estado = 'pendiente';
end;
$$;

-- ---------- Permisos ----------
revoke all on function public.bloquear_registro_directo() from public, anon, authenticated;
revoke all on function public.solicitar_cuenta(text, text, text) from public;
revoke all on function public.admin_listar_solicitudes_cuenta() from public, anon;
revoke all on function public.admin_aprobar_solicitud_cuenta(bigint, text) from public, anon;
revoke all on function public.admin_rechazar_solicitud_cuenta(bigint) from public, anon;

grant execute on function public.solicitar_cuenta(text, text, text) to anon, authenticated;
grant execute on function public.admin_listar_solicitudes_cuenta() to authenticated;
grant execute on function public.admin_aprobar_solicitud_cuenta(bigint, text) to authenticated;
grant execute on function public.admin_rechazar_solicitud_cuenta(bigint) to authenticated;
