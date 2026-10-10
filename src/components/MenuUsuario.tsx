"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cerrarSesion } from "@/lib/acciones";

// Círculo con la inicial del usuario; al tocarlo abre un mini menú
export default function MenuUsuario({
  nombre,
  correo,
  rol,
  esAdmin,
  pendientes,
}: {
  nombre: string;
  correo: string;
  rol: string;
  esAdmin: boolean;
  pendientes: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const inicial = (nombre.trim() || correo).charAt(0).toUpperCase();

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const opcion = "flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-marca-50 hover:text-marca-800";

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-white/10"
        title="Menú de usuario"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-marca-500 text-base font-bold text-white ring-2 ring-white/20">
          {inicial}
          {esAdmin && pendientes > 0 && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-grafito bg-red-500" />
          )}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm text-white">{nombre || correo}</span>
          <span className="block text-xs text-marca-300">{rol}</span>
        </span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 text-gray-300 transition ${abierto ? "rotate-180" : ""}`} aria-hidden>
          <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-grafito shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="truncate text-sm font-semibold">{nombre || correo}</div>
            <div className="truncate text-xs text-gray-500">{correo}</div>
            <div className="mt-1 text-xs font-medium text-marca-700">{rol}</div>
          </div>
          <Link href="/cuenta" role="menuitem" className={opcion} onClick={() => setAbierto(false)}>
            Mi cuenta
          </Link>
          {esAdmin && (
            <Link href="/configuracion" role="menuitem" className={opcion} onClick={() => setAbierto(false)}>
              Configuración
              {pendientes > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white">{pendientes}</span>
              )}
            </Link>
          )}
          <form action={cerrarSesion} className="border-t border-gray-100">
            <button role="menuitem" className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50">
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
