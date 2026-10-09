-- =====================================================================
-- Recuperación de contraseña sin correo + herramientas del administrador
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Código de recuperación personal ----------
create table if not exists public.codigos_recuperacion (
  usuario_id      uuid primary key references auth.users (id) on delete cascade,
  codigo_hash     text not null,
  intentos        int not null default 0,
  bloqueado_hasta timestamptz,
  creado_en       timestamptz not null default now()
);
alter table public.codigos_recuperacion enable row level security;
-- Sin políticas: nadie puede leer esta tabla directamente, solo las funciones de abajo.

-- ¿El usuario conectado ya tiene un código?
create or replace function public.tengo_codigo_recuperacion()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.codigos_recuperacion where usuario_id = auth.uid() and codigo_hash <> 'usado');
$$;

-- Genera (o reemplaza) el código del usuario conectado y lo devuelve una sola vez
create or replace function public.generar_codigo_recuperacion()
returns text
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(12);
  v text := '';
  i int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  for i in 0..11 loop
    v := v || substr(alfabeto, 1 + (get_byte(bytes, i) % length(alfabeto)), 1);
  end loop;
  insert into public.codigos_recuperacion (usuario_id, codigo_hash)
  values (auth.uid(), extensions.crypt(v, extensions.gen_salt('bf')))
  on conflict (usuario_id) do update
    set codigo_hash = excluded.codigo_hash, intentos = 0, bloqueado_hasta = null, creado_en = now();
  return substr(v, 1, 4) || '-' || substr(v, 5, 4) || '-' || substr(v, 9, 4);
end;
$$;

-- Cambia la contraseña usando correo + código (no requiere sesión).
-- Devuelve: 'ok' | 'invalido' | 'bloqueado' | 'clave_corta'
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

  update auth.users
     set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_usuario;

  -- El código sirve una sola vez
  update public.codigos_recuperacion
     set codigo_hash = 'usado', intentos = 0, bloqueado_hasta = null
   where usuario_id = v_usuario;
  return 'ok';
end;
$$;

-- ---------- Herramientas del administrador ----------
create or replace function public.admin_listar_tecnicos()
returns table (id uuid, nombre text, correo text, rol text, confirmado boolean, creado_en timestamptz, ultimo_ingreso timestamptz, total_informes bigint)
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede ver los técnicos';
  end if;
  return query
    select p.id, p.nombre, p.correo, p.rol,
           u.email_confirmed_at is not null,
           p.creado_en, u.last_sign_in_at,
           (select count(*) from public.informes i where i.tecnico_id = p.id)
    from public.perfiles p
    join auth.users u on u.id = p.id
    order by p.nombre;
end;
$$;

create or replace function public.admin_cambiar_clave(p_usuario uuid, p_clave text)
returns void
language plpgsql
security definer set search_path = public, extensions, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede cambiar contraseñas';
  end if;
  if p_clave is null or length(p_clave) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = p_usuario;
end;
$$;

create or replace function public.admin_confirmar_cuenta(p_usuario uuid)
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede confirmar cuentas';
  end if;
  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
   where id = p_usuario;
end;
$$;

-- ---------- Permisos ----------
revoke all on function public.tengo_codigo_recuperacion() from public, anon;
revoke all on function public.generar_codigo_recuperacion() from public, anon;
revoke all on function public.recuperar_con_codigo(text, text, text) from public;
revoke all on function public.admin_listar_tecnicos() from public, anon;
revoke all on function public.admin_cambiar_clave(uuid, text) from public, anon;
revoke all on function public.admin_confirmar_cuenta(uuid) from public, anon;

grant execute on function public.tengo_codigo_recuperacion() to authenticated;
grant execute on function public.generar_codigo_recuperacion() to authenticated;
grant execute on function public.recuperar_con_codigo(text, text, text) to anon, authenticated;
grant execute on function public.admin_listar_tecnicos() to authenticated;
grant execute on function public.admin_cambiar_clave(uuid, text) to authenticated;
grant execute on function public.admin_confirmar_cuenta(uuid) to authenticated;
