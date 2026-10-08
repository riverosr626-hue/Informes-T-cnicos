import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe el enlace de confirmación del correo y abre la sesión
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/informes`);
}
