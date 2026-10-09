import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieParaGuardar = { name: string; value: string; options: CookieOptions };
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_RECORDAR, ajustarOpciones, quiereRecordar } from "@/lib/recordar";

const RUTAS_PUBLICAS = ["/login", "/auth", "/recuperar"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieParaGuardar[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          const recordar = quiereRecordar(request.cookies.get(COOKIE_RECORDAR)?.value);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, ajustarOpciones(options, recordar))
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esPublica = RUTAS_PUBLICAS.some((r) => request.nextUrl.pathname.startsWith(r));

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
