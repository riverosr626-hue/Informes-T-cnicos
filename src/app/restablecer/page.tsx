"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { crearClienteRecuperacion } from "@/lib/supabase/implicito";

// Página a la que se llega desde el correo de recuperación (sirve en cualquier navegador o celular)
export default function RestablecerPage() {
  const router = useRouter();
  const supabase = createClient();
  const recuperacion = useRef<SupabaseClient | null>(null);
  const [correoCuenta, setCorreoCuenta] = useState<string | null>(null);
  const [estado, setEstado] = useState<"revisando" | "listo" | "invalido">("revisando");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    (async () => {
      const hash = window.location.hash;
      if (hash.includes("error")) return setEstado("invalido");
      if (hash.includes("access_token")) {
        // Sesión que viene en el enlace del correo
        const cliente = crearClienteRecuperacion();
        const { data } = await cliente.auth.getSession();
        if (data.session?.user?.email) {
          recuperacion.current = cliente;
          setCorreoCuenta(data.session.user.email);
          window.history.replaceState(null, "", window.location.pathname);
          return setEstado("listo");
        }
        return setEstado("invalido");
      }
      // Ya tiene la sesión iniciada en este navegador
      const { data } = await supabase.auth.getUser();
      setEstado(data.user ? "listo" : "invalido");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (clave.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (clave !== clave2) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const cliente = recuperacion.current ?? supabase;
    const { error } = await cliente.auth.updateUser({ password: clave });
    if (!error && recuperacion.current && correoCuenta) {
      // Abrir la sesión normal de la app con la contraseña nueva
      await supabase.auth.signInWithPassword({ email: correoCuenta, password: clave });
    }
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
          {estado === "revisando" ? (
            <p className="text-center text-sm text-gray-500">Revisando el enlace…</p>
          ) : estado === "invalido" ? (
            <div className="space-y-3 text-center">
              <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                El enlace no es válido, venció o ya fue usado. Pide uno nuevo.
              </p>
              <Link href="/recuperar" className="boton inline-block">Pedir un enlace nuevo</Link>
            </div>
          ) : listo ? (
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
