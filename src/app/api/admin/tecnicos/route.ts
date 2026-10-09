import type { UserRecord } from "firebase-admin/auth";
import { adminAuth, adminDb, exigirAdmin, responderError, type PerfilServidor } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

// Lista de técnicos con estado de la cuenta, último ingreso y cantidad de informes
export async function GET(solicitud: Request) {
  try {
    await exigirAdmin(solicitud);
    const bd = adminDb();

    const perfiles = (await bd.collection("perfiles").get()).docs.map((d) => ({
      id: d.id,
      ...(d.data() as PerfilServidor),
    }));

    // Datos de las cuentas (de a 100, el máximo que permite Firebase)
    const cuentas = new Map<string, UserRecord>();
    for (let i = 0; i < perfiles.length; i += 100) {
      const lote = perfiles.slice(i, i + 100).map((p) => ({ uid: p.id }));
      const { users } = await adminAuth().getUsers(lote);
      for (const u of users) cuentas.set(u.uid, u);
    }

    const tecnicos = await Promise.all(
      perfiles.map(async (p) => {
        const cuenta = cuentas.get(p.id);
        const conteo = await bd.collection("informes").where("tecnico_id", "==", p.id).count().get();
        const ultimo = cuenta?.metadata.lastSignInTime;
        return {
          id: p.id,
          nombre: p.nombre,
          correo: p.correo,
          rol: p.rol,
          confirmado: cuenta?.emailVerified ?? false,
          creado_en: p.creado_en ?? cuenta?.metadata.creationTime ?? "",
          ultimo_ingreso: ultimo ? new Date(ultimo).toISOString() : null,
          total_informes: conteo.data().count,
        };
      })
    );

    tecnicos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return Response.json({ tecnicos });
  } catch (error) {
    return responderError(error);
  }
}
