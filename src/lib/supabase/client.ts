import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import { COOKIE_RECORDAR, ajustarOpciones, quiereRecordar } from "@/lib/recordar";

function leerCookies() {
  if (typeof document === "undefined" || !document.cookie) return [];
  return document.cookie.split("; ").map((par) => {
    const i = par.indexOf("=");
    const name = i === -1 ? par : par.slice(0, i);
    const raw = i === -1 ? "" : par.slice(i + 1);
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // valor sin codificar: se usa tal cual
    }
    return { name, value };
  });
}

function escribirCookie(name: string, value: string, o: CookieOptions) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`;
  if (o.maxAge !== undefined) c += `; Max-Age=${o.maxAge}`;
  if (o.domain) c += `; Domain=${o.domain}`;
  const sameSite = o.sameSite === true ? "Strict" : o.sameSite || "Lax";
  c += `; SameSite=${typeof sameSite === "string" ? sameSite.charAt(0).toUpperCase() + sameSite.slice(1) : "Lax"}`;
  if (o.secure || location.protocol === "https:") c += "; Secure";
  document.cookie = c;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return leerCookies();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // La preferencia se lee al momento de guardar, no al crear el cliente
          const recordar = quiereRecordar(
            leerCookies().find((c) => c.name === COOKIE_RECORDAR)?.value
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            escribirCookie(name, value, ajustarOpciones(options, recordar))
          );
        },
      },
    }
  );
}
