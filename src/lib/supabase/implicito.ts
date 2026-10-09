import { createClient as crearClienteSupabase } from "@supabase/supabase-js";

// Cliente solo para recuperar contraseña. Usa el flujo "implicit": el enlace del correo trae
// la sesión en la URL, así funciona aunque se abra en otro navegador o en el celular
// (el flujo normal exige abrirlo en el mismo navegador donde se pidió).
export function crearClienteRecuperacion() {
  return crearClienteSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storageKey: "recuperacion-clave",
      },
    }
  );
}
