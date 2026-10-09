"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSesion } from "@/lib/sesion";

export default function Encabezado() {
  const { perfil } = useSesion();
  const router = useRouter();

  async function cerrarSesion() {
    await signOut(auth());
    router.replace("/login");
  }

  return (
    <header className="no-imprimir border-b border-gray-200 bg-gray-900 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/informes" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm">⚡</span>
            <span className="hidden sm:inline">Informes de Generadores</span>
          </Link>
          <nav className="flex gap-4 text-sm text-gray-300">
            <Link href="/informes" className="hover:text-white">Informes</Link>
            {perfil?.rol === "admin" && <Link href="/tecnicos" className="hover:text-white">Técnicos</Link>}
            <Link href="/cuenta" className="hover:text-white">Mi cuenta</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {perfil && (
            <span className="hidden text-gray-300 sm:inline">
              {perfil.nombre}
              {perfil.rol === "admin" && (
                <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-gray-900">Admin</span>
              )}
            </span>
          )}
          <button onClick={cerrarSesion} className="rounded border border-gray-600 px-2.5 py-1 text-gray-200 hover:bg-gray-800">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
