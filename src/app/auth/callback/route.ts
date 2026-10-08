import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe los enlaces que llegan por correo (confirmar cuenta / recuperar contraseña)
// y abre la sesión. `next` indica a qué página ir después.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destino = next && next.startsWith("/") && !next.startsWith("//") ? next : "/informes";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=enlace`);
    }
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
