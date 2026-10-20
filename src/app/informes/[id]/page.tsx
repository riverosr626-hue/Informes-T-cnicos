import Link from "next/link";
import { notFound } from "next/navigation";
import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import { colorEstado, esVideo, formatoFecha, type Informe } from "@/lib/tipos";
import BotonImprimir from "./BotonImprimir";

export const dynamic = "force-dynamic";

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="font-medium">{valor === null || valor === undefined || valor === "" ? "—" : valor}</dd>
    </div>
  );
}

const hay = (...v: unknown[]) => v.some((x) => x !== null && x !== undefined && x !== "");

export default async function DetalleInforme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await obtenerSesion();

  const { data: i } = await supabase
    .from("informes")
    .select("*, perfiles(nombre, correo)")
    .eq("id", Number(id))
    .single<Informe>();

  if (!i) notFound();

  let archivos: { url: string; video: boolean }[] = [];
  if (i.fotos.length > 0) {
    const { data } = await supabase.storage.from("fotos").createSignedUrls(i.fotos, 60 * 60);
    archivos = (data ?? [])
      .map((f, n) => ({ url: f.signedUrl, video: esVideo(i.fotos[n] ?? "") }))
      .filter((f): f is { url: string; video: boolean } => !!f.url);
  }
  const fotos = archivos.filter((a) => !a.video);
  const videos = archivos.filter((a) => a.video);

  // Datos del formulario antiguo (solo se muestran en informes viejos que los tengan)
  const antiguoMediciones = hay(i.voltaje_l1, i.voltaje_l2, i.voltaje_l3, i.frecuencia_hz, i.presion_aceite_psi, i.temperatura_c, i.voltaje_bateria);
  const antiguoInspeccion = hay(i.nivel_aceite, i.nivel_refrigerante, i.nivel_combustible, i.estado_filtros, i.estado_correas, i.estado_bateria, i.prueba_con_carga);
  const carga = i.prueba_con_carga === true ? "Aprobada" : i.prueba_con_carga === false ? "No aprobada" : "No aplica";

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="no-imprimir flex items-center justify-between">
          <Link href="/informes" className="text-sm text-gray-600 hover:underline">← Volver</Link>
          <BotonImprimir />
        </div>

        <div className="tarjeta">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marca-700">Informe técnico #{i.id}</p>
              <h1 className="text-2xl font-bold">{i.cliente}</h1>
              <p className="text-sm text-gray-500">{i.ubicacion}</p>
            </div>
            {i.estado_general && (
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${colorEstado(i.estado_general)}`}>{i.estado_general}</span>
            )}
          </div>
          <dl className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
            <Dato label="Técnico" valor={i.perfiles?.nombre} />
            <Dato label="Correo técnico" valor={<span className="break-all">{i.perfiles?.correo}</span>} />
            <Dato label="Fecha" valor={i.fecha_evaluacion} />
            <Dato label="Subido el" valor={formatoFecha(i.creado_en)} />
            {i.tipo_evaluacion && <Dato label="Tipo" valor={i.tipo_evaluacion} />}
          </dl>
        </div>

        <div className="tarjeta">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Equipo</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato label="Nombre del equipo" valor={i.nombre_equipo || [i.marca, i.modelo].filter(Boolean).join(" ")} />
            <Dato label="N° de serie" valor={i.numero_serie} />
            <Dato label="Horómetro" valor={i.horometro != null ? `${i.horometro} h` : null} />
            {i.potencia_kva != null && <Dato label="Potencia" valor={`${i.potencia_kva} kVA`} />}
          </dl>
        </div>

        {(i.descripcion || !hay(i.observaciones, i.recomendaciones)) && (
          <div className="tarjeta">
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Descripción</h2>
            <p className="whitespace-pre-wrap text-sm">{i.descripcion || "—"}</p>
          </div>
        )}

        {antiguoMediciones && (
          <div className="tarjeta">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Mediciones</h2>
            <dl className="grid gap-4 sm:grid-cols-4">
              <Dato label="L1" valor={i.voltaje_l1 != null ? `${i.voltaje_l1} V` : null} />
              <Dato label="L2" valor={i.voltaje_l2 != null ? `${i.voltaje_l2} V` : null} />
              <Dato label="L3" valor={i.voltaje_l3 != null ? `${i.voltaje_l3} V` : null} />
              <Dato label="Frecuencia" valor={i.frecuencia_hz != null ? `${i.frecuencia_hz} Hz` : null} />
              <Dato label="Presión aceite" valor={i.presion_aceite_psi != null ? `${i.presion_aceite_psi} psi` : null} />
              <Dato label="Temperatura" valor={i.temperatura_c != null ? `${i.temperatura_c} °C` : null} />
              <Dato label="Batería" valor={i.voltaje_bateria != null ? `${i.voltaje_bateria} V` : null} />
            </dl>
          </div>
        )}

        {antiguoInspeccion && (
          <div className="tarjeta">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Inspección</h2>
            <dl className="grid gap-4 sm:grid-cols-4">
              <Dato label="Aceite" valor={i.nivel_aceite} />
              <Dato label="Refrigerante" valor={i.nivel_refrigerante} />
              <Dato label="Combustible" valor={i.nivel_combustible} />
              <Dato label="Filtros" valor={i.estado_filtros} />
              <Dato label="Correas" valor={i.estado_correas} />
              <Dato label="Batería" valor={i.estado_bateria} />
              <Dato label="Prueba con carga" valor={carga} />
            </dl>
          </div>
        )}

        {hay(i.observaciones, i.recomendaciones) && (
          <div className="tarjeta space-y-4">
            <div>
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Observaciones</h2>
              <p className="whitespace-pre-wrap text-sm">{i.observaciones || "—"}</p>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Recomendaciones</h2>
              <p className="whitespace-pre-wrap text-sm">{i.recomendaciones || "—"}</p>
            </div>
          </div>
        )}

        {fotos.length > 0 && (
          <div className="tarjeta">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Fotos ({fotos.length})</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((f, n) => (
                <a key={n} href={f.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt={`Foto ${n + 1}`} className="aspect-square w-full rounded-md object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="tarjeta no-imprimir">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Videos ({videos.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {videos.map((v, n) => (
                <video key={n} src={v.url} controls preload="metadata" className="w-full rounded-md bg-black" />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
