export type Perfil = {
  id: string;
  nombre: string;
  correo: string;
  rol: "tecnico" | "admin";
};

export type Informe = {
  id: number;
  tecnico_id: string;
  creado_en: string;
  fecha_evaluacion: string;
  tipo_evaluacion: string;
  cliente: string;
  ubicacion: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  potencia_kva: number | null;
  horometro: number | null;
  voltaje_l1: number | null;
  voltaje_l2: number | null;
  voltaje_l3: number | null;
  frecuencia_hz: number | null;
  presion_aceite_psi: number | null;
  temperatura_c: number | null;
  voltaje_bateria: number | null;
  nivel_aceite: string | null;
  nivel_refrigerante: string | null;
  nivel_combustible: string | null;
  estado_filtros: string | null;
  estado_correas: string | null;
  estado_bateria: string | null;
  prueba_con_carga: boolean | null;
  estado_general: string;
  observaciones: string | null;
  recomendaciones: string | null;
  fotos: string[];
  perfiles?: { nombre: string; correo: string } | null;
};

export const ESTADOS_GENERALES = ["Operativo", "Operativo con observaciones", "Fuera de servicio"];
export const TIPOS_EVALUACION = ["Preventiva", "Correctiva", "Inspección", "Puesta en marcha"];
export const CONDICIONES = ["Bueno", "Regular", "Malo", "N/A"];

export function colorEstado(estado: string) {
  if (estado === "Operativo") return "bg-emerald-100 text-emerald-800";
  if (estado === "Fuera de servicio") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

export function formatoFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });
}
