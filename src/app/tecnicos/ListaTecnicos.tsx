"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatoFecha } from "@/lib/tipos";

export type Tecnico = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
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

export default function ListaTecnicos({ tecnicos, miId }: { tecnicos: Tecnico[]; miId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [editando, setEditando] = useState<Tecnico | null>(null);
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function abrirCambio(t: Tecnico) {
    setEditando(t);
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
            Te sugerimos una contraseña temporal; puedes cambiarla. Díctasela al técnico; después él puede seguir usándola.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="campo max-w-xs font-mono"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              minLength={6}
            />
            <button type="button" className="boton-sec" onClick={() => setClave(generarClave())}>Otra</button>
            <button type="button" className="boton" onClick={guardarClave} disabled={cargando}>
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>
            <button type="button" className="boton-sec" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2.5">Nombre</th>
              <th className="px-4 py-2.5">Correo</th>
              <th className="px-4 py-2.5">Estado</th>
              <th className="px-4 py-2.5">Informes</th>
              <th className="px-4 py-2.5">Último ingreso</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tecnicos.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5 font-medium">
                  {t.nombre}
                  {t.rol === "admin" && (
                    <span className="ml-2 rounded bg-marca-500 px-1.5 py-0.5 text-xs font-semibold text-white">Admin</span>
                  )}
                </td>
                <td className="px-4 py-2.5 break-all">{t.correo}</td>
                <td className="px-4 py-2.5">
                  {t.confirmado ? (
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
                    {!t.confirmado && (
                      <button type="button" className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" onClick={() => confirmar(t)} disabled={cargando}>
                        Confirmar cuenta
                      </button>
                    )}
                    {t.id !== miId && (
                      <button type="button" className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" onClick={() => abrirCambio(t)}>
                        Cambiar contraseña
                      </button>
                    )}
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
