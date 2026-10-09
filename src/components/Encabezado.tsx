import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { esAdmin, type Perfil } from "@/lib/tipos";

async function cerrarSesion() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function Encabezado({ perfil }: { perfil: Perfil | null }) {
  // Aviso para administradores: técnicos que pidieron recuperar su contraseña
  let pendientes = 0;
  if (esAdmin(perfil?.rol)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("admin_listar_pedidos_clave");
    pendientes = Array.isArray(data) ? data.length : 0;
  }

  return (
    <>
    <header className="no-imprimir border-b border-black/10 bg-grafito text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/informes" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-le-energy.png" alt="LE Energy" className="h-8 w-auto" />
            <span className="hidden sm:inline">Informes de Generadores</span>
          </Link>
          <nav className="flex gap-4 text-sm text-gray-300">
            <Link href="/informes" className="hover:text-white">Informes</Link>
            {esAdmin(perfil?.rol) && (
              <Link href="/tecnicos" className="flex items-center gap-1.5 hover:text-white">
                Técnicos
                {pendientes > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white">{pendientes}</span>
                )}
              </Link>
            )}
            <Link href="/cuenta" className="hover:text-white">Mi cuenta</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {perfil && (
            <span className="hidden text-gray-300 sm:inline">
              {perfil.nombre}
              {esAdmin(perfil.rol) && (
                <span className="ml-2 rounded bg-marca-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {perfil.rol === "propietario" ? "Propietario" : "Admin"}
                </span>
              )}
            </span>
          )}
          <form action={cerrarSesion}>
            <button className="rounded border border-gray-600 px-2.5 py-1 text-gray-200 hover:bg-white/10">Salir</button>
          </form>
        </div>
      </div>
    </header>
    {pendientes > 0 && (
      <div className="no-imprimir border-b border-red-200 bg-red-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-red-800">
          <span>
            🔔 {pendientes === 1 ? "1 persona pidió" : `${pendientes} personas pidieron`} ayuda para recuperar su contraseña.
          </span>
          <Link href="/tecnicos#solicitudes" className="font-semibold underline">Ver solicitudes</Link>
        </div>
      </div>
    )}
    </>
  );
}
