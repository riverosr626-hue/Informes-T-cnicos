"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
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

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
      if (error) {
        setError(
          error.message.includes("Email not confirmed")
            ? "Tu cuenta aún no está confirmada. Revisa tu correo o pide al administrador que la confirme."
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cuenta`,
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
        // Cuenta lista: lo primero es generar su código de recuperación
        router.push("/cuenta?nuevo=1");
        router.refresh();
      } else {
        setAviso("Cuenta creada. Confirma tu correo para entrar (o pide al administrador que confirme tu cuenta).");
        setModo("entrar");
      }
    }
    setCargando(false);
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url('/fondo-inicio.jpg')" }}
    >
      {/* Capa oscura para que el formulario se lea bien sobre la foto */}
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center text-white drop-shadow">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-2xl">⚡</div>
          <h1 className="text-xl font-bold">Informes de Generadores</h1>
          <p className="text-sm text-gray-200">Evaluaciones técnicas de grupos electrógenos</p>
        </div>

        <div className="tarjeta shadow-xl">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-gray-100 p-1 text-sm">
            {(["entrar", "registro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setError(null); setAviso(null); }}
                className={`rounded py-1.5 font-medium ${modo === m ? "bg-white shadow-sm" : "text-gray-500"}`}
              >
                {m === "entrar" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

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

            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            {aviso && <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{aviso}</p>}

            <button className="boton w-full" disabled={cargando}>
              {cargando ? "Procesando…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          {modo === "entrar" && (
            <div className="mt-4 text-center text-sm">
              <Link href="/recuperar" className="text-amber-700 hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
