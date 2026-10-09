"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { crearClienteRecuperacion } from "@/lib/supabase/implicito";

// Recuperar contraseña: con un código (personal o entregado por un administrador)
// o con un enlace al correo de la cuenta (y aviso a los administradores en la app).
export default function RecuperarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [metodo, setMetodo] = useState<"codigo" | "ayuda">("codigo");
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
    if (data === "vencido") {
      setCargando(false);
      return setError("Ese código ya venció (duran 24 horas). Pide uno nuevo al administrador.");
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

  async function pedirAyuda(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    // 1) Enlace de recuperación al correo de la propia cuenta (sirve para todos, también propietarios)
    // 2) Aviso a los administradores dentro de la app, por si el correo no llega
    const [{ error: errCorreo }, { error }] = await Promise.all([
      crearClienteRecuperacion().auth.resetPasswordForEmail(correo.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
      }),
      supabase.rpc("solicitar_recuperacion", { p_correo: correo }),
    ]);
    setCargando(false);
    if (error && errCorreo) {
      setError("No se pudo enviar la solicitud. Inténtalo de nuevo en un momento.");
      return;
    }
    setAviso(
      errCorreo
        ? "Avisamos a los administradores. Cuando te entreguen tu código, vuelve aquí, elige \"Tengo un código\" y crea tu contraseña nueva."
        : "Listo. Si el correo tiene cuenta, te enviamos un enlace para crear tu contraseña nueva (revisa también Spam). Además avisamos a los administradores."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-le-energy-color.png" alt="LE Energy" className="mx-auto mb-3 h-20 w-auto" />
          <h1 className="text-xl font-bold">Recuperar contraseña</h1>
        </div>

        <div className="tarjeta">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-gray-100 p-1 text-sm">
            {(["codigo", "ayuda"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMetodo(m); setError(null); setAviso(null); }}
                className={`rounded py-1.5 font-medium ${metodo === m ? "bg-marca-500 text-white shadow-sm" : "text-gray-500 hover:text-grafito"}`}
              >
                {m === "codigo" ? "Tengo un código" : "No tengo código"}
              </button>
            ))}
          </div>

          {metodo === "codigo" ? (
            <form onSubmit={conCodigo} className="space-y-4">
              <p className="text-sm text-gray-500">
                Usa tu código personal o el que te entregó un administrador
                (ej. <span className="font-mono">K7PM-3XQA-9RTD</span>).
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
            <form onSubmit={pedirAyuda} className="space-y-4">
              <p className="text-sm text-gray-500">
                Escribe tu correo y te enviaremos un enlace para crear tu contraseña nueva. También avisamos a
                los administradores, que pueden darte un código si el correo no llega.
              </p>
              <div>
                <label className="etiqueta">Correo de tu cuenta</label>
                <input className="campo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
              </div>
              {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
              {aviso && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{aviso}</p>}
              <button className="boton w-full" disabled={cargando}>{cargando ? "Enviando…" : "Enviar enlace de recuperación"}</button>
            </form>
          )}

          <p className="mt-4 border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
            El código de un administrador vale 24 horas y sirve una sola vez.
          </p>
          <div className="mt-2 text-center text-sm">
            <Link href="/login" className="text-gray-600 hover:underline">← Volver a iniciar sesión</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
