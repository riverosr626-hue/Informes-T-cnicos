"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Recuperar contraseña: con código personal (automático) o con enlace por correo
export default function RecuperarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [metodo, setMetodo] = useState<"codigo" | "correo">("codigo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function conCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (clave.length < 6) return setError("La contraseña nueva debe tener al menos 6 caracteres.");
    if (clave !== clave2) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const { data, error } = await supabase.rpc("recuperar_con_codigo", {
      p_correo: correo,
      p_codigo: codigo,
      p_clave: clave,
    });
    if (error) {
      setCargando(false);
      return setError("No se pudo cambiar la contraseña. Inténtalo de nuevo en un momento.");
    }
    if (data === "bloqueado") {
      setCargando(false);
      return setError("Demasiados intentos fallidos. Espera 30 minutos e inténtalo de nuevo.");
    }
    if (data !== "ok") {
      setCargando(false);
      return setError("El correo o el código de recuperación no son correctos.");
    }

    // Contraseña cambiada: entrar directo
    const { error: errEntrar } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    setCargando(false);
    if (errEntrar) {
      setAviso("Contraseña cambiada. Ya puedes iniciar sesión con tu nueva contraseña.");
      return;
    }
    router.push("/cuenta?nuevo=1");
    router.refresh();
  }

  async function conCorreo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
    });
    setCargando(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("rate")
          ? "Ya pediste un correo hace poco. Espera un minuto e inténtalo de nuevo."
          : "No se pudo enviar el correo. Usa tu código de recuperación o pide ayuda al administrador."
      );
    } else {
      setAviso("Si el correo tiene una cuenta, te llegará un enlace para crear una contraseña nueva. Revisa también Spam.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-2xl">🔑</div>
          <h1 className="text-xl font-bold">Recuperar contraseña</h1>
        </div>

        <div className="tarjeta">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-gray-100 p-1 text-sm">
            {(["codigo", "correo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMetodo(m); setError(null); setAviso(null); }}
                className={`rounded py-1.5 font-medium ${metodo === m ? "bg-white shadow-sm" : "text-gray-500"}`}
              >
                {m === "codigo" ? "Con mi código" : "Por correo"}
              </button>
            ))}
          </div>

          {metodo === "codigo" ? (
            <form onSubmit={conCodigo} className="space-y-4">
              <p className="text-sm text-gray-500">
                Usa el código de recuperación que guardaste (ej. <span className="font-mono">K7PM-3XQA-9RTD</span>).
              </p>
              <div>
                <label className="etiqueta">Correo</label>
                <input className="campo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label className="etiqueta">Código de recuperación</label>
                <input className="campo font-mono uppercase" value={codigo} onChange={(e) => setCodigo(e.target.value)} required placeholder="XXXX-XXXX-XXXX" autoComplete="off" />
              </div>
              <div>
                <label className="etiqueta">Contraseña nueva</label>
                <input className="campo" type="password" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              <div>
                <label className="etiqueta">Repetir contraseña nueva</label>
                <input className="campo" type="password" value={clave2} onChange={(e) => setClave2(e.target.value)} required minLength={6} autoComplete="new-password" />
              </div>
              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              {aviso && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{aviso}</p>}
              <button className="boton w-full" disabled={cargando}>{cargando ? "Procesando…" : "Cambiar contraseña"}</button>
            </form>
          ) : (
            <form onSubmit={conCorreo} className="space-y-4">
              <p className="text-sm text-gray-500">Te enviaremos un correo con un enlace para crear una contraseña nueva.</p>
              <div>
                <label className="etiqueta">Correo</label>
                <input className="campo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
              </div>
              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              {aviso && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{aviso}</p>}
              <button className="boton w-full" disabled={cargando}>{cargando ? "Enviando…" : "Enviar correo"}</button>
            </form>
          )}

          <p className="mt-4 border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
            ¿No tienes código ni te llega el correo? Pide al administrador que te asigne una contraseña nueva.
          </p>
          <div className="mt-2 text-center text-sm">
            <Link href="/login" className="text-gray-600 hover:underline">← Volver a iniciar sesión</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
