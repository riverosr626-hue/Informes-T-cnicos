import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import ListaTecnicos, { type Tecnico } from "./ListaTecnicos";

export const dynamic = "force-dynamic";

export default async function PaginaTecnicos() {
  const { supabase, perfil } = await obtenerSesion();

  if (perfil?.rol !== "admin") {
    return (
      <>
        <Encabezado perfil={perfil} />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="tarjeta text-center text-gray-600">
            Esta sección es solo para el administrador.{" "}
            <Link href="/informes" className="font-medium text-amber-700 underline">Volver a mis informes</Link>
          </div>
        </main>
      </>
    );
  }

  const { data, error } = await supabase.rpc("admin_listar_tecnicos");

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Técnicos</h1>
        <p className="mb-5 text-sm text-gray-500">
          Cuentas registradas. Desde aquí puedes asignar una contraseña nueva a quien la olvidó o confirmar cuentas.
        </p>
        {error && <p className="tarjeta text-red-700">Error al cargar técnicos: {error.message}</p>}
        {data && <ListaTecnicos tecnicos={data as Tecnico[]} miId={perfil.id} />}
      </main>
    </>
  );
}
