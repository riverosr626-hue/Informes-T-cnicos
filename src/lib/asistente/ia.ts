// Conexión opcional con una IA externa (Claude u otra compatible con OpenAI).
// La clave vive SOLO en las variables de entorno del servidor (Vercel), nunca en el navegador
// ni en la base de datos.
//
// Variables (Vercel → Settings → Environment Variables):
//   IA_PROVEEDOR = "anthropic" (Claude) | "openai" (ChatGPT u otra compatible)
//   IA_CLAVE     = la clave de API del proveedor
//   IA_MODELO    = (opcional) modelo a usar
//   IA_URL       = (opcional, solo "openai") dirección de una API compatible
// También sirven ANTHROPIC_API_KEY u OPENAI_API_KEY en vez de IA_CLAVE.

export type Proveedor = "anthropic" | "openai";

export type ConfigIA = {
  proveedor: Proveedor;
  clave: string;
  modelo: string;
  url: string;
};

const MODELO_POR_DEFECTO: Record<Proveedor, string> = {
  anthropic: "claude-haiku-5-5",
  openai: "gpt-4o-mini",
};

export const NOMBRE_PROVEEDOR: Record<Proveedor, string> = {
  anthropic: "Claude (Anthropic)",
  openai: "ChatGPT / compatible con OpenAI",
};

export function configIA(): ConfigIA | null {
  const pedido = (process.env.IA_PROVEEDOR ?? "").toLowerCase().trim();
  let proveedor: Proveedor | null =
    pedido === "anthropic" || pedido === "claude" ? "anthropic" : pedido === "openai" || pedido === "chatgpt" ? "openai" : null;

  let clave = process.env.IA_CLAVE?.trim() ?? "";
  if (!clave && (proveedor === "anthropic" || !proveedor) && process.env.ANTHROPIC_API_KEY) {
    clave = process.env.ANTHROPIC_API_KEY.trim();
    proveedor = "anthropic";
  }
  if (!clave && (proveedor === "openai" || !proveedor) && process.env.OPENAI_API_KEY) {
    clave = process.env.OPENAI_API_KEY.trim();
    proveedor = "openai";
  }
  if (!clave) return null;
  if (!proveedor) proveedor = clave.startsWith("sk-ant-") ? "anthropic" : "openai";

  const url =
    proveedor === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : `${(process.env.IA_URL?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`;

  return { proveedor, clave, modelo: process.env.IA_MODELO?.trim() || MODELO_POR_DEFECTO[proveedor], url };
}

export type MensajeIA = { role: "user" | "assistant"; content: string };

export async function preguntarIA(cfg: ConfigIA, sistema: string, mensajes: MensajeIA[]): Promise<string> {
  const control = new AbortController();
  const tiempo = setTimeout(() => control.abort(), 30000);
  try {
    if (cfg.proveedor === "anthropic") {
      const r = await fetch(cfg.url, {
        method: "POST",
        signal: control.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": cfg.clave,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: cfg.modelo, max_tokens: 900, system: sistema, messages: mensajes }),
      });
      if (!r.ok) throw new Error(await describirError(r));
      const d = (await r.json()) as { content?: { type: string; text?: string }[] };
      return (d.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
    }

    const r = await fetch(cfg.url, {
      method: "POST",
      signal: control.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.clave}` },
      body: JSON.stringify({
        model: cfg.modelo,
        max_tokens: 900,
        messages: [{ role: "system", content: sistema }, ...mensajes],
      }),
    });
    if (!r.ok) throw new Error(await describirError(r));
    const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return (d.choices?.[0]?.message?.content ?? "").trim();
  } finally {
    clearTimeout(tiempo);
  }
}

async function describirError(r: Response) {
  if (r.status === 401 || r.status === 403) return "La clave de la IA no es válida o no tiene permisos.";
  if (r.status === 429) return "La IA está recibiendo demasiadas consultas o se agotó el saldo de la cuenta.";
  if (r.status === 404) return "El modelo configurado no existe para este proveedor.";
  return `La IA respondió con un error (${r.status}).`;
}
