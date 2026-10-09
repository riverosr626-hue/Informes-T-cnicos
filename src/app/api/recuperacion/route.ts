import { adminDb, responderError, usuarioDeSolicitud } from "@/lib/firebaseAdmin";
import { formatear, hashear, nuevaSal, nuevoCodigo, type CodigoGuardado } from "@/lib/codigos";

export const dynamic = "force-dynamic";

// ¿El usuario conectado ya tiene un código vigente?
export async function GET(solicitud: Request) {
  try {
    const usuario = await usuarioDeSolicitud(solicitud);
    const doc = await adminDb().doc(`codigos_recuperacion/${usuario.uid}`).get();
    const datos = doc.data() as CodigoGuardado | undefined;
    return Response.json({ tiene: !!datos && !datos.usado });
  } catch (error) {
    return responderError(error);
  }
}

// Genera (o reemplaza) el código del usuario conectado y lo devuelve una sola vez
export async function POST(solicitud: Request) {
  try {
    const usuario = await usuarioDeSolicitud(solicitud);
    const codigo = nuevoCodigo();
    const sal = nuevaSal();
    const guardado: CodigoGuardado = {
      hash: hashear(codigo, sal),
      sal,
      intentos: 0,
      bloqueado_hasta: null,
      usado: false,
      creado_en: new Date().toISOString(),
    };
    await adminDb().doc(`codigos_recuperacion/${usuario.uid}`).set(guardado);
    return Response.json({ codigo: formatear(codigo) });
  } catch (error) {
    return responderError(error);
  }
}
