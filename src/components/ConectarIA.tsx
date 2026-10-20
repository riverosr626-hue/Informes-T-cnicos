"use client";

import { useState } from "react";
import { borrarConexion, guardarConexion, leerConexion, SERVICIOS, servicioPorId } from "@/lib/asistente/servicios";

// Formulario para que cualquier usuario conecte su propia IA.
// La clave se guarda solo en este dispositivo; el servidor la usa para cada consulta sin guardarla.
export default function ConectarIA({ usuarioId, onListo }: { usuarioId: string; onListo: () => void }) {
  const actual = leerConexion(usuarioId);
  const [servicio, setServicio] = useState(actual?.servicio ?? SERVICIOS[0].id);
  const [clave, setClave] = useState("");
  const [modelo, setModelo] = useState(actual?.modelo ?? "");
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = servicioPorId(servicio) ?? SERVICIOS[0];

  async function probarYGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const limpia = clave.trim();
    if (limpia.length < 10) {
      setError("Pega la clave completa.");
      return;
    }
    setProbando(true);
    const conexion = { servicio, clave: limpia, modelo: modelo.trim() || undefined };
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mensajes: [{ de: "persona", texto: "Responde solo con la palabra: listo" }], ia: conexion }),
      });
      const d = (await r.json()) as { texto?: string; error?: string };
      if (!r.ok || !d.texto) {
        setError(d.error ?? "No se pudo conectar con la IA.");
        return;
      }
      guardarConexion(usuarioId, conexion);
      setClave("");
      onListo();
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setProbando(false);
    }
  }

  function desconectar() {
    borrarConexion(usuarioId);
    onListo();
  }

  return (
    <form onSubmit={probarYGuardar} className="space-y-3 rounded-lg border border-marca-300 bg-white p-3 text-sm">
      <div>
        <p className="font-semibold text-grafito">Conectar una IA</p>
        <p className="text-xs text-gray-500">
          Elige el servicio, pega tu clave y presiona &quot;Probar y guardar&quot;. La clave queda guardada <strong>solo en este dispositivo</strong>; nadie más puede verla.
          El uso se cobra a la cuenta dueña de la clave.
        </p>
      </div>

      {actual && (
        <p className="rounded bg-emerald-50 p-2 text-xs text-emerald-800">
          Conectado a <strong>{servicioPorId(actual.servicio)?.nombre}</strong> en este dispositivo.
        </p>
      )}

      <div>
        <label className="etiqueta">Servicio</label>
        <select className="campo" value={servicio} onChange={(e) => setServicio(e.target.value)}>
          {SERVICIOS.map((x) => (
            <option key={x.id} value={x.id}>{x.nombre}</option>
          ))}
        </select>
        <a href={s.dondeClave} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-marca-700 underline">
          Conseguir una clave de {s.nombre} →
        </a>
      </div>

      <div>
        <label className="etiqueta">Clave de API</label>
        <input
          className="campo font-mono"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder={actual ? "Pega una clave nueva para cambiarla" : "Pega aquí tu clave"}
          autoComplete="off"
        />
      </div>

      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer">Opciones avanzadas</summary>
        <label className="etiqueta mt-2">Modelo (opcional)</label>
        <input className="campo font-mono" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={s.modelo} />
      </details>

      {error && <p className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button className="boton" disabled={probando}>{probando ? "Probando…" : "Probar y guardar"}</button>
        {actual && (
          <button type="button" className="boton-sec" onClick={desconectar}>Desconectar</button>
        )}
        <button type="button" className="boton-sec" onClick={onListo}>Cerrar</button>
      </div>
    </form>
  );
}
