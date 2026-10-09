-- =====================================================================
-- Espacio usado en Supabase (solo el propietario lo ve en Configuración)
--   base de datos → cuentas, correos, informes y registros
--   archivos      → fotos y documentos subidos (Storage)
-- (Ya aplicado en el proyecto Informes Técnicos el 2026-10-09)
-- Pegar completo en Supabase > SQL Editor > New query > Run
-- =====================================================================

create or replace function public.propietario_uso_espacio()
returns table (base_datos_bytes bigint, archivos_bytes bigint, total_archivos bigint,
               total_informes bigint, total_cuentas bigint)
language plpgsql
stable
security definer set search_path = public, storage, auth
as $$
begin
  if not public.es_propietario() then
    raise exception 'Solo el propietario puede ver el espacio usado';
  end if;
  return query
    select pg_database_size(current_database())::bigint,
           (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o)::bigint,
           (select count(*) from storage.objects),
           (select count(*) from public.informes),
           (select count(*) from auth.users);
end;
$$;

revoke all on function public.propietario_uso_espacio() from public, anon;
grant execute on function public.propietario_uso_espacio() to authenticated;
