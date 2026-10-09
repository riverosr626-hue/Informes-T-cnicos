"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Perfil } from "@/lib/tipos";

type Sesion = {
  cargando: boolean;
  usuario: User | null;
  perfil: Perfil | null;
  recargarPerfil: () => Promise<void>;
};

const Contexto = createContext<Sesion>({
  cargando: true,
  usuario: null,
  perfil: null,
  recargarPerfil: async () => {},
});

async function leerPerfil(u: User): Promise<Perfil | null> {
  const ref = doc(db(), "perfiles", u.uid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    // Cuenta sin perfil (por ejemplo, si falló al registrarse): se crea como técnico
    await setDoc(ref, {
      nombre: u.displayName || (u.email ?? "").split("@")[0],
      correo: u.email ?? "",
      rol: "tecnico",
      creado_en: new Date().toISOString(),
    });
    snap = await getDoc(ref);
  }
  const datos = snap.data() as Omit<Perfil, "id">;
  return { id: u.uid, nombre: datos.nombre, correo: datos.correo, rol: datos.rol };
}

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth(), async (u) => {
      setUsuario(u);
      if (!u) {
        setPerfil(null);
        setCargando(false);
        return;
      }
      try {
        setPerfil(await leerPerfil(u));
      } catch (e) {
        console.error("No se pudo leer el perfil", e);
        setPerfil(null);
      }
      setCargando(false);
    });
  }, []);

  const recargarPerfil = useCallback(async () => {
    const u = auth().currentUser;
    if (u) setPerfil(await leerPerfil(u));
  }, []);

  return (
    <Contexto.Provider value={{ cargando, usuario, perfil, recargarPerfil }}>{children}</Contexto.Provider>
  );
}

export const useSesion = () => useContext(Contexto);

function PantallaCargando() {
  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-gray-500">Cargando…</main>
  );
}

// Pide confirmar el correo antes de usar la app
function ConfirmarCorreo({ usuario }: { usuario: User }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function yaConfirme() {
    setCargando(true);
    await usuario.reload();
    await usuario.getIdToken(true);
    setCargando(false);
    if (auth().currentUser?.emailVerified) {
      window.location.reload();
    } else {
      setMensaje("Todavía no aparece confirmada. Abre el enlace del correo (revisa también Spam) o pide al administrador que la confirme.");
    }
  }

  async function reenviar() {
    setCargando(true);
    try {
      await sendEmailVerification(usuario);
      setMensaje(`Te enviamos un correo nuevo a ${usuario.email}.`);
    } catch {
      setMensaje("Ya enviamos un correo hace poco. Espera unos minutos antes de pedir otro.");
    }
    setCargando(false);
  }

  async function salir() {
    await signOut(auth());
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="tarjeta w-full max-w-sm space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-marca-500 text-2xl">✉️</div>
        <h1 className="text-xl font-bold">Confirma tu correo</h1>
        <p className="text-sm text-gray-600">
          Te enviamos un enlace a <strong className="break-all">{usuario.email}</strong>. Ábrelo para activar tu cuenta,
          o pide al administrador que la confirme.
        </p>
        {mensaje && <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">{mensaje}</p>}
        <div className="flex flex-col gap-2">
          <button className="boton" onClick={yaConfirme} disabled={cargando}>Ya la confirmé</button>
          <button className="boton-sec" onClick={reenviar} disabled={cargando}>Reenviar correo</button>
          <button className="text-sm text-gray-500 hover:underline" onClick={salir}>Salir</button>
        </div>
      </div>
    </main>
  );
}

// Envuelve las páginas que exigen sesión
export function Protegida({ children }: { children: React.ReactNode }) {
  const { cargando, usuario, perfil } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.replace("/login");
  }, [cargando, usuario, router]);

  if (cargando || !usuario) return <PantallaCargando />;
  if (!usuario.emailVerified && perfil?.rol !== "admin") return <ConfirmarCorreo usuario={usuario} />;
  return <>{children}</>;
}
