"use client";

import { useEffect, useState } from "react";
import { FRASES, PLANTILLA, proximaMantencion, revisarInforme } from "@/lib/asistente/sugerencias";
import { leerConexion, type ConexionPersonal } from "@/lib/asistente/servicios";
import ConectarIA from "@/components/ConectarIA";

// Panel que ayuda a escribir la descripción: revisa qué falta, ofrece una plantilla,
// frases comunes y, si hay una IA conectada, redacta o mejora el texto.
export default function AsistenteRedaccion({
  usuarioId,
  valores,
  onDescripcion,
}: {
  usuarioId: string;
  valores: Record<string, string>;
  onDescripcion: (texto: string, modo: "agregar" | "reemplazar") => void;
}) {
  const { faltantes, consejos } = revisarInforme(valores);
  const [grupo, setGrupo] = useState(FRASES[0].grupo);
  const [iaEmpresa, setIaEmpresa] = useState(false);
  const [personal, setPersonal] = useState<ConexionPersonal | null>(null);
  const [conectando, setConectando] = useState(false);
  const ia = iaEmpresa || Boolean(personal);
  const [propuesta, setPropuesta] = useState<string | null>(null);
  const [redactando, setRedactando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const proxima = proximaMantencion(valores.horometro);

  useEffect(() => {
    fetch("/api/asistente")
      .then((r) => (r.ok ? r.json() : { ia: false }))
      .then((d: { ia?: boolean }) => setIaEmpresa(Boolean(d.ia)))
      .catch(() => setIaEmpresa(false));
    const leer = () => setPersonal(leerConexion(usuarioId));
    leer();
    window.addEventListener("asistente-ia", leer);
    return () => window.removeEventListener("asistente-ia", leer);
  }, [usuarioId]);

  async function redactarConIA() {
    setRedactando(true);
    setErrorIa(null);
    setPropuesta(null);
    const datos = Object.fromEntries(Object.entries(valores).filter(([, v]) => v.trim()));
    const pedido = valores.descripcion?.trim()
      ? "Mejora y ordena la descripción que escribí para este informe, en tono técnico y profesional. No inventes datos ni mediciones. Devuelve solo el texto final, con las secciones: Estado en que se encontró el equipo, Trabajos realizados, Hallazgos y Recomendaciones."
      : "Escribe un borrador de descripción para este informe con las secciones: Estado en que se encontró el equipo, Trabajos realizados, Hallazgos y Recomendaciones. Deja entre corchetes lo que yo deba completar, sin inventar datos. Devuelve solo el texto.";
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensajes: [{ de: "persona", texto: pedido }], formulario: datos, ia: personal ?? undefined }),
      });
      const d = (await r.json()) as { texto?: string; error?: string };
      if (r.ok && d.texto) setPropuesta(d.texto);
      else setErrorIa(d.error ?? "La IA no respondió.");
    } catch {
      setErrorIa("Sin conexión con la IA.");
    } finally {
      setRedactando(false);
    }
  }

  const frases = FRASES.find((f) => f.grupo === grupo)?.frases ?? [];

  return (
    <section className="tarjeta border-marca-300">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl" aria-hidden>🤖</span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Asistente de redacción</h2>
          <p className="text-xs text-gray-500">Te ayuda a escribir la descripción. Toca una frase para agregarla; después puedes corregirla.</p>
        </div>
      </div>

      {(faltantes.length > 0 || consejos.length > 0) && (
        <div className="mb-3 space-y-1.5 text-xs">
          {faltantes.length > 0 && (
            <p className="rounded border border-gray-200 bg-gray-50 p-2 text-gray-700">
              <strong>Te falta:</strong> {faltantes.join(", ")}.
            </p>
          )}
          {consejos.map((c) => (
            <p key={c} className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-800">⚠️ {c}</p>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="boton-sec text-xs" onClick={() => onDescripcion(PLANTILLA, "agregar")}>
          📋 Usar plantilla
        </button>
        {proxima !== null && (
          <button
            type="button"
            className="boton-sec text-xs"
            onClick={() =>
              onDescripcion(`Se recomienda programar la próxima mantención preventiva a las ${proxima.toLocaleString("es-CL")} horas de operación.`, "agregar")
            }
          >
            🕒 Próxima mantención: {proxima.toLocaleString("es-CL")} h
          </button>
        )}
        {ia ? (
          <button type="button" className="boton text-xs" onClick={redactarConIA} disabled={redactando}>
            {redactando ? "Redactando…" : valores.descripcion?.trim() ? "✨ Mejorar con IA" : "✨ Redactar con IA"}
          </button>
        ) : (
          <button type="button" className="boton-sec text-xs" onClick={() => setConectando((c) => !c)}>
            ✨ Conectar IA para redactar
          </button>
        )}
      </div>

      {conectando && !ia && (
        <div className="mb-3">
          <ConectarIA usuarioId={usuarioId} onListo={() => setConectando(false)} />
        </div>
      )}

      {errorIa && <p className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700">{errorIa}</p>}

      {propuesta && (
        <div className="mb-3 rounded border border-marca-300 bg-marca-50 p-3">
          <p className="mb-2 text-xs font-semibold text-marca-800">Propuesta de la IA (revísala antes de usarla):</p>
          <p className="whitespace-pre-wrap text-sm text-grafito">{propuesta}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="boton text-xs" onClick={() => { onDescripcion(propuesta, "reemplazar"); setPropuesta(null); }}>
              Usar como descripción
            </button>
            <button type="button" className="boton-sec text-xs" onClick={() => { onDescripcion(propuesta, "agregar"); setPropuesta(null); }}>
              Agregar al final
            </button>
            <button type="button" className="boton-sec text-xs" onClick={() => setPropuesta(null)}>Descartar</button>
          </div>
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-1 text-xs">
        {FRASES.map((f) => (
          <button
            key={f.grupo}
            type="button"
            onClick={() => setGrupo(f.grupo)}
            className={`rounded-full px-3 py-1 font-medium ${grupo === f.grupo ? "bg-grafito text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {f.grupo}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {frases.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onDescripcion(`- ${f}`, "agregar")}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-left text-xs text-gray-700 hover:border-marca-500 hover:text-marca-700"
          >
            + {f}
          </button>
        ))}
      </div>
    </section>
  );
}
