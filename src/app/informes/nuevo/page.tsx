import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import FormularioInforme from "./FormularioInforme";

export default async function NuevoInforme() {
  const { perfil, user } = await obtenerSesion();

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Nuevo informe de evaluación</h1>
        <p className="mb-5 text-sm text-gray-500">
          Quedará registrado a nombre de <strong>{perfil?.nombre ?? user.email}</strong>.
        </p>
        <FormularioInforme usuarioId={user.id} />
      </main>
    </>
  );
}
