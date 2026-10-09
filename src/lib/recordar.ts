import type { CookieOptions } from "@supabase/ssr";

// Preferencia "Mantener sesión iniciada", guardada en este dispositivo.
// "1" (o sin valor) = recordar; "0" = cerrar sesión al cerrar el navegador.
export const COOKIE_RECORDAR = "le_recordar";

// 400 días: el máximo que permiten los navegadores para una cookie
export const DURACION_RECORDAR = 400 * 24 * 60 * 60;

export function quiereRecordar(valor: string | undefined | null) {
  return valor !== "0";
}

// Ajusta las opciones de las cookies de sesión de Supabase según la preferencia.
// Si no se recuerda, la cookie pasa a ser "de sesión" (se borra al cerrar el navegador).
export function ajustarOpciones(options: CookieOptions | undefined, recordar: boolean): CookieOptions {
  const o: CookieOptions = { ...(options ?? {}) };
  // maxAge 0 significa "borrar la cookie" (al salir): se respeta tal cual
  if (o.maxAge === 0) return o;
  if (recordar) {
    o.maxAge = DURACION_RECORDAR;
    delete o.expires;
  } else {
    delete o.maxAge;
    delete o.expires;
  }
  return o;
}

// Guarda la preferencia en el navegador (se llama desde la pantalla de inicio de sesión)
export function guardarPreferenciaRecordar(recordar: boolean) {
  const seguro = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_RECORDAR}=${recordar ? "1" : "0"}; Path=/; Max-Age=${DURACION_RECORDAR}; SameSite=Lax${seguro}`;
}
