import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

async function cerrarSesion() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function Encabezado({ perfil }: { perfil: Perfil | null }) {
  return (
    <header className="no-imprimir border-b border-gray-200 bg-gray-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/informes" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm">⚡</span>
          <span className="hidden sm:inline">Informes de Generadores</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {perfil && (
            <span className="text-gray-300">
              {perfil.nombre}
              {perfil.rol === "admin" && (
                <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-gray-900">Admin</span>
              )}
            </span>
          )}
          <form action={cerrarSesion}>
            <button className="rounded border border-gray-600 px-2.5 py-1 text-gray-200 hover:bg-gray-800">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
