import Link from "next/link";
import Encabezado from "@/components/Encabezado";
import { obtenerSesion } from "@/lib/sesion";
import { cerrarSesion } from "@/lib/acciones";
import { esAdmin, NOMBRE_ROL } from "@/lib/tipos";

export const dynamic = "force-dynamic";

function Tarjeta({
  href,
  icono,
  titulo,
  texto,
  destacada = false,
  aviso,
}: {
  href: string;
  icono: string;
  titulo: string;
  texto: string;
  destacada?: boolean;
  aviso?: number;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-start gap-4 rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        destacada ? "border-marca-600 bg-marca-500 text-white" : "border-gray-200 bg-white"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${
          destacada ? "bg-white/20" : "bg-marca-50"
        }`}
        aria-hidden
      >
        {icono}
      </span>
      <span>
        <span className="block text-lg font-semibold">{titulo}</span>
        <span className={`block text-sm ${destacada ? "text-white/85" : "text-gray-500"}`}>{texto}</span>
      </span>
      {aviso ? (
        <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 text-xs font-bold leading-5 text-white">
          {aviso}
        </span>
      ) : null}
    </Link>
  );
}

function Dato({ valor, texto }: { valor: number | string; texto: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-2xl font-bold text-grafito">{valor}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{texto}</div>
    </div>
  );
}

export default async function Inicio() {
  const { supabase, perfil } = await obtenerSesion();
  const admin = esAdmin(perfil?.rol);

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  // Las reglas de la base de datos ya limitan a cada técnico a sus propios informes
  const [total, delMes, cuentas, pedidos] = await Promise.all([
    supabase.from("informes").select("id", { count: "exact", head: true }),
    supabase.from("informes").select("id", { count: "exact", head: true }).gte("creado_en", inicioMes.toISOString()),
    admin ? supabase.rpc("admin_listar_cuentas") : Promise.resolve({ data: null }),
    admin ? supabase.rpc("admin_listar_pedidos_clave") : Promise.resolve({ data: null }),
  ]);

  const listaCuentas = (cuentas.data as { activo: boolean }[] | null) ?? [];
  const pendientes = Array.isArray(pedidos.data) ? pedidos.data.length : 0;
  const primerNombre = (perfil?.nombre ?? "").split(" ")[0];

  return (
    <>
      <Encabezado perfil={perfil} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Hola{primerNombre ? `, ${primerNombre}` : ""} 👋</h1>
          <p className="text-sm text-gray-500">
            {perfil ? NOMBRE_ROL[perfil.rol] : ""} · ¿Qué quieres hacer hoy?
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato valor={total.count ?? 0} texto={admin ? "Informes en total" : "Mis informes"} />
          <Dato valor={delMes.count ?? 0} texto="Este mes" />
          {admin && <Dato valor={listaCuentas.filter((c) => c.activo).length} texto="Cuentas activas" />}
          {admin && <Dato valor={pendientes} texto="Pedidos de contraseña" />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Tarjeta href="/informes/nuevo" icono="📝" titulo="Nuevo informe" texto="Registrar una evaluación de generador" destacada />
          <Tarjeta
            href="/informes"
            icono="📂"
            titulo={admin ? "Todos los informes" : "Mis informes"}
            texto="Buscar, revisar e imprimir informes"
          />
          {admin && (
            <Tarjeta
              href="/configuracion"
              icono="⚙️"
              titulo="Configuración"
              texto="Cuentas, niveles, accesos y contraseñas"
              aviso={pendientes}
            />
          )}
          <Tarjeta href="/cuenta" icono="👤" titulo="Mi cuenta" texto="Mis datos, contraseña y código de recuperación" />
        </div>

        <form action={cerrarSesion} className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <span aria-hidden>⎋</span> Cerrar sesión
          </button>
        </form>
      </main>
    </>
  );
}
