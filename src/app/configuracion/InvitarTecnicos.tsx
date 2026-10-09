"use client";

import { useEffect, useState } from "react";

// Enlace para que un técnico nuevo cree su cuenta, con mensaje listo para WhatsApp
export default function InvitarTecnicos() {
  const [origen, setOrigen] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setOrigen(window.location.origin), []);

  const enlace = `${origen}/login`;
  const mensaje =
    `Hola, te invito a la app de Informes Técnicos de LE Energy.\n` +
    `1. Entra a ${enlace}\n` +
    `2. Elige "Crear cuenta" y regístrate con tu nombre completo y tu correo.\n` +
    `3. Una vez dentro, ve a "Mi cuenta" y guarda tu código de recuperación.`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="tarjeta space-y-3">
      <p className="text-sm text-gray-600">
        Envía este enlace a los técnicos nuevos. Al registrarse quedan como <strong>Técnico</strong>; si alguien debe
        ser administrador, el propietario le cambia el nivel en &quot;Cuentas y permisos&quot;.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-gray-100 px-3 py-2 text-sm">{enlace || "…"}</code>
        <button type="button" className="boton" onClick={copiar}>
          {copiado ? "Mensaje copiado ✓" : "Copiar invitación"}
        </button>
        <a
          className="boton-sec"
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
