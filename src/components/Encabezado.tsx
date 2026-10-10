import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { esAdmin, NOMBRE_ROL, type Perfil } from "@/lib/tipos";
import MenuUsuario from "./MenuUsuario";

export default async function Encabezado({ perfil }: { perfil: Perfil | null }) {
  // Aviso para administradores: técnicos que pidieron recuperar su contraseña
  let pendientes = 0;
  if (esAdmin(perfil?.rol)) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("admin_listar_pedidos_clave");
    pendientes = Array.isArray(data) ? data.length : 0;
  }

  const esAdm = esAdmin(perfil?.rol);
  const enlaces = [
    { href: "/", texto: "Inicio" },
    { href: "/informes", texto: "Informes" },
    { href: "/informes/nuevo", texto: "Nuevo informe" },
    // Configuración y Mi cuenta están en el menú del círculo de usuario
  ];

  return (
    <>
      <header className="no-imprimir border-b border-black/10 bg-grafito text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" title="Ir al inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-le-energy.png" alt="LE Energy" className="h-9 w-auto" />
            <span className="hidden leading-tight sm:block">
              Informes de
              <br />
              Generadores
            </span>
          </Link>

          {perfil && (
            <MenuUsuario
              nombre={perfil.nombre}
              correo={perfil.correo}
              rol={NOMBRE_ROL[perfil.rol]}
              esAdmin={esAdm}
              pendientes={pendientes}
            />
          )}
        </div>

        <nav className="border-t border-white/10">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 text-sm">
            {enlaces.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t px-3 py-2 text-gray-300 hover:bg-white/10 hover:text-white"
              >
                {e.texto}
                {e.href === "/configuracion" && pendientes > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-xs font-bold leading-5 text-white">{pendientes}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {pendientes > 0 && (
        <div className="no-imprimir border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-red-800">
            <span>
              🔔 {pendientes === 1 ? "1 persona pidió" : `${pendientes} personas pidieron`} ayuda para recuperar su contraseña.
            </span>
            <Link href="/configuracion#solicitudes" className="font-semibold underline">Ver solicitudes</Link>
          </div>
        </div>
      )}
    </>
  );
}
