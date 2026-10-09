"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { llamarApi } from "@/lib/firebase";
import { Protegida, useSesion } from "@/lib/sesion";
import ListaTecnicos, { type Tecnico } from "./ListaTecnicos";

function Contenido() {
  const { perfil } = useSesion();
  const esAdmin = perfil?.rol === "admin";
  const [tecnicos, setTecnicos] = useState<Tecnico[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    llamarApi<{ tecnicos: Tecnico[] }>("/api/admin/tecnicos")
      .then((r) => {
        setTecnicos(r.tecnicos);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (esAdmin) cargar();
  }, [esAdmin, cargar]);

  if (!esAdmin) {
    return (
      <>
        <Encabezado />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="tarjeta text-center text-gray-600">
            Esta sección es solo para el administrador.{" "}
            <Link href="/informes" className="font-medium text-marca-700 underline">Volver a mis informes</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Técnicos</h1>
        <p className="mb-5 text-sm text-gray-500">
          Cuentas registradas. Desde aquí puedes asignar una contraseña nueva a quien la olvidó o confirmar cuentas.
        </p>
        {error && <p className="tarjeta text-red-700">Error al cargar técnicos: {error}</p>}
        {!error && !tecnicos && <p className="tarjeta text-center text-gray-500">Cargando…</p>}
        {tecnicos && perfil && <ListaTecnicos tecnicos={tecnicos} miId={perfil.id} alCambiar={cargar} />}
      </main>
    </>
  );
}

export default function PaginaTecnicos() {
  return (
    <Protegida>
      <Contenido />
    </Protegida>
  );
}
