"use client";

import Encabezado from "@/components/Encabezado";
import { Protegida, useSesion } from "@/lib/sesion";
import FormularioInforme from "./FormularioInforme";

function Contenido() {
  const { perfil, usuario } = useSesion();
  if (!usuario) return null;

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Nuevo informe de evaluación</h1>
        <p className="mb-5 text-sm text-gray-500">
          Quedará registrado a nombre de <strong>{perfil?.nombre ?? usuario.email}</strong>.
        </p>
        <FormularioInforme usuarioId={usuario.uid} />
      </main>
    </>
  );
}

export default function NuevoInforme() {
  return (
    <Protegida>
      <Contenido />
    </Protegida>
  );
}
