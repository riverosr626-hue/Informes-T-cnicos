"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useSesion } from "@/lib/sesion";
import { guardarPreferenciaRecordar, leerPreferenciaRecordar } from "@/lib/recordar";

function mensajeError(codigo: string) {
  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese correo ya tiene una cuenta.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión a internet.";
    default:
      return "No se pudo completar. Inténtalo de nuevo.";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { cargando: cargandoSesion, usuario, recargarPerfil } = useSesion();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  // Si ya hay sesión, directo a los informes
  useEffect(() => {
    if (!cargandoSesion && usuario && !registrando) router.replace("/informes");
  }, [cargandoSesion, usuario, registrando, router]);

  // Recupera la preferencia de este dispositivo (por defecto: recordar)
  useEffect(() => {
    setRecordar(leerPreferenciaRecordar());
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    // Marcado: la sesión queda guardada en este dispositivo.
    // Desmarcado: se cierra al cerrar el navegador.
    guardarPreferenciaRecordar(recordar);

    try {
      await setPersistence(auth(), recordar ? browserLocalPersistence : browserSessionPersistence);
      if (modo === "entrar") {
        await signInWithEmailAndPassword(auth(), correo.trim(), clave);
        router.replace("/informes");
      } else {
        const nombreLimpio = nombre.trim();
        if (nombreLimpio.length < 3) {
          setError("Ingresa tu nombre completo.");
          setCargando(false);
          return;
        }
        setRegistrando(true);
        const cred = await createUserWithEmailAndPassword(auth(), correo.trim(), clave);
        await updateProfile(cred.user, { displayName: nombreLimpio });
        await setDoc(doc(db(), "perfiles", cred.user.uid), {
          nombre: nombreLimpio,
          correo: cred.user.email ?? correo.trim(),
          rol: "tecnico",
          creado_en: new Date().toISOString(),
        });
        await sendEmailVerification(cred.user).catch(() => {});
        await recargarPerfil();
        router.replace("/cuenta?nuevo=1");
      }
    } catch (err) {
      setRegistrando(false);
      setError(mensajeError((err as { code?: string }).code ?? ""));
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-le-energy.png" alt="LE Energy" className="mx-auto mb-3 h-20 w-auto" />
          <h1 className="text-xl font-bold">Informes de Generadores</h1>
          <p className="text-sm text-gray-200">Evaluaciones técnicas de grupos electrógenos</p>
        </div>

        <div className="tarjeta !border-gray-200 !bg-fondo text-grafito shadow-xl">
          <div className="mb-5 grid grid-cols-2 rounded-md bg-gray-200 p-1 text-sm">
            {(["entrar", "registro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setError(null); }}
                className={`rounded py-1.5 font-medium ${modo === m ? "bg-marca-500 text-white shadow-sm" : "text-gray-500 hover:text-grafito"}`}
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

            <label className="flex cursor-pointer items-center gap-2 text-sm text-grafito">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-marca-500"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
              />
              Mantener sesión iniciada en este dispositivo
            </label>

            {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

            <button className="boton w-full" disabled={cargando}>
              {cargando ? "Procesando…" : modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          {modo === "entrar" && (
            <div className="mt-4 text-center text-sm">
              <Link href="/recuperar" className="font-medium text-marca-700 hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
