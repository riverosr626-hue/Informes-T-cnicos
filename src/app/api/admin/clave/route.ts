import { adminAuth, ErrorHttp, exigirAdmin, responderError } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// El administrador asigna una contraseña nueva a un técnico
export async function POST(solicitud: Request) {
  try {
    await exigirAdmin(solicitud);
    const { uid, clave } = (await solicitud.json().catch(() => ({}))) as { uid?: unknown; clave?: unknown };
    if (typeof uid !== "string" || !uid) throw new ErrorHttp(400, "Falta el técnico.");
    if (typeof clave !== "string" || clave.length < 6) {
      throw new ErrorHttp(400, "La contraseña debe tener al menos 6 caracteres.");
    }
    await adminAuth().updateUser(uid, { password: clave, emailVerified: true });
    return Response.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
