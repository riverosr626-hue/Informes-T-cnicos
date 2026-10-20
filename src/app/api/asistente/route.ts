import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { configIA, configPersonal, NOMBRE_PROVEEDOR, preguntarIA, type MensajeIA } from "@/lib/asistente/ia";
import { guiaComoTexto } from "@/lib/asistente/guia";
import { NOMBRE_ROL, type Rol } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const MAX_MENSAJES = 12;
const MAX_LARGO = 2000;

async function usuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // El nivel se lee de la base de datos, nunca de lo que mande el navegador
  const { data } = await supabase.from("perfiles").select("nombre, rol, activo").eq("id", user.id).single();
  if (!data || data.activo === false) return null;
  return { nombre: data.nombre as string, rol: data.rol as Rol };
}

// ¿Hay una IA conectada? (no revela la clave)
export async function GET() {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const cfg = configIA();
  return NextResponse.json({
    ia: Boolean(cfg),
    proveedor: cfg ? NOMBRE_PROVEEDOR[cfg.proveedor] : null,
    modelo: cfg && u.rol === "propietario" ? cfg.modelo : null,
  });
}

// Conversación con la IA. No se guarda nada en el servidor.
export async function POST(req: Request) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  let cuerpo: {
    mensajes?: { de: string; texto: string }[];
    formulario?: Record<string, string>;
    ia?: { servicio?: unknown; clave?: unknown; modelo?: unknown };
  };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  // Primero la IA personal de la persona (si la conectó en su dispositivo); si no, la de la empresa.
  // La clave personal solo se usa para esta consulta: no se guarda ni se registra en el servidor.
  const personal = cuerpo.ia ? configPersonal(cuerpo.ia) : null;
  if (cuerpo.ia && !personal) return NextResponse.json({ error: "La conexión de IA no es válida." }, { status: 400 });
  const cfg = personal ?? configIA();
  if (!cfg) return NextResponse.json({ error: "No hay una IA conectada." }, { status: 503 });

  const mensajes: MensajeIA[] = (cuerpo.mensajes ?? [])
    .filter((m) => m && typeof m.texto === "string" && m.texto.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ role: m.de === "asistente" ? "assistant" : "user", content: m.texto.slice(0, MAX_LARGO) }));
  // La conversación debe empezar con la persona
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }

  let contextoFormulario = "";
  if (cuerpo.formulario && typeof cuerpo.formulario === "object") {
    const lineas = Object.entries(cuerpo.formulario)
      .filter(([k, v]) => typeof v === "string" && v.trim() && k.length < 40)
      .slice(0, 40)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 300)}`);
    if (lineas.length) contextoFormulario = `\n\nDatos que la persona lleva escritos en el formulario de informe:\n${lineas.join("\n")}`;
  }

  const sistema = `Eres el asistente de la app "Informes de Generadores" de LE Energy (Chile), que registra evaluaciones técnicas de grupos electrógenos.
Hablas en español de Chile, claro y breve. Ayudas en dos cosas:
1) Redactar informes: el informe tiene nombre y ubicación del cliente, nombre, marca y modelo del equipo, N° de serie, horómetro, una descripción y fotos o videos. Ayudas a escribir la descripción en tono técnico y profesional, ordenada en: estado en que se encontró el equipo, trabajos realizados, hallazgos y recomendaciones. No inventes datos, mediciones ni trabajos que la persona no mencionó; si falta algo, déjalo entre corchetes para que lo complete. Recuerda que manda el manual del fabricante.
2) Guiar el uso de la app.

La persona se llama ${u.nombre} y su nivel es ${NOMBRE_ROL[u.rol]}. Explica solo lo que su nivel puede hacer; si pide algo fuera de su nivel, dile amablemente quién puede hacerlo. Lo que puede hacer este nivel en la app:
${guiaComoTexto(u.rol)}

No tienes acceso a la base de datos ni a los informes guardados, y no puedes ejecutar acciones en la app: solo conversas. No pidas ni repitas contraseñas.${contextoFormulario}`;

  try {
    const texto = await preguntarIA(cfg, sistema, mensajes);
    return NextResponse.json({ texto: texto || "No obtuve respuesta. Intenta de nuevo." });
  } catch (e) {
    const msg = e instanceof Error && e.name !== "AbortError" ? e.message : "La IA tardó demasiado en responder.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
