// Guía de uso de la app para el asistente (sin IA).
// Cada tema indica qué niveles pueden verlo, así el asistente nunca explica
// funciones que la persona no tiene.

import type { Rol } from "@/lib/tipos";

export type Tema = {
  id: string;
  titulo: string;
  claves: string[]; // palabras que activan el tema
  roles: Rol[];
  respuesta: string;
  enlace?: { href: string; texto: string };
};

const TODOS: Rol[] = ["tecnico", "admin", "propietario"];
const ADMINS: Rol[] = ["admin", "propietario"];
const PROPIETARIO: Rol[] = ["propietario"];

export const TEMAS: Tema[] = [
  {
    id: "nuevo-informe",
    titulo: "Crear un informe",
    claves: ["crear informe", "nuevo informe", "subir informe", "hacer informe", "registrar", "evaluacion", "informe nuevo", "como hago un informe"],
    roles: TODOS,
    respuesta:
      "Entra a \"Nuevo informe\" (menú superior). Completa nombre y ubicación del cliente, nombre, marca y modelo del equipo, N° de serie y horómetro. " +
      "Luego escribe la descripción (el \"Asistente de redacción\" te ayuda) y agrega fotos o videos. Presiona \"Enviar informe\": queda guardado a tu nombre.",
    enlace: { href: "/informes/nuevo", texto: "Ir a Nuevo informe" },
  },
  {
    id: "redactar",
    titulo: "Redactar la descripción",
    claves: ["redactar", "descripcion", "escribir", "texto", "que pongo", "que escribo", "ayuda informe", "sugerencia", "plantilla", "frases"],
    roles: TODOS,
    respuesta:
      "En \"Nuevo informe\" está el panel \"Asistente de redacción\": \"Usar plantilla\" pone las secciones (estado del equipo, trabajos, hallazgos y recomendaciones) " +
      "y con las frases de cada pestaña agregas textos comunes con un toque. Si pones el horómetro, te sugiere la próxima mantención. " +
      "También te avisa qué datos faltan. Si hay una IA conectada, aparece \"Redactar con IA\" o \"Mejorar con IA\".",
    enlace: { href: "/informes/nuevo", texto: "Abrir el formulario" },
  },
  {
    id: "fotos-videos",
    titulo: "Subir fotos o videos",
    claves: ["foto", "video", "imagen", "adjuntar", "subir archivo", "camara", "pesado"],
    roles: TODOS,
    respuesta:
      "En \"Nuevo informe\", en \"Fotos o videos\", elige uno o varios archivos (desde el celular puedes usar la cámara). " +
      "Cada archivo puede pesar hasta 50 MB; si un video es más pesado, grábalo más corto o en menor calidad.",
    enlace: { href: "/informes/nuevo", texto: "Ir a Nuevo informe" },
  },
  {
    id: "ver-informes",
    titulo: "Ver y buscar informes",
    claves: ["ver informe", "buscar", "mis informes", "lista", "encontrar", "filtrar", "historial"],
    roles: ["tecnico"],
    respuesta:
      "En \"Informes\" ves todos los informes que tú subiste. Puedes buscar por cliente, ubicación, equipo, marca, modelo o N° de serie. " +
      "Solo ves los tuyos; los de otros técnicos los revisan los administradores.",
    enlace: { href: "/informes", texto: "Ir a Informes" },
  },
  {
    id: "ver-informes-admin",
    titulo: "Ver y buscar informes",
    claves: ["ver informe", "buscar", "todos los informes", "lista", "encontrar", "filtrar", "historial", "por tecnico"],
    roles: ADMINS,
    respuesta:
      "En \"Informes\" ves los informes de todos los técnicos. Puedes buscar por cliente, ubicación, equipo, marca, modelo o N° de serie y filtrar por técnico con la lista desplegable.",
    enlace: { href: "/informes", texto: "Ir a Informes" },
  },
  {
    id: "imprimir",
    titulo: "Imprimir o guardar en PDF",
    claves: ["imprimir", "pdf", "descargar", "enviar al cliente", "guardar informe"],
    roles: TODOS,
    respuesta:
      "Abre el informe desde \"Informes\" y presiona \"Imprimir / Guardar PDF\". En la ventana de impresión elige \"Guardar como PDF\" para descargarlo.",
    enlace: { href: "/informes", texto: "Ir a Informes" },
  },
  {
    id: "corregir",
    titulo: "Corregir un informe enviado",
    claves: ["corregir", "editar", "modificar", "cambiar informe", "me equivoque", "error en informe", "borrar informe", "eliminar informe"],
    roles: ["tecnico"],
    respuesta:
      "Una vez enviado, el técnico no puede modificar ni borrar el informe (así queda un registro confiable). " +
      "Si te equivocaste, avisa a un administrador o al propietario.",
  },
  {
    id: "corregir-admin",
    titulo: "Corregir un informe enviado",
    claves: ["corregir", "editar", "modificar", "cambiar informe", "error en informe", "borrar informe", "eliminar informe"],
    roles: ADMINS,
    respuesta:
      "Los técnicos no pueden modificar sus informes una vez enviados. Solo el propietario tiene permiso para corregir o borrar informes en la base de datos; " +
      "si necesitas una corrección, pídesela al propietario.",
  },
  {
    id: "clave",
    titulo: "Cambiar mi contraseña",
    claves: ["cambiar contrasena", "cambiar clave", "nueva contrasena", "mi contrasena", "password"],
    roles: TODOS,
    respuesta: "Abre el menú del círculo con tu inicial (arriba a la derecha) → \"Mi cuenta\". Ahí puedes cambiar tu contraseña.",
    enlace: { href: "/cuenta", texto: "Ir a Mi cuenta" },
  },
  {
    id: "olvide",
    titulo: "Olvidé mi contraseña",
    claves: ["olvide", "no recuerdo", "recuperar", "perdi la contrasena", "no puedo entrar", "codigo de recuperacion"],
    roles: TODOS,
    respuesta:
      "En la pantalla de ingreso toca \"¿Olvidaste tu contraseña?\". Si guardaste tu código de recuperación, elige \"Tengo un código\" y crea una contraseña nueva. " +
      "Si no lo tienes, envía el pedido de ayuda: un administrador te dará un código que vale 24 horas. " +
      "Consejo: crea hoy tu código personal en \"Mi cuenta\" y guárdalo en un lugar seguro.",
    enlace: { href: "/cuenta", texto: "Crear mi código" },
  },
  {
    id: "cerrar-sesion",
    titulo: "Cerrar sesión",
    claves: ["cerrar sesion", "salir", "desconectar", "logout"],
    roles: TODOS,
    respuesta: "Abre el menú del círculo con tu inicial (arriba a la derecha) y elige \"Cerrar sesión\".",
  },
  {
    id: "niveles",
    titulo: "Qué puede hacer cada nivel",
    claves: ["nivel", "permiso", "rol", "que puedo hacer", "administrador", "propietario", "tecnico"],
    roles: TODOS,
    respuesta:
      "Técnico: crea informes y ve solo los suyos. Administrador: ve todos los informes y cuentas, confirma cuentas y ayuda con contraseñas de técnicos. " +
      "Propietario: todo lo anterior, además cambia niveles, quita o devuelve accesos y gestiona contraseñas de cualquiera.",
  },
  {
    id: "pedidos-clave",
    titulo: "Atender pedidos de contraseña",
    claves: ["pedido", "solicitud", "ayuda contrasena", "tecnico olvido", "generar codigo", "campana"],
    roles: ADMINS,
    respuesta:
      "Cuando alguien pide ayuda con su contraseña verás un aviso rojo arriba. Ve a Configuración → \"Pedidos de contraseña\", presiona \"Generar código\" " +
      "y entrégaselo por WhatsApp o teléfono. Vale 24 horas y sirve una vez. Los administradores atienden a técnicos; el propietario atiende a todos.",
    enlace: { href: "/configuracion#solicitudes", texto: "Ver pedidos" },
  },
  {
    id: "clave-otro",
    titulo: "Cambiar la contraseña de otra persona",
    claves: ["contrasena de otro", "clave de un tecnico", "resetear", "restablecer", "cambiar contrasena tecnico"],
    roles: ADMINS,
    respuesta:
      "En Configuración → \"Cuentas y permisos\" usa el botón de cambiar contraseña junto a la persona. La app sugiere una contraseña temporal para entregarle. " +
      "El administrador solo puede hacerlo con técnicos; el propietario, con cualquiera.",
    enlace: { href: "/configuracion#cuentas", texto: "Ir a Cuentas" },
  },
  {
    id: "invitar",
    titulo: "Agregar un técnico nuevo",
    claves: ["invitar", "agregar tecnico", "nuevo tecnico", "crear cuenta", "registrar tecnico", "cuenta nueva"],
    roles: ADMINS,
    respuesta:
      "En Configuración → \"Invitar técnicos\" copia la invitación o envíala por WhatsApp. La persona entra con ese enlace y queda como Técnico.",
    enlace: { href: "/configuracion#invitar", texto: "Ir a Invitar" },
  },
  {
    id: "crear-cuenta-tecnico",
    titulo: "Necesito una cuenta para otra persona",
    claves: ["invitar", "agregar", "companero", "crear cuenta", "cuenta nueva"],
    roles: ["tecnico"],
    respuesta: "Las cuentas nuevas las gestiona un administrador o el propietario. Pídeles que envíen la invitación a tu compañero.",
  },
  {
    id: "niveles-cambiar",
    titulo: "Cambiar el nivel o quitar el acceso a alguien",
    claves: ["cambiar nivel", "hacer administrador", "ascender", "quitar acceso", "bloquear", "devolver acceso", "desactivar"],
    roles: PROPIETARIO,
    respuesta:
      "En Configuración → \"Cuentas y permisos\" cambia el nivel con la lista desplegable. \"Quitar acceso\" impide que la persona entre, sin borrar sus informes; " +
      "puedes devolvérselo cuando quieras.",
    enlace: { href: "/configuracion#cuentas", texto: "Ir a Cuentas" },
  },
  {
    id: "espacio",
    titulo: "Espacio de almacenamiento",
    claves: ["espacio", "almacenamiento", "fotos ocupan", "capacidad", "supabase"],
    roles: PROPIETARIO,
    respuesta: "En Configuración → \"Espacio de almacenamiento\" ves cuánto espacio usan los informes y fotos y cuánto queda.",
    enlace: { href: "/configuracion#espacio", texto: "Ver espacio" },
  },
  {
    id: "ia",
    titulo: "Conectar una inteligencia artificial",
    claves: ["ia", "inteligencia artificial", "claude", "chatgpt", "openai", "conectar", "api"],
    roles: PROPIETARIO,
    respuesta:
      "En Configuración → \"Asistente con IA\" ves si hay una IA conectada y los pasos para conectar Claude o ChatGPT. " +
      "La clave se guarda como variable secreta en Vercel, nunca dentro de la app.",
    enlace: { href: "/configuracion#asistente-ia", texto: "Ir a Asistente con IA" },
  },
  {
    id: "privacidad",
    titulo: "¿Alguien ve mis conversaciones?",
    claves: ["privado", "privacidad", "conversacion", "quien ve", "guarda", "historial del chat"],
    roles: TODOS,
    respuesta:
      "No. Tus conversaciones con el asistente se guardan solo en este dispositivo y nadie más puede verlas, ni administradores ni el propietario. " +
      "Puedes borrarlas con \"Borrar conversación\".",
  },
];

// Quita tildes y pasa a minúsculas para comparar
export function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,;:]/g, " ");
}

export function temasPara(rol: Rol) {
  return TEMAS.filter((t) => t.roles.includes(rol));
}

// Busca el tema que mejor coincide con la pregunta (o null)
export function buscarTema(pregunta: string, rol: Rol): Tema | null {
  const q = normalizar(pregunta);
  const palabras = q.split(/\s+/).filter((p) => p.length > 2);
  let mejor: { tema: Tema; puntos: number } | null = null;
  for (const tema of temasPara(rol)) {
    let puntos = 0;
    for (const clave of tema.claves) {
      const c = normalizar(clave);
      if (q.includes(c)) puntos += 3 + c.split(" ").length;
      else {
        const partes = c.split(" ").filter((p) => p.length > 2);
        puntos += partes.filter((p) => palabras.some((w) => w.startsWith(p.slice(0, 5)))).length;
      }
    }
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { tema, puntos };
  }
  return mejor && mejor.puntos >= 2 ? mejor.tema : null;
}

// Tema que existe pero no corresponde al nivel de la persona
export function temaRestringido(pregunta: string, rol: Rol): boolean {
  const otros = (["tecnico", "admin", "propietario"] as Rol[]).filter((r) => r !== rol);
  const propio = buscarTema(pregunta, rol);
  if (propio) return false;
  return otros.some((r) => buscarTema(pregunta, r) && !temasPara(rol).includes(buscarTema(pregunta, r)!));
}

// Resumen de la guía según el nivel (se entrega a la IA como contexto)
export function guiaComoTexto(rol: Rol) {
  return temasPara(rol)
    .map((t) => `- ${t.titulo}: ${t.respuesta}`)
    .join("\n");
}
