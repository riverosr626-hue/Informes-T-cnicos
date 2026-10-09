import { adminAuth, ErrorHttp, exigirAdmin, responderError } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// El administrador confirma la cuenta de un técnico sin que él abra el correo
export async function POST(solicitud: Request) {
  try {
    await exigirAdmin(solicitud);
    const { uid } = (await solicitud.json().catch(() => ({}))) as { uid?: unknown };
    if (typeof uid !== "string" || !uid) throw new ErrorHttp(400, "Falta el técnico.");
    await adminAuth().updateUser(uid, { emailVerified: true });
    return Response.json({ ok: true });
  } catch (error) {
    return responderError(error);
  }
}
