-- =====================================================================
-- Recuperación de contraseña con ayuda del administrador (sin correo)
--   1. El técnico pide ayuda desde "¿Olvidaste tu contraseña?" con su correo.
--   2. Los administradores ven el aviso en la app (menú Técnicos).
--   3. El administrador genera un código de un solo uso (vale 24 horas)
--      y se lo da al técnico; con ese código el técnico crea su contraseña nueva.
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- (requiere haber ejecutado antes 02_recuperacion.sql)
-- =====================================================================

-- Los códigos entregados por un administrador vencen; el código personal no.
alter table public.codigos_recuperacion add column if not exists expira_en timestamptz;

create table if not exists public.solicitudes_recuperacion (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  creado_en    timestamptz not null default now(),
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'atendida', 'descartada')),
  atendida_por uuid references auth.users (id) on delete set null,
  atendida_en  timestamptz
);
create index if not exists solicitudes_pendientes_idx
  on public.solicitudes_recuperacion (estado, creado_en desc);

alter table public.solicitudes_recuperacion enable row level security;
-- Sin políticas: solo se accede mediante las funciones de abajo.

-- ---------- Genera un código legible: XXXX-XXXX-XXXX ----------
create or replace function public._nuevo_codigo()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(12);
  v text := '';
  i int;
begin
  for i in 0..11 loop
    v := v || substr(alfabeto, 1 + (get_byte(bytes, i) % length(alfabeto)), 1);
  end loop;
  return v;
end;
$$;

-- ---------- 1. El técnico pide ayuda (no requiere sesión) ----------
-- Siempre responde 'ok' para no revelar qué correos tienen cuenta.
create or replace function public.solicitar_recuperacion(p_correo text)
returns text
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_usuario uuid;
begin
  select id into v_usuario from auth.users where lower(email) = lower(trim(coalesce(p_correo, '')));
  if v_usuario is null then
    return 'ok';
  end if;
  -- Una sola solicitud pendiente por persona (si ya hay una, se actualiza la hora)
  update public.solicitudes_recuperacion
     set creado_en = now()
   where usuario_id = v_usuario and estado = 'pendiente';
  if not found then
    insert into public.solicitudes_recuperacion (usuario_id) values (v_usuario);
  end if;
  return 'ok';
end;
$$;

-- ---------- 2. Los administradores ven las solicitudes pendientes ----------
create or replace function public.admin_listar_solicitudes()
returns table (id bigint, usuario_id uuid, nombre text, correo text, creado_en timestamptz)
language plpgsql
stable
security definer set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede ver las solicitudes';
  end if;
  return query
    select s.id, s.usuario_id, coalesce(p.nombre, u.email::text), u.email::text, s.creado_en
    from public.solicitudes_recuperacion s
    join auth.users u on u.id = s.usuario_id
    left join public.perfiles p on p.id = s.usuario_id
    where s.estado = 'pendiente'
    order by s.creado_en desc;
end;
$$;

-- ---------- 3. El administrador genera el código para el técnico ----------
-- Devuelve el código una sola vez; vale 24 horas y sirve una sola vez.
create or replace function public.admin_generar_codigo(p_usuario uuid)
returns text
language plpgsql
security definer set search_path = public, extensions, auth
as $$
declare
  v text;
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede generar códigos';
  end if;
  if not exists (select 1 from auth.users where id = p_usuario) then
    raise exception 'La cuenta no existe';
  end if;
  v := public._nuevo_codigo();
  insert into public.codigos_recuperacion (usuario_id, codigo_hash, expira_en)
  values (p_usuario, extensions.crypt(v, extensions.gen_salt('bf')), now() + interval '24 hours')
  on conflict (usuario_id) do update
    set codigo_hash = excluded.codigo_hash, intentos = 0, bloqueado_hasta = null,
        creado_en = now(), expira_en = excluded.expira_en;
  update public.solicitudes_recuperacion
     set estado = 'atendida', atendida_por = auth.uid(), atendida_en = now()
   where usuario_id = p_usuario and estado = 'pendiente';
  return substr(v, 1, 4) || '-' || substr(v, 5, 4) || '-' || substr(v, 9, 4);
end;
$$;

create or replace function public.admin_descartar_solicitud(p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede descartar solicitudes';
  end if;
  update public.solicitudes_recuperacion
     set estado = 'descartada', atendida_por = auth.uid(), atendida_en = now()
   where id = p_id and estado = 'pendiente';
end;
$$;

-- ---------- El código personal (Mi cuenta) no vence ----------
create or replace function public.generar_codigo_recuperacion()
returns text
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  v := public._nuevo_codigo();
  insert into public.codigos_recuperacion (usuario_id, codigo_hash, expira_en)
  values (auth.uid(), extensions.crypt(v, extensions.gen_salt('bf')), null)
  on conflict (usuario_id) do update
    set codigo_hash = excluded.codigo_hash, intentos = 0, bloqueado_hasta = null,
        creado_en = now(), expira_en = null;
  return substr(v, 1, 4) || '-' || substr(v, 5, 4) || '-' || substr(v, 9, 4);
end;
$$;

-- ---------- Usar el código: ahora revisa el vencimiento ----------
-- Devuelve: 'ok' | 'invalido' | 'bloqueado' | 'clave_corta' | 'vencido'
create or replace function public.recuperar_con_codigo(p_correo text, p_codigo text, p_clave text)
returns text
language plpgsql
security definer set search_path = public, extensions, auth
as $$
declare
  v_usuario uuid;
  r public.codigos_recuperacion%rowtype;
  v_limpio text;
begin
  if p_clave is null or length(p_clave) < 6 then
    return 'clave_corta';
  end if;

  select id into v_usuario from auth.users where lower(email) = lower(trim(p_correo));
  if v_usuario is null then
    return 'invalido';
  end if;

  select * into r from public.codigos_recuperacion where usuario_id = v_usuario;
  if not found or r.codigo_hash = 'usado' then
    return 'invalido';
  end if;

  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return 'bloqueado';
  end if;

  v_limpio := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));

  if extensions.crypt(v_limpio, r.codigo_hash) <> r.codigo_hash then
    update public.codigos_recuperacion
       set intentos = intentos + 1,
           bloqueado_hasta = case when intentos + 1 >= 5 then now() + interval '30 minutes' else null end
     where usuario_id = v_usuario;
    return 'invalido';
  end if;

  if r.expira_en is not null and r.expira_en < now() then
    return 'vencido';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_usuario;

  -- El código sirve una sola vez
  update public.codigos_recuperacion
     set codigo_hash = 'usado', intentos = 0, bloqueado_hasta = null, expira_en = null
   where usuario_id = v_usuario;

  -- Si había una solicitud pendiente, queda resuelta
  update public.solicitudes_recuperacion
     set estado = 'atendida', atendida_en = now()
   where usuario_id = v_usuario and estado = 'pendiente';

  return 'ok';
end;
$$;

-- ---------- Permisos ----------
revoke all on function public._nuevo_codigo() from public, anon, authenticated;
revoke all on function public.solicitar_recuperacion(text) from public;
revoke all on function public.admin_listar_solicitudes() from public, anon;
revoke all on function public.admin_generar_codigo(uuid) from public, anon;
revoke all on function public.admin_descartar_solicitud(bigint) from public, anon;
revoke all on function public.generar_codigo_recuperacion() from public, anon;
revoke all on function public.recuperar_con_codigo(text, text, text) from public;

grant execute on function public.solicitar_recuperacion(text) to anon, authenticated;
grant execute on function public.admin_listar_solicitudes() to authenticated;
grant execute on function public.admin_generar_codigo(uuid) to authenticated;
grant execute on function public.admin_descartar_solicitud(bigint) to authenticated;
grant execute on function public.generar_codigo_recuperacion() to authenticated;
grant execute on function public.recuperar_con_codigo(text, text, text) to anon, authenticated;
