import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

// Devuelve el cliente Supabase y el perfil del usuario conectado (o redirige a /login)
export async function obtenerSesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, correo, rol")
    .eq("id", user.id)
    .single<Perfil>();

  return { supabase, user, perfil };
}
