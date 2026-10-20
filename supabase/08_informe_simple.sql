-- =====================================================================
-- Informe simplificado
--   El formulario ahora pide solo: nombre del cliente, ubicación del cliente,
--   nombre del equipo, N° de serie, horómetro, descripción y fotos o videos.
--   Las columnas antiguas se conservan (los informes viejos se siguen viendo),
--   pero dejan de ser obligatorias.
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

alter table public.informes add column if not exists nombre_equipo text;
alter table public.informes add column if not exists descripcion text;

alter table public.informes alter column fecha_evaluacion set default (now() at time zone 'America/Santiago')::date;
alter table public.informes alter column fecha_evaluacion drop not null;
alter table public.informes alter column tipo_evaluacion drop not null;
alter table public.informes alter column estado_general drop not null;
