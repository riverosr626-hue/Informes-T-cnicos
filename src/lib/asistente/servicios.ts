// IAs que cualquier usuario puede conectar desde el botón "Conectar IA".
// Solo se permiten estos servicios (el servidor no llama a direcciones inventadas).

export type Servicio = {
  id: string;
  nombre: string;
  tipo: "anthropic" | "openai";
  url: string;
  modelo: string;
  dondeClave: string;
};

export const SERVICIOS: Servicio[] = [
  { id: "claude", nombre: "Claude (Anthropic)", tipo: "anthropic", url: "https://api.anthropic.com/v1/messages", modelo: "claude-haiku-5-5", dondeClave: "https://console.anthropic.com/settings/keys" },
  { id: "chatgpt", nombre: "ChatGPT (OpenAI)", tipo: "openai", url: "https://api.openai.com/v1/chat/completions", modelo: "gpt-4o-mini", dondeClave: "https://platform.openai.com/api-keys" },
  { id: "gemini", nombre: "Gemini (Google)", tipo: "openai", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", modelo: "gemini-2.5-flash", dondeClave: "https://aistudio.google.com/apikey" },
  { id: "deepseek", nombre: "DeepSeek", tipo: "openai", url: "https://api.deepseek.com/v1/chat/completions", modelo: "deepseek-chat", dondeClave: "https://platform.deepseek.com/api_keys" },
  { id: "openrouter", nombre: "OpenRouter (varias IAs)", tipo: "openai", url: "https://openrouter.ai/api/v1/chat/completions", modelo: "openrouter/auto", dondeClave: "https://openrouter.ai/keys" },
  { id: "groq", nombre: "Groq", tipo: "openai", url: "https://api.groq.com/openai/v1/chat/completions", modelo: "llama-3.3-70b-versatile", dondeClave: "https://console.groq.com/keys" },
];

export const servicioPorId = (id: string | undefined) => SERVICIOS.find((s) => s.id === id);

// Conexión personal: se guarda solo en este dispositivo (navegador)
export type ConexionPersonal = { servicio: string; clave: string; modelo?: string };

const llave = (usuarioId: string) => `asistente-ia:${usuarioId}`;

export function leerConexion(usuarioId: string): ConexionPersonal | null {
  try {
    const t = localStorage.getItem(llave(usuarioId));
    if (!t) return null;
    const c = JSON.parse(t) as ConexionPersonal;
    return c && servicioPorId(c.servicio) && c.clave ? c : null;
  } catch {
    return null;
  }
}

export function guardarConexion(usuarioId: string, c: ConexionPersonal) {
  try {
    localStorage.setItem(llave(usuarioId), JSON.stringify(c));
  } catch {
    /* sin almacenamiento */
  }
  window.dispatchEvent(new Event("asistente-ia"));
}

export function borrarConexion(usuarioId: string) {
  try {
    localStorage.removeItem(llave(usuarioId));
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event("asistente-ia"));
}
