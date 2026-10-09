import { redirect } from "next/navigation";

// La gestión de cuentas ahora está en Configuración
export default function PaginaTecnicos() {
  redirect("/configuracion");
}
