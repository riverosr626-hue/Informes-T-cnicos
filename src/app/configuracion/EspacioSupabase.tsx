// Límites del plan gratuito de Supabase. Si se cambia de plan, actualizar aquí.
const LIMITE_BASE_DATOS = 500 * 1024 * 1024; // 500 MB
const LIMITE_ARCHIVOS = 1024 * 1024 * 1024; // 1 GB

export type UsoEspacio = {
  base_datos_bytes: number;
  archivos_bytes: number;
  total_archivos: number;
  total_informes: number;
  total_cuentas: number;
};

function formatoTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("es-CL", { maximumFractionDigits: 0 })} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 2 })} GB`;
}

function Medidor({ titulo, detalle, usado, limite }: { titulo: string; detalle: string; usado: number; limite: number }) {
  const porcentaje = Math.min(100, (usado / limite) * 100);
  const libre = Math.max(0, limite - usado);
  const color = porcentaje >= 90 ? "bg-red-500" : porcentaje >= 70 ? "bg-amber-500" : "bg-marca-500";
  return (
    <div className="tarjeta space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{titulo}</h3>
        <span className="text-sm text-gray-500">
          {porcentaje.toLocaleString("es-CL", { maximumFractionDigits: 1 })}% usado
        </span>
      </div>
      <p className="text-sm text-gray-500">{detalle}</p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(porcentaje, 0.5)}%` }} />
      </div>
      <div className="flex justify-between text-sm">
        <span>
          Usado: <strong>{formatoTamano(usado)}</strong> de {formatoTamano(limite)}
        </span>
        <span>
          Libre: <strong>{formatoTamano(libre)}</strong>
        </span>
      </div>
    </div>
  );
}

export default function EspacioSupabase({ uso }: { uso: UsoEspacio }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Medidor
          titulo="Base de datos"
          detalle={`Cuentas, correos, informes y registros · ${uso.total_cuentas} cuentas, ${uso.total_informes} informes`}
          usado={Number(uso.base_datos_bytes)}
          limite={LIMITE_BASE_DATOS}
        />
        <Medidor
          titulo="Fotos y archivos"
          detalle={`Fotos y documentos subidos · ${uso.total_archivos} archivos`}
          usado={Number(uso.archivos_bytes)}
          limite={LIMITE_ARCHIVOS}
        />
      </div>
      <p className="text-xs text-gray-500">
        Límites del plan gratuito de Supabase (500 MB de base de datos y 1 GB de archivos). La base de datos parte con
        unos 10 MB ocupados por la estructura interna de Supabase.
      </p>
    </div>
  );
}
