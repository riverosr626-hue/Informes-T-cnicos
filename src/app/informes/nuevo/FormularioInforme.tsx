"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes } from "firebase/storage";
import { llamarApi, storage } from "@/lib/firebase";
import { CAMPOS_NUMERICOS, CONDICIONES, ESTADOS_GENERALES, TIPOS_EVALUACION } from "@/lib/tipos";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="etiqueta">{label}</label>
      {children}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-800">{titulo}</h2>
      {children}
    </section>
  );
}

const MEDICIONES: [string, string][] = [
  ["voltaje_l1", "Voltaje L1 (V)"],
  ["voltaje_l2", "Voltaje L2 (V)"],
  ["voltaje_l3", "Voltaje L3 (V)"],
  ["frecuencia_hz", "Frecuencia (Hz)"],
  ["presion_aceite_psi", "Presión aceite (psi)"],
  ["temperatura_c", "Temperatura (°C)"],
  ["voltaje_bateria", "Voltaje batería (V)"],
];

const INSPECCION: [string, string][] = [
  ["nivel_aceite", "Nivel de aceite"],
  ["nivel_refrigerante", "Nivel de refrigerante"],
  ["nivel_combustible", "Nivel de combustible"],
  ["estado_filtros", "Filtros"],
  ["estado_correas", "Correas"],
  ["estado_bateria", "Batería"],
];

const NUMERICOS: readonly string[] = CAMPOS_NUMERICOS;
const MAX_FOTO_MB = 10;

export default function FormularioInforme({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const datos: Record<string, unknown> = {};
    fd.forEach((valor, clave) => {
      if (clave === "fotos") return;
      const v = String(valor).trim();
      if (v === "") return;
      datos[clave] = NUMERICOS.includes(clave) ? Number(v.replace(",", ".")) : v;
    });
    const carga = fd.get("prueba_con_carga");
    datos.prueba_con_carga = carga === "si" ? true : carga === "no" ? false : null;

    const grande = fotos.find((f) => f.size > MAX_FOTO_MB * 1024 * 1024);
    if (grande) {
      setError(`La foto "${grande.name}" pesa más de ${MAX_FOTO_MB} MB.`);
      setEnviando(false);
      return;
    }

    // 1) Subir fotos a la carpeta del técnico
    const rutas: string[] = [];
    for (const foto of fotos) {
      const ext = (foto.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
      const ruta = `fotos/${usuarioId}/${crypto.randomUUID()}.${ext}`;
      try {
        await uploadBytes(ref(storage(), ruta), foto, { contentType: foto.type || "image/jpeg" });
      } catch {
        setError(`No se pudo subir la foto "${foto.name}". Revisa tu conexión e inténtalo de nuevo.`);
        setEnviando(false);
        return;
      }
      rutas.push(ruta);
    }

    // 2) Guardar el informe: el servidor lo numera y lo firma con la cuenta conectada
    try {
      const { id } = await llamarApi<{ id: number }>("/api/informes", { ...datos, fotos: rutas });
      router.push(`/informes/${id}`);
    } catch (err) {
      setError(`No se pudo guardar el informe: ${(err as Error).message}`);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Seccion titulo="Datos generales">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Fecha de evaluación *">
            <input type="date" name="fecha_evaluacion" defaultValue={hoy} required className="campo" />
          </Campo>
          <Campo label="Tipo de evaluación *">
            <select name="tipo_evaluacion" required className="campo" defaultValue="Preventiva">
              {TIPOS_EVALUACION.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Cliente *">
            <input name="cliente" required className="campo" />
          </Campo>
          <Campo label="Ubicación / Faena">
            <input name="ubicacion" className="campo" />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Datos del generador">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Marca"><input name="marca" className="campo" /></Campo>
          <Campo label="Modelo"><input name="modelo" className="campo" /></Campo>
          <Campo label="N° de serie"><input name="numero_serie" className="campo" /></Campo>
          <Campo label="Potencia (kVA)"><input name="potencia_kva" inputMode="decimal" className="campo" /></Campo>
          <Campo label="Horómetro (h)"><input name="horometro" inputMode="decimal" className="campo" /></Campo>
        </div>
      </Seccion>

      <Seccion titulo="Mediciones">
        <div className="grid gap-4 sm:grid-cols-3">
          {MEDICIONES.map(([k, l]) => (
            <Campo key={k} label={l}><input name={k} inputMode="decimal" className="campo" /></Campo>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Inspección">
        <div className="grid gap-4 sm:grid-cols-3">
          {INSPECCION.map(([k, l]) => (
            <Campo key={k} label={l}>
              <select name={k} className="campo" defaultValue="">
                <option value="">—</option>
                {CONDICIONES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Campo>
          ))}
          <Campo label="Prueba con carga">
            <select name="prueba_con_carga" className="campo" defaultValue="">
              <option value="">No aplica</option>
              <option value="si">Sí, aprobada</option>
              <option value="no">Sí, no aprobada</option>
            </select>
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Conclusión">
        <div className="space-y-4">
          <Campo label="Estado general del equipo *">
            <div className="flex flex-wrap gap-2">
              {ESTADOS_GENERALES.map((e, idx) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50">
                  <input type="radio" name="estado_general" value={e} required defaultChecked={idx === 0} />
                  {e}
                </label>
              ))}
            </div>
          </Campo>
          <Campo label="Observaciones">
            <textarea name="observaciones" rows={4} className="campo" />
          </Campo>
          <Campo label="Recomendaciones">
            <textarea name="recomendaciones" rows={3} className="campo" />
          </Campo>
          <Campo label="Fotos">
            <input
              type="file"
              name="fotos"
              accept="image/*"
              multiple
              onChange={(e) => setFotos(Array.from(e.target.files ?? []))}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-white"
            />
            {fotos.length > 0 && <p className="mt-1 text-xs text-gray-500">{fotos.length} foto(s) seleccionada(s)</p>}
          </Campo>
        </div>
      </Seccion>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="boton-sec">Cancelar</button>
        <button className="boton" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar informe"}
        </button>
      </div>
    </form>
  );
}
