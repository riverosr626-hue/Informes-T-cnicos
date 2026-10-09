import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieParaGuardar = { name: string; value: string; options: CookieOptions };
import { cookies } from "next/headers";
import { COOKIE_RECORDAR, ajustarOpciones, quiereRecordar } from "@/lib/recordar";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieParaGuardar[]) {
          try {
            const recordar = quiereRecordar(cookieStore.get(COOKIE_RECORDAR)?.value);
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, ajustarOpciones(options, recordar))
            );
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    }
  );
}
