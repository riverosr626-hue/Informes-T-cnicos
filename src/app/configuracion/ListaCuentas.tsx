"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { esPropietario, formatoFecha, NOMBRE_ROL, type Rol } from "@/lib/tipos";

export type Tecnico = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  confirmado: boolean;
  creado_en: string;
  ultimo_ingreso: string | null;
  total_informes: number;
};

function generarClave() {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const numeros = "23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 4; i++) c += numeros[Math.floor(Math.random() * numeros.length)];
  return c;
}

const botonChico =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50";

export default function ListaTecnicos({ tecnicos, miId, miRol }: { tecnicos: Tecnico[]; miId: string; miRol: Rol }) {
  const router = useRouter();
  const supabase = createClient();
  const soyPropietario = esPropietario(miRol);
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [quitando, setQuitando] = useState<Tecnico | null>(null);
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  // El administrador solo gestiona contraseñas de técnicos; el propietario, de todos
  const puedeCambiarClave = (t: Tecnico) => t.id !== miId && (soyPropietario || t.rol === "tecnico");
  const puedeAdministrar = (t: Tecnico) => soyPropietario && t.id !== miId;

  function abrirCambio(t: Tecnico) {
    setEditando(t);
    setQuitando(null);
    setClave(generarClave());
    setMensaje(null);
  }

  async function guardarClave() {
    if (!editando) return;
    if (clave.length < 6) {
      setMensaje({ tipo: "error", texto: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    setCargando(true);
    const { error } = await supabase.rpc("admin_cambiar_clave", { p_usuario: editando.id, p_clave: clave });
    setCargando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message });
      return;
    }
    setMensaje({
      tipo: "ok",
      texto: `Listo. ${editando.nombre} ya puede entrar con su correo (${editando.correo}) y la contraseña: ${clave}`,
    });
    setEditando(null);
    router.refresh();
  }

  async function confirmar(t: Tecnico) {
    setCargando(true);
    const { error } = await supabase.rpc("admin_confirmar_cuenta", { p_usuario: t.id });
    setCargando(false);
    setMensaje(
      error
        ? { tipo: "error", texto: error.message }
        : { tipo: "ok", texto: `Cuenta de ${t.nombre} confirmada. Ya puede iniciar sesión.` }
    );
    router.refresh();
  }

  async function cambiarRol(t: Tecnico, rol: Rol) {
    if (rol === t.rol) return;
    setCargando(true);
    const { error } = await supabase.rpc("propietario_cambiar_rol", { p_usuario: t.id, p_rol: rol });
    setCargando(false);
    setMensaje(
      error
        ? { tipo: "error", texto: error.message }
        : { tipo: "ok", texto: `${t.nombre} ahora es ${NOMBRE_ROL[rol]}.` }
    );
    router.refresh();
  }

  async function cambiarAcceso(t: Tecnico, activo: boolean) {
    setCargando(true);
    const { error } = await supabase.rpc("propietario_cambiar_acceso", { p_usuario: t.id, p_activo: activo });
    setCargando(false);
    setQuitando(null);
    setMensaje(
      error
        ? { tipo: "error", texto: error.message }
        : {
            tipo: "ok",
            texto: activo
              ? `${t.nombre} vuelve a tener acceso a la app.`
              : `${t.nombre} ya no puede entrar a la app. Sus informes se conservan.`,
          }
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {mensaje && (
        <p className={`rounded p-3 text-sm ${mensaje.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {mensaje.texto}
        </p>
      )}

      {editando && (
        <div className="tarjeta border-marca-300">
          <h2 className="font-semibold">Nueva contraseña para {editando.nombre}</h2>
          <p className="mb-3 text-sm text-gray-500">
            Te sugerimos una contraseña temporal; puedes cambiarla. Entrégasela a la persona; después puede seguir usándola.
          </p>
          <div className="flex flex-wrap gap-2">
            <input className="campo max-w-xs font-mono" value={clave} onChange={(e) => setClave(e.target.value)} minLength={6} />
            <button type="button" className="boton-sec" onClick={() => setClave(generarClave())}>Otra</button>
            <button type="button" className="boton" onClick={guardarClave} disabled={cargando}>
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>
            <button type="button" className="boton-sec" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {quitando && (
        <div className="tarjeta border-red-300 bg-red-50">
          <h2 className="font-semibold text-red-800">¿Quitar el acceso a {quitando.nombre}?</h2>
          <p className="mb-3 text-sm text-red-800">
            No podrá volver a entrar a la app. Sus informes se conservan y puedes devolverle el acceso cuando quieras.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              onClick={() => cambiarAcceso(quitando, false)}
              disabled={cargando}
            >
              {cargando ? "Quitando…" : "Sí, quitar acceso"}
            </button>
            <button type="button" className="boton-sec" onClick={() => setQuitando(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Nombre</th>
              <th className="hidden px-4 py-2.5 lg:table-cell">Correo</th>
              <th className="px-4 py-2.5">Nivel</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Informes</th>
              <th className="px-4 py-2.5">Último ingreso</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tecnicos.map((t) => (
              <tr key={t.id} className={t.activo ? "" : "bg-gray-50 text-gray-400"}>
                <td className="px-4 py-2.5 font-medium">
                  {t.nombre}
                  {t.id === miId && <span className="ml-1 text-xs text-gray-400">(tú)</span>}
                  <span className="block text-xs font-normal text-gray-500 lg:hidden">{t.correo}</span>
                </td>
                <td className="hidden px-4 py-2.5 lg:table-cell">{t.correo}</td>
                <td className="px-4 py-2.5">
                  {puedeAdministrar(t) ? (
                    <select
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                      value={t.rol}
                      onChange={(e) => cambiarRol(t, e.target.value as Rol)}
                      disabled={cargando}
                    >
                      <option value="tecnico">Técnico</option>
                      <option value="admin">Administrador</option>
                      <option value="propietario">Propietario</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        t.rol === "tecnico" ? "bg-gray-100 text-gray-700" : "bg-marca-500 text-white"
                      }`}
                    >
                      {NOMBRE_ROL[t.rol]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {!t.activo ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Sin acceso</span>
                  ) : t.confirmado ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Activa</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Sin confirmar</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <a href={`/informes?tecnico=${t.id}`} className="text-marca-700 underline">{t.total_informes}</a>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">
                  {t.ultimo_ingreso ? formatoFecha(t.ultimo_ingreso) : "Nunca"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap justify-end gap-2">
                    {t.activo && !t.confirmado && (
                      <button type="button" className={botonChico} onClick={() => confirmar(t)} disabled={cargando}>
                        Confirmar cuenta
                      </button>
                    )}
                    {t.activo && puedeCambiarClave(t) && (
                      <button type="button" className={botonChico} onClick={() => abrirCambio(t)}>
                        Cambiar contraseña
                      </button>
                    )}
                    {puedeAdministrar(t) &&
                      (t.activo ? (
                        <button
                          type="button"
                          className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => { setQuitando(t); setEditando(null); setMensaje(null); }}
                          disabled={cargando}
                        >
                          Quitar acceso
                        </button>
                      ) : (
                        <button type="button" className={botonChico} onClick={() => cambiarAcceso(t, true)} disabled={cargando}>
                          Devolver acceso
                        </button>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
