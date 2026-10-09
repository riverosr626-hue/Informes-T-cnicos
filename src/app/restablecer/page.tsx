"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Página a la que llega el técnico desde el correo de recuperación
export default function RestablecerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (clave.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (clave !== clave2) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);

    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "La nueva contraseña debe ser distinta a la anterior."
          : "No se pudo cambiar la contraseña. Pide un nuevo correo de recuperación e inténtalo otra vez."
      );
      return;
    }
    setListo(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-le-energy-color.png" alt="LE Energy" className="mx-auto mb-3 h-20 w-auto" />
          <h1 className="text-xl font-bold">Nueva contraseña</h1>
          <p className="text-sm text-gray-500">Escribe la contraseña que quieres usar desde ahora.</p>
        </div>

        <div className="tarjeta">
          {listo ? (
            <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">
              Contraseña actualizada. Entrando a la app…
            </p>
          ) : (
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="etiqueta">Nueva contraseña</label>
                <input className="campo" type="password" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              <div>
                <label className="etiqueta">Repetir contraseña</label>
                <input className="campo" type="password" value={clave2} onChange={(e) => setClave2(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              <button className="boton w-full" disabled={cargando}>
                {cargando ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
