import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import CodigoRecuperacion from "./CodigoRecuperacion";

export const dynamic = "force-dynamic";

export default async function MiCuenta() {
  const { supabase, perfil, user } = await obtenerSesion();
  const { data: tieneCodigo } = await supabase.rpc("tengo_codigo_recuperacion");

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Mi cuenta</h1>
        <div className="tarjeta">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Nombre</dt>
              <dd className="font-medium">{perfil?.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Correo</dt>
              <dd className="font-medium break-all">{user.email}</dd>
            </div>
          </dl>
        </div>
        <CodigoRecuperacion tieneCodigo={tieneCodigo === true} />
      </main>
    </>
  );
}
