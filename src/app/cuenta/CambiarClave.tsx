"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cambiar la contraseña propia estando conectado
export default function CambiarClave() {
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (clave.length < 6) return setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
    if (clave !== clave2) return setMensaje({ tipo: "error", texto: "Las contraseñas no coinciden." });
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);
    if (error) {
      setMensaje({
        tipo: "error",
        texto: error.message.toLowerCase().includes("different")
          ? "La contraseña nueva debe ser distinta de la actual."
          : "No se pudo cambiar la contraseña. Cierra sesión, vuelve a entrar e inténtalo de nuevo.",
      });
      return;
    }
    setClave("");
    setClave2("");
    setAbierto(false);
    setMensaje({ tipo: "ok", texto: "Listo, tu contraseña fue cambiada." });
  }

  return (
    <div className="tarjeta space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Contraseña</h2>
          <p className="text-sm text-gray-500">Cámbiala cuando quieras.</p>
        </div>
        {!abierto && (
          <button type="button" className="boton-sec" onClick={() => { setAbierto(true); setMensaje(null); }}>
            Cambiar mi contraseña
          </button>
        )}
      </div>

      {abierto && (
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta">Contraseña nueva</label>
            <input className="campo" type="password" value={clave} onChange={(e) => setClave(e.target.value)} minLength={6} required autoComplete="new-password" />
          </div>
          <div>
            <label className="etiqueta">Repetir contraseña nueva</label>
            <input className="campo" type="password" value={clave2} onChange={(e) => setClave2(e.target.value)} minLength={6} required autoComplete="new-password" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className="boton" disabled={cargando}>{cargando ? "Guardando…" : "Guardar contraseña"}</button>
            <button type="button" className="boton-sec" onClick={() => setAbierto(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {mensaje && (
        <p className={`rounded p-2 text-sm ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
