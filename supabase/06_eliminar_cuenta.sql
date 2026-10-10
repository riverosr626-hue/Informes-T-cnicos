-- =====================================================================
-- Eliminar la propia cuenta (Mi cuenta) conservando los informes
-- PARTE 1 (ya aplicada el 2026-10-09): cada informe guarda nombre y correo del técnico.
-- PARTE 2 (pendiente): pegar desde "PARTE 2" en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- PARTE 1 ----------
alter table public.informes add column if not exists tecnico_nombre text;
alter table public.informes add column if not exists tecnico_correo text;
update public.informes i
   set tecnico_nombre = p.nombre, tecnico_correo = p.correo
  from public.perfiles p
 where p.id = i.tecnico_id and i.tecnico_nombre is null;

create or replace function public._informe_guardar_tecnico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tecnico_id is not null and (new.tecnico_nombre is null or new.tecnico_correo is null) then
    select coalesce(new.tecnico_nombre, p.nombre), coalesce(new.tecnico_correo, p.correo)
      into new.tecnico_nombre, new.tecnico_correo
      from public.perfiles p where p.id = new.tecnico_id;
  end if;
  return new;
end;
$$;
create or replace trigger informe_guardar_tecnico
  before insert on public.informes
  for each row execute function public._informe_guardar_tecnico();

-- ---------- PARTE 2 ----------
alter table public.informes alter column tecnico_id drop not null;

create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_yo uuid := auth.uid();
begin
  if v_yo is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if public._rol_de(v_yo) = 'propietario'
     and not exists (select 1 from public.perfiles where rol = 'propietario' and activo and id <> v_yo) then
    raise exception 'Eres el único propietario. Nombra a otro propietario antes de eliminar tu cuenta.';
  end if;

  -- Los informes se conservan: guardan quién los hizo y se desvinculan de la cuenta
  update public.informes i
     set tecnico_nombre = coalesce(i.tecnico_nombre, p.nombre),
         tecnico_correo = coalesce(i.tecnico_correo, p.correo),
         tecnico_id = null
    from public.perfiles p
   where p.id = v_yo and i.tecnico_id = v_yo;

  -- Borra solo la cuenta de quien la usa (perfil, códigos y solicitudes se borran solos)
  delete from auth.users where id = v_yo;
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public, anon;
grant execute on function public.eliminar_mi_cuenta() to authenticated;
