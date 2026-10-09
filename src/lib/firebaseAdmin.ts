// Solo para el servidor (rutas /api). Usa la cuenta de servicio de Firebase.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function app(): App {
  const existente = getApps()[0];
  if (existente) return existente;

  const crudo = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!crudo) throw new Error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT");
  // Acepta el JSON tal cual o codificado en base64
  const texto = crudo.trim().startsWith("{") ? crudo : Buffer.from(crudo, "base64").toString("utf8");
  const cuenta = JSON.parse(texto) as { project_id: string; client_email: string; private_key: string };

  return initializeApp({
    credential: cert({
      projectId: cuenta.project_id,
      clientEmail: cuenta.client_email,
      privateKey: cuenta.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());

export class ErrorHttp extends Error {
  constructor(public status: number, mensaje: string) {
    super(mensaje);
  }
}

// Verifica el token que envía el navegador y devuelve el usuario
export async function usuarioDeSolicitud(solicitud: Request) {
  const cabecera = solicitud.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!token) throw new ErrorHttp(401, "Debes iniciar sesión.");
  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    throw new ErrorHttp(401, "Tu sesión venció. Vuelve a iniciar sesión.");
  }
}

export type PerfilServidor = { nombre: string; correo: string; rol: "tecnico" | "admin"; creado_en?: string };

export async function perfilDe(uid: string): Promise<PerfilServidor | null> {
  const doc = await adminDb().doc(`perfiles/${uid}`).get();
  return doc.exists ? (doc.data() as PerfilServidor) : null;
}

export async function exigirAdmin(solicitud: Request) {
  const usuario = await usuarioDeSolicitud(solicitud);
  const perfil = await perfilDe(usuario.uid);
  if (perfil?.rol !== "admin") throw new ErrorHttp(403, "Solo el administrador puede hacer esto.");
  return usuario;
}

export function responderError(error: unknown) {
  if (error instanceof ErrorHttp) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Error interno del servidor. Inténtalo de nuevo." }, { status: 500 });
}
