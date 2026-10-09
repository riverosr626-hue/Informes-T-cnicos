import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import { esAdmin, esPropietario } from "@/lib/tipos";
import ListaCuentas, { type Tecnico } from "./ListaCuentas";
import SolicitudesRecuperacion, { type Solicitud } from "./SolicitudesRecuperacion";
import InvitarTecnicos from "./InvitarTecnicos";
import EspacioSupabase, { type UsoEspacio } from "./EspacioSupabase";

export const dynamic = "force-dynamic";

function Seccion({ id, titulo, descripcion, children }: { id: string; titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {descripcion && <p className="text-sm text-gray-500">{descripcion}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function Configuracion() {
  const { supabase, perfil } = await obtenerSesion();

  if (!esAdmin(perfil?.rol) || !perfil) {
    return (
      <>
        <Encabezado perfil={perfil} />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="tarjeta text-center text-gray-600">
            Esta sección es solo para administradores y propietarios.{" "}
            <Link href="/" className="font-medium text-marca-700 underline">Volver al inicio</Link>
          </div>
        </main>
      </>
    );
  }

  const propietario = esPropietario(perfil.rol);
  const [{ data: cuentas, error }, { data: solicitudes }, { data: espacio }] = await Promise.all([
    supabase.rpc("admin_listar_cuentas"),
    supabase.rpc("admin_listar_pedidos_clave"),
    propietario ? supabase.rpc("propietario_uso_espacio") : Promise.resolve({ data: null }),
  ]);
  const listaSolicitudes = (solicitudes as Solicitud[] | null) ?? [];
  const uso = Array.isArray(espacio) && espacio.length ? (espacio[0] as UsoEspacio) : null;

  const indice = [
    { id: "solicitudes", texto: `Pedidos de contraseña${listaSolicitudes.length ? ` (${listaSolicitudes.length})` : ""}` },
    { id: "cuentas", texto: "Cuentas y permisos" },
    { id: "invitar", texto: "Invitar técnicos" },
    { id: "niveles", texto: "Qué puede hacer cada nivel" },
    ...(propietario ? [{ id: "espacio", texto: "Espacio de almacenamiento" }] : []),
  ];

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Configuración</h1>
          <p className="text-sm text-gray-500">
            {propietario
              ? "Como propietario puedes gestionar todas las cuentas: contraseñas, niveles y accesos."
              : "Como administrador puedes ver todas las cuentas y ayudar a los técnicos con su contraseña."}
          </p>
          <nav className="mt-3 flex flex-wrap gap-2 text-sm">
            {indice.map((i) => (
              <a key={i.id} href={`#${i.id}`} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-gray-700 hover:border-marca-500 hover:text-marca-700">
                {i.texto}
              </a>
            ))}
          </nav>
        </div>

        <Seccion
          id="solicitudes"
          titulo="Pedidos de contraseña"
          descripcion="Técnicos que olvidaron su contraseña y pidieron ayuda desde la pantalla de ingreso."
        >
          {listaSolicitudes.length === 0 ? (
            <p className="tarjeta text-sm text-gray-500">No hay pedidos pendientes. ✅</p>
          ) : (
            <SolicitudesRecuperacion solicitudes={listaSolicitudes} miRol={perfil.rol} />
          )}
        </Seccion>

        <Seccion
          id="cuentas"
          titulo="Cuentas y permisos"
          descripcion={
            propietario
              ? "Cambia el nivel con la lista desplegable. \"Quitar acceso\" impide entrar sin borrar sus informes."
              : "Puedes confirmar cuentas y cambiar la contraseña de los técnicos."
          }
        >
          {error && <p className="tarjeta text-red-700">Error al cargar las cuentas: {error.message}</p>}
          {cuentas && <ListaCuentas tecnicos={cuentas as Tecnico[]} miId={perfil.id} miRol={perfil.rol} />}
        </Seccion>

        <Seccion id="invitar" titulo="Invitar técnicos">
          <InvitarTecnicos />
        </Seccion>

        <Seccion id="niveles" titulo="Qué puede hacer cada nivel">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                t: "Técnico",
                p: ["Crea informes", "Ve solo sus informes", "Recupera su contraseña con un código"],
              },
              {
                t: "Administrador",
                p: ["Ve todos los informes y cuentas", "Confirma cuentas nuevas", "Cambia contraseñas de técnicos", "Atiende pedidos de contraseña de técnicos"],
              },
              {
                t: "Propietario",
                p: ["Todo lo del administrador", "Cambia contraseñas de cualquiera", "Cambia niveles", "Quita o devuelve el acceso", "Edita o borra informes"],
              },
            ].map((n) => (
              <div key={n.t} className={`tarjeta ${n.t === "Propietario" ? "border-marca-300" : ""}`}>
                <h3 className="mb-2 font-semibold">{n.t}</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  {n.p.map((x) => (
                    <li key={x}>✓ {x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Seccion>

        {propietario && (
          <Seccion
            id="espacio"
            titulo="Espacio de almacenamiento"
            descripcion="Cuánto espacio queda en Supabase. Solo el propietario ve esta sección."
          >
            {uso ? (
              <EspacioSupabase uso={uso} />
            ) : (
              <p className="tarjeta text-sm text-gray-500">No se pudo leer el espacio usado.</p>
            )}
          </Seccion>
        )}
      </main>
    </>
  );
}
