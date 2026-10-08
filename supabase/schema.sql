-- =====================================================================
-- Informes de Evaluación de Generadores — esquema Supabase
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Perfiles de usuario (uno por cuenta registrada) ----------
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null,
  correo     text not null,
  rol        text not null default 'tecnico' check (rol in ('tecnico', 'admin')),
  creado_en  timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists al_registrar_usuario on auth.users;
create trigger al_registrar_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- ¿El usuario actual es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- ---------- Informes ----------
create table if not exists public.informes (
  id                 bigint generated always as identity primary key,
  tecnico_id         uuid not null default auth.uid() references public.perfiles (id),
  creado_en          timestamptz not null default now(),

  -- Datos generales
  fecha_evaluacion   date not null,
  tipo_evaluacion    text not null check (tipo_evaluacion in ('Preventiva', 'Correctiva', 'Inspección', 'Puesta en marcha')),
  cliente            text not null,
  ubicacion          text,

  -- Equipo
  marca              text,
  modelo             text,
  numero_serie       text,
  potencia_kva       numeric,
  horometro          numeric,

  -- Mediciones
  voltaje_l1         numeric,
  voltaje_l2         numeric,
  voltaje_l3         numeric,
  frecuencia_hz      numeric,
  presion_aceite_psi numeric,
  temperatura_c      numeric,
  voltaje_bateria    numeric,

  -- Inspección visual (Bueno / Regular / Malo / N/A)
  nivel_aceite       text,
  nivel_refrigerante text,
  nivel_combustible  text,
  estado_filtros     text,
  estado_correas     text,
  estado_bateria     text,
  prueba_con_carga   boolean,

  -- Conclusión
  estado_general     text not null check (estado_general in ('Operativo', 'Operativo con observaciones', 'Fuera de servicio')),
  observaciones      text,
  recomendaciones    text,
  fotos              text[] not null default '{}'
);

create index if not exists informes_tecnico_idx on public.informes (tecnico_id);
create index if not exists informes_creado_idx  on public.informes (creado_en desc);

-- ---------- Seguridad (Row Level Security) ----------
alter table public.perfiles enable row level security;
alter table public.informes enable row level security;

-- Perfiles: cada uno ve el suyo; el admin ve todos
drop policy if exists "ver perfiles" on public.perfiles;
create policy "ver perfiles" on public.perfiles
  for select using (id = auth.uid() or public.es_admin());

-- Informes: el técnico ve los suyos; el admin ve todos
drop policy if exists "ver informes" on public.informes;
create policy "ver informes" on public.informes
  for select using (tecnico_id = auth.uid() or public.es_admin());

-- Solo se puede subir un informe a nombre propio (no se puede suplantar a otro técnico)
drop policy if exists "crear informes" on public.informes;
create policy "crear informes" on public.informes
  for insert with check (tecnico_id = auth.uid());

-- Solo el admin puede corregir o borrar informes ya enviados
drop policy if exists "editar informes admin" on public.informes;
create policy "editar informes admin" on public.informes
  for update using (public.es_admin());

drop policy if exists "borrar informes admin" on public.informes;
create policy "borrar informes admin" on public.informes
  for delete using (public.es_admin());

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

-- Cada técnico sube fotos solo a su propia carpeta: fotos/<su-id>/...
drop policy if exists "subir fotos propias" on storage.objects;
create policy "subir fotos propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ver fotos" on storage.objects;
create policy "ver fotos" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

-- =====================================================================
-- Después de registrarte en la app, conviértete en administrador con:
--   update public.perfiles set rol = 'admin' where correo = 'TU_CORREO';
-- =====================================================================
