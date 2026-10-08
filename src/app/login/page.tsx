"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"entrar" | "registro" | "recuperar">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Si un enlace de correo venció o ya se usó, el callback nos manda aquí con ?error=enlace
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "enlace") {
      setError("El enlace del correo venció o ya fue usado. Pide uno nuevo.");
    }
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setAviso(null);

    if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/auth/callback?next=/restablecer`,
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("rate")
            ? "Ya pediste un correo hace poco. Espera un minuto e inténtalo de nuevo."
            : "No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo."
        );
      } else {
        setAviso("Si el correo tiene una cuenta, te llegará un enlace para crear una contraseña nueva. Revisa también Spam.");
      }
    } else if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
      if (error) {
        setError(
          error.message.includes("Email not confirmed")
            ? "Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada."
            : "Correo o contraseña incorrectos."
        );
      } else {
        router.push("/informes");
        router.refresh();
      }
    } else {
      if (nombre.trim().length < 3) {
        setError("Ingresa tu nombre completo.");
        setCargando(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: clave,
        options: {
          data: { nombre: nombre.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(
          error.message.includes("already registered")
            ? "Ese correo ya tiene una cuenta."
            : error.message.includes("Password")
              ? "La contraseña debe tener al menos 6 caracteres."
              : error.message
        );
      } else if (data.session) {
        router.push("/informes");
        router.refresh();
      } else {
        setAviso("Cuenta creada. Te enviamos un correo para confirmar tu dirección; después podrás entrar.");
        setModo("entrar");
      }
    }
    setCargando(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-2xl">⚡</div>
          <h1 className="text-xl font-bold">Informes de Generadores</h1>
          <p className="text-sm text-gray-500">Evaluaciones técnicas de grupos electrógenos</p>
        </div>

        <div className="tarjeta">
          {modo === "recuperar" ? (
            <div className="mb-5">
              <h2 className="font-semibold">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500">Te enviaremos un correo con un enlace para crear una contraseña nueva.</p>
            </div>
          ) : (
          <div className="mb-5 grid grid-cols-2 rounded-md bg-gray-100 p-1 text-sm">
            {(["entrar", "registro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setError(null); }}
                className={`rounded py-1.5 font-medium ${modo === m ? "bg-white shadow-sm" : "text-gray-500"}`}
              >
                {m === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>
          )}

          <form onSubmit={enviar} className="space-y-4">
            {modo === "registro" && (
              <div>
                <label className="etiqueta">Nombre completo</label>
                <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="etiqueta">Correo</label>
              <input className="campo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
            </div>
            {modo !== "recuperar" && (
            <div>
              <label className="etiqueta">Contraseña</label>
              <input
                className="campo"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                minLength={6}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </div>
            )}

            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            {aviso && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{aviso}</p>}

            <button className="boton w-full" disabled={cargando}>
              {cargando
                ? "Procesando…"
                : modo === "entrar"
                  ? "Entrar"
                  : modo === "registro"
                    ? "Crear cuenta"
                    : "Enviar correo de recuperación"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            {modo === "entrar" && (
              <button type="button" onClick={() => { setModo("recuperar"); setError(null); setAviso(null); }} className="text-amber-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {modo === "recuperar" && (
              <button type="button" onClick={() => { setModo("entrar"); setError(null); setAviso(null); }} className="text-gray-600 hover:underline">
                ← Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
