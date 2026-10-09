"use client";

import { useEffect, useState } from "react";
import { llamarApi } from "@/lib/firebase";

export default function CodigoRecuperacion() {
  const [tieneCodigo, setTieneCodigo] = useState<boolean | null>(null);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    llamarApi<{ tiene: boolean }>("/api/recuperacion")
      .then((r) => setTieneCodigo(r.tiene))
      .catch(() => setTieneCodigo(false));
  }, []);

  async function generar() {
    if (tieneCodigo && !codigo && !confirm("Ya tienes un código. Si generas uno nuevo, el anterior dejará de servir. ¿Continuar?")) return;
    setCargando(true);
    setError(null);
    try {
      const r = await llamarApi<{ codigo: string }>("/api/recuperacion", {});
      setCodigo(r.codigo);
      setTieneCodigo(true);
      setCopiado(false);
    } catch {
      setError("No se pudo generar el código. Inténtalo de nuevo.");
    }
    setCargando(false);
  }

  async function copiar() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="tarjeta">
      <h2 className="mb-1 font-semibold">Código de recuperación</h2>
      <p className="mb-4 text-sm text-gray-500">
        Si olvidas tu contraseña, con este código puedes crear una nueva tú mismo, sin esperar a nadie.
        Sirve una sola vez: después de usarlo, genera uno nuevo.
      </p>

      {codigo ? (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-4 text-center">
            <p className="font-mono text-2xl font-bold tracking-widest">{codigo}</p>
          </div>
          <p className="rounded bg-red-50 p-2 text-sm text-red-700">
            <strong>Guárdalo ahora</strong> (sácale una foto o anótalo). Por seguridad no se volverá a mostrar.
          </p>
          <button type="button" className="boton-sec" onClick={copiar}>{copiado ? "✓ Copiado" : "Copiar código"}</button>
        </div>
      ) : tieneCodigo === null ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {tieneCodigo ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">✓ Ya tienes un código guardado</span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Aún no tienes código</span>
          )}
          <button type="button" className="boton" onClick={generar} disabled={cargando}>
            {cargando ? "Generando…" : tieneCodigo ? "Generar uno nuevo" : "Generar mi código"}
          </button>
        </div>
      )}
      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
