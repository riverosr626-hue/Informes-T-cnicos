"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import Encabezado from "@/components/Encabezado";
import { db, storage } from "@/lib/firebase";
import { Protegida } from "@/lib/sesion";
import { colorEstado, formatoFecha, type Informe } from "@/lib/tipos";
import BotonImprimir from "./BotonImprimir";

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="font-medium">{valor === null || valor === undefined || valor === "" ? "—" : valor}</dd>
    </div>
  );
}

function Contenido() {
  const { id } = useParams<{ id: string }>();
  const [i, setInforme] = useState<Informe | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "no-encontrado">("cargando");
  const [urlsFotos, setUrlsFotos] = useState<string[]>([]);

  useEffect(() => {
    getDoc(doc(db(), "informes", String(id)))
      .then(async (snap) => {
        if (!snap.exists()) return setEstado("no-encontrado");
        const datos = snap.data() as Informe;
        setInforme(datos);
        setEstado("listo");
        const urls = await Promise.allSettled((datos.fotos ?? []).map((ruta) => getDownloadURL(ref(storage(), ruta))));
        setUrlsFotos(urls.flatMap((u) => (u.status === "fulfilled" ? [u.value] : [])));
      })
      // Sin permiso para verlo (es de otro técnico) se trata igual que no encontrado
      .catch(() => setEstado("no-encontrado"));
  }, [id]);

  if (estado === "cargando") {
    return (
      <>
        <Encabezado />
        <main className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-gray-500">Cargando informe…</main>
      </>
    );
  }

  if (estado === "no-encontrado" || !i) {
    return (
      <>
        <Encabezado />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="tarjeta text-center text-gray-600">
            No se encontró el informe #{id}.{" "}
            <Link href="/informes" className="font-medium text-amber-700 underline">Volver a los informes</Link>
          </div>
        </main>
      </>
    );
  }

  const carga = i.prueba_con_carga === true ? "Aprobada" : i.prueba_con_carga === false ? "No aprobada" : "No aplica";

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="no-imprimir flex items-center justify-between">
          <Link href="/informes" className="text-sm text-gray-600 hover:underline">← Volver</Link>
          <BotonImprimir />
        </div>

        <div className="tarjeta">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Informe de evaluación #{i.id}</p>
              <h1 className="text-2xl font-bold">{i.cliente}</h1>
              <p className="text-sm text-gray-500">{i.ubicacion}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${colorEstado(i.estado_general)}`}>
              {i.estado_general}
            </span>
          </div>
          <dl className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
            <Dato label="Técnico" valor={i.tecnico_nombre} />
            <Dato label="Correo técnico" valor={<span className="break-all">{i.tecnico_correo}</span>} />
            <Dato label="Fecha evaluación" valor={i.fecha_evaluacion} />
            <Dato label="Subido el" valor={formatoFecha(i.creado_en)} />
            <Dato label="Tipo" valor={i.tipo_evaluacion} />
          </dl>
        </div>

        <div className="tarjeta">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Generador</h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Dato label="Marca" valor={i.marca} />
            <Dato label="Modelo" valor={i.modelo} />
            <Dato label="N° de serie" valor={i.numero_serie} />
            <Dato label="Potencia" valor={i.potencia_kva != null ? `${i.potencia_kva} kVA` : null} />
            <Dato label="Horómetro" valor={i.horometro != null ? `${i.horometro} h` : null} />
          </dl>
        </div>

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

        {urlsFotos.length > 0 && (
          <div className="tarjeta">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Fotos ({urlsFotos.length})</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {urlsFotos.map((u, n) => (
                <a key={n} href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Foto ${n + 1}`} className="aspect-square w-full rounded-md object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function DetalleInforme() {
  return (
    <Protegida>
      <Contenido />
    </Protegida>
  );
}
