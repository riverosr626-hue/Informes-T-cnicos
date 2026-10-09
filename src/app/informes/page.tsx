import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import { colorEstado, formatoFecha, type Informe, type Perfil } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function ListaInformes({
  searchParams,
}: {
  searchParams: Promise<{ tecnico?: string; q?: string }>;
}) {
  const { tecnico, q } = await searchParams;
  const { supabase, perfil } = await obtenerSesion();
  const esAdmin = perfil?.rol === "admin";

  let consulta = supabase
    .from("informes")
    .select("id, creado_en, fecha_evaluacion, tipo_evaluacion, cliente, ubicacion, marca, modelo, estado_general, tecnico_id, perfiles(nombre, correo)")
    .order("creado_en", { ascending: false })
    .limit(200);

  if (esAdmin && tecnico) consulta = consulta.eq("tecnico_id", tecnico);
  const busqueda = (q ?? "").replace(/[,()%*]/g, " ").trim();
  if (busqueda)
    consulta = consulta.or(`cliente.ilike.%${busqueda}%,ubicacion.ilike.%${busqueda}%,numero_serie.ilike.%${busqueda}%`);

  const { data: informes, error } = await consulta.returns<Informe[]>();

  const { data: tieneCodigo } = await supabase.rpc("tengo_codigo_recuperacion");

  let tecnicos: Perfil[] = [];
  if (esAdmin) {
    const { data } = await supabase.from("perfiles").select("id, nombre, correo, rol").order("nombre");
    tecnicos = (data as Perfil[]) ?? [];
  }

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {tieneCodigo === false && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <span>
              🔑 <strong>Crea tu código de recuperación</strong>: si olvidas tu contraseña, podrás recuperarla tú mismo.
            </span>
            <Link href="/cuenta" className="boton">Crear código</Link>
          </div>
        )}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{esAdmin ? "Todos los informes" : "Mis informes"}</h1>
            <p className="text-sm text-gray-500">
              {informes?.length ?? 0} informe{informes?.length === 1 ? "" : "s"}
              {esAdmin && " · vista de administrador"}
            </p>
          </div>
          <Link href="/informes/nuevo" className="boton">+ Nuevo informe</Link>
        </div>

        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar cliente, ubicación o N° de serie" className="campo max-w-xs" />
          {esAdmin && (
            <select name="tecnico" defaultValue={tecnico ?? ""} className="campo max-w-xs">
              <option value="">Todos los técnicos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.correo})</option>
              ))}
            </select>
          )}
          <button className="boton-sec">Filtrar</button>
          {(q || tecnico) && <Link href="/informes" className="boton-sec">Limpiar</Link>}
        </form>

        {error && <p className="tarjeta text-red-700">Error al cargar informes: {error.message}</p>}

        {informes && informes.length === 0 && (
          <div className="tarjeta text-center text-gray-500">
            Aún no hay informes. <Link href="/informes/nuevo" className="font-medium text-amber-700 underline">Crea el primero</Link>.
          </div>
        )}

        {informes && informes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">N°</th>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Cliente / Ubicación</th>
                  <th className="px-4 py-2.5">Equipo</th>
                  {esAdmin && <th className="px-4 py-2.5">Técnico</th>}
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Subido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {informes.map((i) => (
                  <tr key={i.id} className="hover:bg-amber-50/50">
                    <td className="px-4 py-2.5 font-mono">
                      <Link href={`/informes/${i.id}`} className="text-amber-700 underline">#{i.id}</Link>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{i.fecha_evaluacion}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{i.cliente}</div>
                      <div className="text-xs text-gray-500">{i.ubicacion}</div>
                    </td>
                    <td className="px-4 py-2.5">{[i.marca, i.modelo].filter(Boolean).join(" ") || "—"}</td>
                    {esAdmin && <td className="px-4 py-2.5">{i.perfiles?.nombre ?? "—"}</td>}
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorEstado(i.estado_general)}`}>
                        {i.estado_general}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{formatoFecha(i.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
