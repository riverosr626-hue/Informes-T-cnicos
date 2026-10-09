import { adminDb, ErrorHttp, perfilDe, responderError, usuarioDeSolicitud } from "@/lib/firebaseAdmin";
import {
  CAMPOS_CONDICION,
  CAMPOS_NUMERICOS,
  CAMPOS_TEXTO,
  CONDICIONES,
  ESTADOS_GENERALES,
  TIPOS_EVALUACION,
} from "@/lib/tipos";

export const dynamic = "force-dynamic";

const MAX_FOTOS = 30;

function texto(valor: unknown, max = 2000): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") throw new ErrorHttp(400, "Datos del informe no válidos.");
  const limpio = valor.trim().slice(0, max);
  return limpio === "" ? null : limpio;
}

function numero(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) throw new ErrorHttp(400, "Hay una medición que no es un número válido.");
  return n;
}

function opcion(valor: unknown, opciones: string[], obligatorio: boolean, nombre: string): string | null {
  const v = texto(valor, 100);
  if (v === null) {
    if (obligatorio) throw new ErrorHttp(400, `Falta el campo "${nombre}".`);
    return null;
  }
  if (!opciones.includes(v)) throw new ErrorHttp(400, `Valor no válido en "${nombre}".`);
  return v;
}

// Crea un informe a nombre del usuario conectado y le asigna el siguiente número
export async function POST(solicitud: Request) {
  try {
    const usuario = await usuarioDeSolicitud(solicitud);
    const perfil = await perfilDe(usuario.uid);
    if (!perfil) throw new ErrorHttp(403, "Tu cuenta no tiene perfil. Cierra sesión y vuelve a entrar.");
    if (!usuario.email_verified && perfil.rol !== "admin") {
      throw new ErrorHttp(403, "Confirma tu correo antes de enviar informes.");
    }

    const cuerpo = (await solicitud.json().catch(() => null)) as Record<string, unknown> | null;
    if (!cuerpo || typeof cuerpo !== "object") throw new ErrorHttp(400, "Datos del informe no válidos.");

    const fecha = texto(cuerpo.fecha_evaluacion, 10);
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new ErrorHttp(400, "La fecha de evaluación no es válida.");

    const datos: Record<string, unknown> = {
      fecha_evaluacion: fecha,
      tipo_evaluacion: opcion(cuerpo.tipo_evaluacion, TIPOS_EVALUACION, true, "Tipo de evaluación"),
      estado_general: opcion(cuerpo.estado_general, ESTADOS_GENERALES, true, "Estado general"),
    };
    for (const campo of CAMPOS_TEXTO) datos[campo] = texto(cuerpo[campo]);
    for (const campo of CAMPOS_NUMERICOS) datos[campo] = numero(cuerpo[campo]);
    for (const campo of CAMPOS_CONDICION) datos[campo] = opcion(cuerpo[campo], CONDICIONES, false, campo);
    if (!datos.cliente) throw new ErrorHttp(400, 'Falta el campo "Cliente".');

    const carga = cuerpo.prueba_con_carga;
    datos.prueba_con_carga = carga === true || carga === false ? carga : null;

    // Solo se aceptan fotos subidas a la carpeta propia
    const fotos = Array.isArray(cuerpo.fotos) ? cuerpo.fotos : [];
    const prefijo = `fotos/${usuario.uid}/`;
    if (
      fotos.length > MAX_FOTOS ||
      !fotos.every((f) => typeof f === "string" && f.startsWith(prefijo) && !f.includes("..") && f.length < 300)
    ) {
      throw new ErrorHttp(400, "Las fotos del informe no son válidas.");
    }
    datos.fotos = fotos;

    const bd = adminDb();
    const contador = bd.doc("contadores/informes");
    const id = await bd.runTransaction(async (tx) => {
      const actual = await tx.get(contador);
      const siguiente = ((actual.exists ? (actual.data()?.ultimo as number) : 0) || 0) + 1;
      tx.set(contador, { ultimo: siguiente });
      tx.create(bd.doc(`informes/${siguiente}`), {
        ...datos,
        id: siguiente,
        tecnico_id: usuario.uid,
        tecnico_nombre: perfil.nombre,
        tecnico_correo: perfil.correo,
        creado_en: new Date().toISOString(),
      });
      return siguiente;
    });

    return Response.json({ id });
  } catch (error) {
    return responderError(error);
  }
}
