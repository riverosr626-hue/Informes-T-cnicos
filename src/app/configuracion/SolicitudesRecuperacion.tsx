"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { esPropietario, formatoFecha, NOMBRE_ROL, type Rol } from "@/lib/tipos";

export type Solicitud = {
  id: number;
  usuario_id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  creado_en: string;
};

// Solicitudes de "olvidé mi contraseña": el administrador genera un código
// de un solo uso (vale 24 horas) y se lo entrega al técnico.
export default function SolicitudesRecuperacion({ solicitudes, miRol }: { solicitudes: Solicitud[]; miRol: Rol }) {
  const router = useRouter();
  const supabase = createClient();
  const [cargando, setCargando] = useState<number | null>(null);
  const [entregado, setEntregado] = useState<{ nombre: string; correo: string; codigo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function generar(s: Solicitud) {
    setCargando(s.id);
    setError(null);
    setCopiado(false);
    const { data, error } = await supabase.rpc("admin_generar_codigo", { p_usuario: s.usuario_id });
    setCargando(null);
    if (error || typeof data !== "string") {
      setError(error?.message ?? "No se pudo generar el código.");
      return;
    }
    setEntregado({ nombre: s.nombre, correo: s.correo, codigo: data });
    router.refresh();
  }

  async function descartar(s: Solicitud) {
    setCargando(s.id);
    setError(null);
    const { error } = await supabase.rpc("admin_descartar_solicitud", { p_id: s.id });
    setCargando(null);
    if (error) setError(error.message);
    router.refresh();
  }

  async function copiarMensaje() {
    if (!entregado) return;
    const texto =
      `Hola ${entregado.nombre}, tu código para recuperar la contraseña de Informes LE Energy es: ${entregado.codigo}\n` +
      `Entra a ${window.location.origin}/recuperar, elige "Tengo un código" y crea tu contraseña nueva. ` +
      `El código vale 24 horas y sirve una sola vez.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  if (solicitudes.length === 0 && !entregado) return null;

  return (
    <div className="space-y-3">

      {entregado && (
        <div className="tarjeta border-marca-300 bg-marca-50">
          <p className="text-sm">
            Código para <strong>{entregado.nombre}</strong> ({entregado.correo}):
          </p>
          <p className="my-2 font-mono text-2xl font-bold tracking-wider text-grafito">{entregado.codigo}</p>
          <p className="text-sm text-gray-600">
            Entrégaselo por WhatsApp, teléfono o en persona. Vale <strong>24 horas</strong> y sirve una sola vez.
            Con él, el técnico entra a &quot;¿Olvidaste tu contraseña?&quot; → &quot;Tengo un código&quot; y crea su contraseña nueva.
            Este código no se vuelve a mostrar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="boton" onClick={copiarMensaje}>
              {copiado ? "Mensaje copiado ✓" : "Copiar mensaje para enviar"}
            </button>
            <button type="button" className="boton-sec" onClick={() => setEntregado(null)}>Listo</button>
          </div>
        </div>
      )}

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {solicitudes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-red-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-left text-xs uppercase tracking-wide text-red-800">
              <tr>
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Correo</th>
                <th className="px-4 py-2.5">Pedido</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {solicitudes.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-medium">
                    {s.nombre}
                    {s.rol !== "tecnico" && <span className="ml-2 text-xs text-gray-500">({NOMBRE_ROL[s.rol]})</span>}
                  </td>
                  <td className="px-4 py-2.5 break-all">{s.correo}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{formatoFecha(s.creado_en)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap justify-end gap-2">
                      {s.rol === "tecnico" || esPropietario(miRol) ? (
                        <button type="button" className="boton px-3 py-1 text-xs" onClick={() => generar(s)} disabled={cargando !== null}>
                          {cargando === s.id ? "Generando…" : "Generar código"}
                        </button>
                      ) : (
                        <span className="self-center text-xs text-gray-500">Lo atiende el propietario</span>
                      )}
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        onClick={() => descartar(s)}
                        disabled={cargando !== null}
                      >
                        Descartar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
