-- =====================================================================
-- Tres niveles de cuenta: técnico, administrador y propietario
--   técnico       → sube y ve sus propios informes
--   administrador → ve todo (informes, técnicos, solicitudes); confirma cuentas;
--                   cambia contraseñas / genera códigos SOLO de técnicos
--   propietario   → todo lo anterior + cambia contraseñas de administradores,
--                   cambia niveles, quita el acceso o elimina cuentas,
--                   y es el único que puede editar o borrar informes
-- (Ya aplicado en el proyecto Informes Técnicos el 2026-10-09)
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- (requiere 01 schema.sql, 02_recuperacion.sql y 03_solicitudes_recuperacion.sql)
-- =====================================================================

-- ---------- Nuevo nivel y estado de acceso ----------
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles
  add constraint perfiles_rol_check check (rol in ('tecnico', 'admin', 'propietario'));
alter table public.perfiles add column if not exists activo boolean not null default true;

-- Administrador o propietario (todo lo de "ver" sigue funcionando para ambos)
create or replace function public.es_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol in ('admin', 'propietario'));
$$;

create or replace function public.es_propietario()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'propietario');
$$;

create or replace function public._rol_de(p_usuario uuid)
returns text
language sql stable
security definer set search_path = public
as $$
  select rol from public.perfiles where id = p_usuario;
$$;

-- Un administrador solo puede gestionar contraseñas de técnicos;
-- el propietario, las de cualquiera.
create or replace function public._puede_gestionar_clave(p_usuario uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select public.es_propietario()
      or (public.es_admin() and coalesce(public._rol_de(p_usuario), 'tecnico') = 'tecnico');
$$;

-- ---------- Informes: editar y borrar, solo el propietario ----------
alter policy "editar informes admin" on public.informes using (public.es_propietario());
alter policy "borrar informes admin" on public.informes using (public.es_propietario());

-- ---------- Lista de cuentas (con nivel y estado de acceso) ----------
-- (reemplaza a admin_listar_tecnicos, que queda sin uso)
create or replace function public.admin_listar_cuentas()
returns table (id uuid, nombre text, correo text, rol text, activo boolean, confirmado boolean,
               creado_en timestamptz, ultimo_ingreso timestamptz, total_informes bigint)
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden ver las cuentas';
  end if;
  return query
    select p.id, p.nombre, p.correo, p.rol, p.activo,
           u.email_confirmed_at is not null,
           p.creado_en, u.last_sign_in_at,
           (select count(*) from public.informes i where i.tecnico_id = p.id)
    from public.perfiles p
    join auth.users u on u.id = p.id
    order by case p.rol when 'propietario' then 0 when 'admin' then 1 else 2 end, p.nombre;
end;
$$;

-- ---------- Solicitudes de recuperación (con el nivel de quien pide) ----------
-- (reemplaza a admin_listar_solicitudes, que queda sin uso)
create or replace function public.admin_listar_pedidos_clave()
returns table (id bigint, usuario_id uuid, nombre text, correo text, rol text, creado_en timestamptz)
language plpgsql
stable
security definer set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo los administradores pueden ver las solicitudes';
  end if;
  return query
    select s.id, s.usuario_id, coalesce(p.nombre, u.email::text), u.email::text,
           coalesce(p.rol, 'tecnico'), s.creado_en
    from public.solicitudes_recuperacion s
    join auth.users u on u.id = s.usuario_id
    left join public.perfiles p on p.id = s.usuario_id
    where s.estado = 'pendiente'
    order by s.creado_en desc;
end;
$$;

-- ---------- Contraseñas: respetan los niveles ----------
create or replace function public.admin_cambiar_clave(p_usuario uuid, p_clave text)
returns void
language plpgsql
security definer set search_path = public, extensions, auth
as $$
begin
  if not public._puede_gestionar_clave(p_usuario) then
    raise exception 'Solo el propietario puede cambiar la contraseña de un administrador o propietario';
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

create or replace function public.admin_generar_codigo(p_usuario uuid)
returns text
language plpgsql
security definer set search_path = public, extensions, auth
as $$
declare
  v text;
begin
  if not public._puede_gestionar_clave(p_usuario) then
    raise exception 'Solo el propietario puede generar códigos para un administrador o propietario';
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

-- ---------- Solo el propietario: cambiar el nivel de una cuenta ----------
create or replace function public.propietario_cambiar_rol(p_usuario uuid, p_rol text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario puede cambiar niveles';
  end if;
  if p_rol not in ('tecnico', 'admin', 'propietario') then
    raise exception 'Nivel no válido';
  end if;
  if p_usuario = auth.uid() then
    raise exception 'No puedes cambiar tu propio nivel';
  end if;
  update public.perfiles set rol = p_rol where id = p_usuario;
end;
$$;

-- ---------- Solo el propietario: quitar o devolver el acceso ----------
-- Quitar acceso bloquea el inicio de sesión pero conserva la cuenta y sus informes.
create or replace function public.propietario_cambiar_acceso(p_usuario uuid, p_activo boolean)
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario puede quitar o devolver el acceso';
  end if;
  if p_usuario = auth.uid() then
    raise exception 'No puedes quitarte el acceso a ti mismo';
  end if;
  update public.perfiles set activo = p_activo where id = p_usuario;
  update auth.users
     set banned_until = case when p_activo then null else 'infinity'::timestamptz end,
         updated_at = now()
   where id = p_usuario;
end;
$$;

-- Eliminar cuentas de forma definitiva se hace desde Supabase:
-- Authentication > Users > (marcar la cuenta) > Delete user.

-- ---------- Permisos ----------
revoke all on function public.es_propietario() from public, anon;
revoke all on function public._rol_de(uuid) from public, anon, authenticated;
revoke all on function public._puede_gestionar_clave(uuid) from public, anon, authenticated;
revoke all on function public.admin_listar_cuentas() from public, anon;
revoke all on function public.admin_listar_pedidos_clave() from public, anon;
revoke all on function public.propietario_cambiar_rol(uuid, text) from public, anon;
revoke all on function public.propietario_cambiar_acceso(uuid, boolean) from public, anon;

grant execute on function public.es_propietario() to authenticated;
grant execute on function public.admin_listar_cuentas() to authenticated;
grant execute on function public.admin_listar_pedidos_clave() to authenticated;
grant execute on function public.propietario_cambiar_rol(uuid, text) to authenticated;
grant execute on function public.propietario_cambiar_acceso(uuid, boolean) to authenticated;

-- =====================================================================
-- Para nombrar al primer propietario:
--   update public.perfiles set rol = 'propietario' where correo = 'TU_CORREO';
-- (Las cuentas sin acceso quedan con activo = false y auth.users.banned_until = 'infinity'.)
-- =====================================================================
