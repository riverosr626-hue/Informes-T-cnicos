"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AsistenteRedaccion from "./AsistenteRedaccion";

function Campo({ label, children, ayuda }: { label: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <div>
      <label className="etiqueta">{label}</label>
      {children}
      {ayuda && <p className="mt-1 text-xs text-gray-500">{ayuda}</p>}
    </div>
  );
}

// Límite por archivo del plan gratuito de Supabase
const MAX_MB = 50;

export default function FormularioInforme({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});

  // Lee el formulario para que el asistente revise los datos en vivo
  function leerFormulario() {
    if (!formRef.current) return;
    const v: Record<string, string> = {};
    new FormData(formRef.current).forEach((valor, clave) => {
      if (clave !== "archivos" && typeof valor === "string") v[clave] = valor;
    });
    setValores(v);
  }

  function cambiarDescripcion(texto: string, modo: "agregar" | "reemplazar") {
    const area = formRef.current?.elements.namedItem("descripcion") as HTMLTextAreaElement | null;
    if (!area) return;
    const actual = area.value.trim();
    area.value = modo === "reemplazar" || !actual ? texto : `${actual}\n${texto}`;
    area.focus();
    leerFormulario();
  }

  function elegirArchivos(lista: FileList | null) {
    const nuevos = Array.from(lista ?? []);
    const grandes = nuevos.filter((f) => f.size > MAX_MB * 1024 * 1024);
    setError(grandes.length ? `Estos archivos pesan más de ${MAX_MB} MB y no se pueden subir: ${grandes.map((f) => f.name).join(", ")}` : null);
    setArchivos(nuevos.filter((f) => f.size <= MAX_MB * 1024 * 1024));
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = String(fd.get(k) ?? "").trim();
      return v === "" ? null : v;
    };
    const horas = texto("horometro");
    const horometro = horas === null ? null : Number(horas.replace(",", "."));
    if (horometro !== null && !Number.isFinite(horometro)) {
      setError("El horómetro debe ser un número (ej. 1250 o 1250,5).");
      return;
    }

    // 1) Subir fotos y videos a la carpeta del técnico
    const rutas: string[] = [];
    for (const [n, archivo] of archivos.entries()) {
      setEnviando(`Subiendo archivo ${n + 1} de ${archivos.length}…`);
      const ext = archivo.name.split(".").pop()?.toLowerCase() || (archivo.type.startsWith("video/") ? "mp4" : "jpg");
      const ruta = `${usuarioId}/${crypto.randomUUID()}.${ext}`;
      const { error: errArchivo } = await supabase.storage.from("fotos").upload(ruta, archivo, { contentType: archivo.type });
      if (errArchivo) {
        setError(`No se pudo subir "${archivo.name}": ${errArchivo.message}`);
        setEnviando(null);
        return;
      }
      rutas.push(ruta);
    }

    // 2) Guardar el informe (tecnico_id lo pone la base de datos = usuario conectado)
    setEnviando("Guardando informe…");
    const { data, error: errInforme } = await supabase
      .from("informes")
      .insert({
        cliente: texto("cliente"),
        ubicacion: texto("ubicacion"),
        nombre_equipo: texto("nombre_equipo"),
        marca: texto("marca"),
        modelo: texto("modelo"),
        numero_serie: texto("numero_serie"),
        horometro,
        descripcion: texto("descripcion"),
        fotos: rutas,
      })
      .select("id")
      .single();

    if (errInforme) {
      setError(`No se pudo guardar el informe: ${errInforme.message}`);
      setEnviando(null);
      return;
    }

    router.push(`/informes/${data.id}`);
    router.refresh();
  }

  const fotos = archivos.filter((f) => !f.type.startsWith("video/")).length;
  const videos = archivos.length - fotos;

  return (
    <form id="formulario-informe" ref={formRef} onSubmit={enviar} onInput={leerFormulario} onChange={leerFormulario} className="space-y-4">
      <section className="tarjeta">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800">Cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre del cliente *">
            <input name="cliente" required className="campo" />
          </Campo>
          <Campo label="Ubicación del cliente">
            <input name="ubicacion" className="campo" placeholder="Dirección, faena o sucursal" />
          </Campo>
        </div>
      </section>

      <section className="tarjeta">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800">Equipo</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Nombre del equipo">
            <input name="nombre_equipo" className="campo" placeholder="Ej. Generador principal" />
          </Campo>
          <Campo label="Marca del equipo">
            <input name="marca" className="campo" placeholder="Ej. Cummins" />
          </Campo>
          <Campo label="Modelo del equipo">
            <input name="modelo" className="campo" placeholder="Ej. C150D5" />
          </Campo>
          <Campo label="N° de serie del equipo">
            <input name="numero_serie" className="campo" />
          </Campo>
          <Campo label="Horómetro del equipo (h)">
            <input name="horometro" inputMode="decimal" className="campo" />
          </Campo>
        </div>
      </section>

      <AsistenteRedaccion valores={valores} onDescripcion={cambiarDescripcion} />

      <section className="tarjeta space-y-4">
        <Campo label="Descripción">
          <textarea
            name="descripcion"
            rows={8}
            className="campo"
            placeholder="Qué se encontró, qué trabajos se hicieron y qué se recomienda."
          />
        </Campo>
        <Campo label="Fotos o videos" ayuda={`Puedes elegir varias fotos y videos (máximo ${MAX_MB} MB por archivo).`}>
          <input
            type="file"
            name="archivos"
            accept="image/*,video/*"
            multiple
            onChange={(e) => elegirArchivos(e.target.files)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-white"
          />
          {archivos.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {fotos > 0 && `${fotos} foto${fotos === 1 ? "" : "s"}`}
              {fotos > 0 && videos > 0 && " y "}
              {videos > 0 && `${videos} video${videos === 1 ? "" : "s"}`} seleccionado{archivos.length === 1 ? "" : "s"}
            </p>
          )}
        </Campo>
      </section>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="boton-sec">Cancelar</button>
        <button className="boton" disabled={enviando !== null}>
          {enviando ?? "Enviar informe"}
        </button>
      </div>
    </form>
  );
}
