import type { Metadata } from "next";
import { ProveedorSesion } from "@/lib/sesion";
import "./globals.css";

export const metadata: Metadata = {
  title: "Informes de Generadores",
  description: "Registro de evaluaciones técnicas de grupos electrógenos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}
