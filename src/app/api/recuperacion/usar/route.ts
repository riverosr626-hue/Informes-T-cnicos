import { adminAuth, adminDb, ErrorHttp, responderError } from "@/lib/firebaseAdmin";
import { coincide, limpiar, type CodigoGuardado } from "@/lib/codigos";

export const dynamic = "force-dynamic";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 30;

// Cambia la contraseña con correo + código (no requiere sesión).
// Responde { resultado: "ok" | "invalido" | "bloqueado" }
export async function POST(solicitud: Request) {
  try {
    const cuerpo = (await solicitud.json().catch(() => ({}))) as { correo?: unknown; codigo?: unknown; clave?: unknown };
    const correo = typeof cuerpo.correo === "string" ? cuerpo.correo.trim().toLowerCase() : "";
    const codigo = typeof cuerpo.codigo === "string" ? limpiar(cuerpo.codigo) : "";
    const clave = typeof cuerpo.clave === "string" ? cuerpo.clave : "";

    if (clave.length < 6) throw new ErrorHttp(400, "La contraseña debe tener al menos 6 caracteres.");
    if (!correo || codigo.length !== 12) return Response.json({ resultado: "invalido" });

    let uid: string;
    try {
      uid = (await adminAuth().getUserByEmail(correo)).uid;
    } catch {
      return Response.json({ resultado: "invalido" });
    }

    const bd = adminDb();
    const ref = bd.doc(`codigos_recuperacion/${uid}`);

    const resultado = await bd.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const guardado = doc.data() as CodigoGuardado | undefined;
      if (!guardado || guardado.usado) return "invalido";

      if (guardado.bloqueado_hasta && new Date(guardado.bloqueado_hasta) > new Date()) return "bloqueado";

      if (!coincide(codigo, guardado)) {
        const intentos = (guardado.intentos || 0) + 1;
        tx.update(ref, {
          intentos,
          bloqueado_hasta:
            intentos >= MAX_INTENTOS ? new Date(Date.now() + BLOQUEO_MINUTOS * 60_000).toISOString() : null,
        });
        return "invalido";
      }

      // El código sirve una sola vez
      tx.update(ref, { usado: true, intentos: 0, bloqueado_hasta: null });
      return "ok";
    });

    if (resultado === "ok") {
      await adminAuth().updateUser(uid, { password: clave, emailVerified: true });
    }
    return Response.json({ resultado });
  } catch (error) {
    return responderError(error);
  }
}
