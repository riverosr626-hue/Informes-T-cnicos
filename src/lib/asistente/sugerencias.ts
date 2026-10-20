// Reglas del asistente de redacción (sin IA) para el informe simplificado:
// revisa qué falta, propone una estructura para la descripción y frases técnicas comunes.

export type Revision = {
  faltantes: string[];
  consejos: string[];
};

type Valores = Record<string, string>;

export const PLANTILLA = [
  "Estado en que se encontró el equipo:",
  "",
  "Trabajos realizados:",
  "",
  "Hallazgos:",
  "",
  "Recomendaciones:",
  "",
].join("\n");

// Frases de uso frecuente, agrupadas para insertarlas con un toque
export const FRASES: { grupo: string; frases: string[] }[] = [
  {
    grupo: "Estado",
    frases: [
      "Equipo se encuentra operativo y en buen estado general.",
      "Equipo operativo con observaciones.",
      "Equipo fuera de servicio al momento de la visita.",
      "Se realiza partida y prueba de funcionamiento sin novedades.",
    ],
  },
  {
    grupo: "Trabajos",
    frases: [
      "Se realiza mantención preventiva según pauta del fabricante.",
      "Se cambia aceite y filtros de aceite, aire y combustible.",
      "Se revisan niveles de aceite, refrigerante y combustible.",
      "Se revisa batería, bornes y cargador de batería.",
      "Se revisan correas, mangueras y posibles fugas.",
      "Se realiza prueba con carga satisfactoria.",
    ],
  },
  {
    grupo: "Hallazgos",
    frases: [
      "Se detecta fuga de aceite.",
      "Se detecta fuga de refrigerante.",
      "Batería con baja carga.",
      "Correas con desgaste.",
      "Filtros saturados.",
      "Nivel de combustible bajo.",
    ],
  },
  {
    grupo: "Recomendaciones",
    frases: [
      "Se recomienda reemplazar la batería.",
      "Se recomienda corregir la fuga detectada a la brevedad.",
      "Se recomienda reemplazar correas en la próxima visita.",
      "Se recomienda abastecer combustible para asegurar la autonomía del equipo.",
      "Se recomienda realizar prueba con carga periódicamente.",
    ],
  },
];

function numero(v: string | undefined): number | null {
  const limpio = (v ?? "").trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export function proximaMantencion(horometro: string | undefined): number | null {
  const h = numero(horometro);
  if (h === null || h < 0) return null;
  return Math.floor(h / 250) * 250 + 250;
}

export function revisarInforme(v: Valores): Revision {
  const faltantes: string[] = [];
  const consejos: string[] = [];

  if (!v.cliente?.trim()) faltantes.push("Nombre del cliente");
  if (!v.ubicacion?.trim()) faltantes.push("Ubicación del cliente");
  if (!v.nombre_equipo?.trim()) faltantes.push("Nombre del equipo");
  if (!v.marca?.trim()) faltantes.push("Marca");
  if (!v.modelo?.trim()) faltantes.push("Modelo");
  if (!v.numero_serie?.trim()) faltantes.push("N° de serie");
  if (!v.horometro?.trim()) faltantes.push("Horómetro");
  else if (numero(v.horometro) === null) consejos.push("El horómetro debe ser un número (ej. 1250).");

  const d = (v.descripcion ?? "").trim();
  const dn = d.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!d) {
    faltantes.push("Descripción");
  } else {
    if (d.length < 60) consejos.push("La descripción es muy corta: indica qué se encontró y qué se hizo.");
    if (!/recomiend|recomendac|sugier/.test(dn)) consejos.push("Agrega una recomendación para el cliente (aunque sea \"sin observaciones\").");
    if (!/estado|operativ|fuera de servicio|funciona/.test(dn)) consejos.push("Indica en qué estado quedó el equipo (operativo, con observaciones o fuera de servicio).");
  }

  return { faltantes, consejos };
}
