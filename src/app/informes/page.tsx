"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import Encabezado from "@/components/Encabezado";
import { db, llamarApi } from "@/lib/firebase";
import { Protegida, useSesion } from "@/lib/sesion";
import { colorEstado, formatoFecha, normalizar, type Informe, type Perfil } from "@/lib/tipos";

const MAXIMO = 200;

function Contenido() {
  const { usuario, perfil } = useSesion();
  const parametros = useSearchParams();
  const tecnico = parametros.get("tecnico") ?? "";
  const q = parametros.get("q") ?? "";
  const esAdmin = perfil?.rol === "admin";

  const [informes, setInformes] = useState<Informe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tecnicos, setTecnicos] = useState<Perfil[]>([]);
  const [tieneCodigo, setTieneCodigo] = useState<boolean | null>(null);

  useEffect(() => {
    if (!usuario) return;
    const col = collection(db(), "informes");
    // Sin orderBy en las consultas filtradas para no necesitar índices compuestos: se ordena aquí
    const consulta = esAdmin
      ? tecnico
        ? query(col, where("tecnico_id", "==", tecnico))
        : query(col, orderBy("creado_en", "desc"), limit(MAXIMO))
      : query(col, where("tecnico_id", "==", usuario.uid));

    setInformes(null);
    setError(null);
    getDocs(consulta)
      .then((snap) => {
        const lista = snap.docs.map((d) => d.data() as Informe);
        lista.sort((a, b) => b.creado_en.localeCompare(a.creado_en));
        setInformes(lista.slice(0, MAXIMO));
      })
      .catch((e) => {
        console.error(e);
        setError("No se pudieron cargar los informes.");
      });
  }, [usuario, esAdmin, tecnico]);

  useEffect(() => {
    if (!esAdmin) return;
    getDocs(collection(db(), "perfiles"))
      .then((snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Perfil, "id">) }));
        lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setTecnicos(lista);
      })
      .catch(() => setTecnicos([]));
  }, [esAdmin]);

  useEffect(() => {
    llamarApi<{ tiene: boolean }>("/api/recuperacion")
      .then((r) => setTieneCodigo(r.tiene))
      .catch(() => setTieneCodigo(null));
  }, []);

  const visibles = useMemo(() => {
    const busqueda = normalizar(q.trim());
    if (!informes || !busqueda) return informes;
    return informes.filter((i) =>
      [i.cliente, i.ubicacion, i.numero_serie].some((v) => normalizar(v).includes(busqueda))
    );
  }, [informes, q]);

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {tieneCodigo === false && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <span>
              🔑 <strong>Crea tu código de recuperación</strong>: si olvidas tu contraseña, podrás recuperarla tú mismo.
            </span>
            <Link href="/cuenta" className="boton">Crear código</Link>
          </div>
        )}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{esAdmin ? "Todos los informes" : "Mis informes"}</h1>
            <p className="text-sm text-gray-500">
              {visibles?.length ?? 0} informe{visibles?.length === 1 ? "" : "s"}
              {esAdmin && " · vista de administrador"}
            </p>
          </div>
          <Link href="/informes/nuevo" className="boton">+ Nuevo informe</Link>
        </div>

        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar cliente, ubicación o N° de serie" className="campo max-w-xs" />
          {esAdmin && (
            <select name="tecnico" defaultValue={tecnico} className="campo max-w-xs">
              <option value="">Todos los técnicos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.correo})</option>
              ))}
            </select>
          )}
          <button className="boton-sec">Filtrar</button>
          {(q || tecnico) && <Link href="/informes" className="boton-sec">Limpiar</Link>}
        </form>

        {error && <p className="tarjeta text-red-700">{error}</p>}
        {!error && !visibles && <p className="tarjeta text-center text-gray-500">Cargando informes…</p>}

        {visibles && visibles.length === 0 && (
          <div className="tarjeta text-center text-gray-500">
            {q || tecnico ? (
              "Ningún informe coincide con la búsqueda."
            ) : (
              <>Aún no hay informes. <Link href="/informes/nuevo" className="font-medium text-amber-700 underline">Crea el primero</Link>.</>
            )}
          </div>
        )}

        {visibles && visibles.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">N°</th>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Cliente / Ubicación</th>
                  <th className="px-4 py-2.5">Equipo</th>
                  {esAdmin && <th className="px-4 py-2.5">Técnico</th>}
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Subido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map((i) => (
                  <tr key={i.id} className="hover:bg-amber-50/50">
                    <td className="px-4 py-2.5 font-mono">
                      <Link href={`/informes/${i.id}`} className="text-amber-700 underline">#{i.id}</Link>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{i.fecha_evaluacion}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{i.cliente}</div>
                      <div className="text-xs text-gray-500">{i.ubicacion}</div>
                    </td>
                    <td className="px-4 py-2.5">{[i.marca, i.modelo].filter(Boolean).join(" ") || "—"}</td>
                    {esAdmin && <td className="px-4 py-2.5">{i.tecnico_nombre || "—"}</td>}
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorEstado(i.estado_general)}`}>
                        {i.estado_general}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{formatoFecha(i.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function ListaInformes() {
  return (
    <Protegida>
      <Suspense fallback={null}>
        <Contenido />
      </Suspense>
    </Protegida>
  );
}
