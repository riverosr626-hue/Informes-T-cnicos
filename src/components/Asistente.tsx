"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buscarTema, temaRestringido, temasPara } from "@/lib/asistente/guia";
import type { Rol } from "@/lib/tipos";

type Mensaje = { de: "persona" | "asistente"; texto: string; enlace?: { href: string; texto: string }; aviso?: string };

const SALUDO = (nombre: string): Mensaje => ({
  de: "asistente",
  texto: `Hola${nombre ? `, ${nombre}` : ""}. Soy el asistente de la app. Te ayudo a usarla y a redactar informes. ¿Qué necesitas?`,
});

// Asistente flotante disponible en todas las páginas con sesión.
// La conversación se guarda solo en este dispositivo: nadie más puede verla.
export default function Asistente({ usuarioId, nombre, rol }: { usuarioId: string; nombre: string; rol: Rol }) {
  const ruta = usePathname();
  const clave = `asistente:${usuarioId}`;
  const primerNombre = nombre.split(" ")[0] ?? "";
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO(primerNombre)]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [ia, setIa] = useState<{ ia: boolean; proveedor: string | null } | null>(null);
  const fondo = useRef<HTMLDivElement>(null);

  // Recupera la conversación guardada en este dispositivo
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado) {
        const lista = JSON.parse(guardado) as Mensaje[];
        if (Array.isArray(lista) && lista.length) setMensajes(lista.slice(-40));
      }
    } catch {
      /* sin almacenamiento: se usa solo en memoria */
    }
  }, [clave]);

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify(mensajes.slice(-40)));
    } catch {
      /* ignorar */
    }
    fondo.current?.scrollIntoView({ block: "end" });
  }, [mensajes, clave]);

  // ¿Hay una IA conectada? Se consulta al abrir por primera vez
  useEffect(() => {
    if (!abierto || ia) return;
    fetch("/api/asistente")
      .then((r) => (r.ok ? r.json() : { ia: false, proveedor: null }))
      .then(setIa)
      .catch(() => setIa({ ia: false, proveedor: null }));
  }, [abierto, ia]);

  function respuestaPorReglas(pregunta: string): Mensaje {
    const tema = buscarTema(pregunta, rol);
    if (tema) return { de: "asistente", texto: tema.respuesta, enlace: tema.enlace };
    if (temaRestringido(pregunta, rol)) {
      return {
        de: "asistente",
        texto:
          rol === "tecnico"
            ? "Eso lo gestiona un administrador o el propietario. Pídeles ayuda y ellos lo harán desde Configuración."
            : "Eso solo lo puede hacer el propietario. Pídeselo directamente.",
      };
    }
    return {
      de: "asistente",
      texto: "No encontré una respuesta para eso. Prueba con uno de estos temas o escríbelo con otras palabras:",
    };
  }

  function datosDelFormulario(): Record<string, string> | undefined {
    const form = document.getElementById("formulario-informe") as HTMLFormElement | null;
    if (!form) return undefined;
    const datos: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      if (k !== "fotos" && typeof v === "string" && v.trim()) datos[k] = v;
    });
    return datos;
  }

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || pensando) return;
    const conPregunta: Mensaje[] = [...mensajes, { de: "persona", texto: limpia }];
    setMensajes(conPregunta);
    setTexto("");

    if (ia?.ia) {
      setPensando(true);
      try {
        const r = await fetch("/api/asistente", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mensajes: conPregunta.slice(1).map((m) => ({ de: m.de, texto: m.texto })),
            formulario: datosDelFormulario(),
          }),
        });
        const d = (await r.json()) as { texto?: string; error?: string };
        if (r.ok && d.texto) {
          setMensajes((m) => [...m, { de: "asistente", texto: d.texto! }]);
        } else {
          setMensajes((m) => [...m, { ...respuestaPorReglas(limpia), aviso: `${d.error ?? "La IA no respondió"} Te respondo con la guía básica.` }]);
        }
      } catch {
        setMensajes((m) => [...m, { ...respuestaPorReglas(limpia), aviso: "Sin conexión con la IA. Te respondo con la guía básica." }]);
      } finally {
        setPensando(false);
      }
      return;
    }

    setMensajes((m) => [...m, respuestaPorReglas(limpia)]);
  }

  function borrar() {
    setMensajes([SALUDO(primerNombre)]);
    try {
      localStorage.removeItem(clave);
    } catch {
      /* ignorar */
    }
  }

  const temas = temasPara(rol);
  const ultimo = mensajes[mensajes.length - 1];
  const mostrarTemas = mensajes.length === 1 || (ultimo?.de === "asistente" && ultimo.texto.startsWith("No encontré"));
  const enFormulario = ruta === "/informes/nuevo";

  return (
    <div className="no-imprimir">
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-marca-500 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-marca-600"
          aria-label="Abrir asistente"
        >
          <span aria-hidden>💬</span> Asistente
        </button>
      )}

      {abierto && (
        <div className="fixed inset-x-2 bottom-2 z-40 flex max-h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
          <div className="flex items-center justify-between bg-grafito px-4 py-3 text-white">
            <div>
              <div className="font-semibold">Asistente</div>
              <div className="text-xs text-gray-300">
                {ia === null ? "…" : ia.ia ? `Con IA · ${ia.proveedor}` : "Guía básica (sin IA)"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={borrar} className="rounded px-2 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white">
                Borrar conversación
              </button>
              <button type="button" onClick={() => setAbierto(false)} className="rounded px-2 py-1 text-lg leading-none hover:bg-white/10" aria-label="Cerrar asistente">
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-fondo p-3 text-sm">
            {mensajes.map((m, i) => (
              <div key={i} className={m.de === "persona" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
                    m.de === "persona" ? "bg-marca-500 text-white" : "border border-gray-200 bg-white text-grafito"
                  }`}
                >
                  {m.aviso && <p className="mb-1 text-xs text-amber-700">{m.aviso}</p>}
                  {m.texto}
                  {m.enlace && (
                    <Link href={m.enlace.href} onClick={() => setAbierto(false)} className="mt-2 block font-semibold text-marca-700 underline">
                      {m.enlace.texto} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {pensando && <p className="text-xs text-gray-500">Pensando…</p>}
            {mostrarTemas && (
              <div className="flex flex-wrap gap-1.5">
                {temas.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => enviar(t.titulo)}
                    className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-marca-500 hover:text-marca-700"
                  >
                    {t.titulo}
                  </button>
                ))}
              </div>
            )}
            <div ref={fondo} />
          </div>

          {enFormulario && !ia?.ia && (
            <p className="border-t border-gray-100 bg-marca-50 px-3 py-1.5 text-xs text-marca-800">
              Para redactar este informe usa el panel &quot;Asistente de redacción&quot; dentro del formulario.
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex gap-2 border-t border-gray-200 p-2"
          >
            <input
              className="campo"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={ia?.ia && enFormulario ? "Ej: ayúdame a redactar la descripción" : "Escribe tu pregunta…"}
              maxLength={1000}
            />
            <button className="boton" disabled={pensando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
