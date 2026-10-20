// Estado de la IA del asistente y pasos para conectarla (solo propietario).
// La clave nunca pasa por la app: se guarda como variable secreta en Vercel.
export default function AsistenteIA({ conectada, proveedor, modelo }: { conectada: boolean; proveedor: string | null; modelo: string | null }) {
  return (
    <div className="tarjeta space-y-4">
      {conectada ? (
        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">
          ✅ IA conectada: <strong>{proveedor}</strong>
          {modelo && <> · modelo <code>{modelo}</code></>}. El asistente conversa y redacta con IA para todos los usuarios.
        </p>
      ) : (
        <p className="rounded bg-gray-50 p-3 text-sm text-gray-700">
          Ahora el asistente funciona con <strong>reglas</strong> (gratis): guía de uso y sugerencias de redacción en el formulario.
          Si conectas una IA, además podrá conversar y redactar con más detalle.
        </p>
      )}

      <p className="rounded border border-marca-200 bg-marca-50 p-3 text-sm text-marca-800">
        <strong>Conexión personal (la más fácil):</strong> cualquier usuario, incluidos los técnicos, puede tocar &quot;✨ Conectar IA&quot; en el asistente,
        elegir Claude, ChatGPT, Gemini u otro, y pegar su propia clave. Queda guardada solo en su dispositivo.
      </p>

      <div className="text-sm text-gray-700">
        <h3 className="mb-2 font-semibold">{conectada ? "IA para toda la empresa: cambiar o quitar" : "IA para toda la empresa (opcional)"}</h3>
        <p className="mb-2 text-xs text-gray-500">Con esto todos usan la IA sin poner su propia clave; el costo va a la cuenta de la empresa.</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Consigue una clave de API: <strong>Claude</strong> en{" "}
            <a className="text-marca-700 underline" href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>{" "}
            o <strong>ChatGPT</strong> en{" "}
            <a className="text-marca-700 underline" href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a>.
            Se cobra por uso; con pocos usuarios suele ser muy poco al mes.
          </li>
          <li>
            Entra a <a className="text-marca-700 underline" href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">Vercel</a> → proyecto de esta app →
            <strong> Settings → Environment Variables</strong>.
          </li>
          <li>
            Agrega <code>IA_PROVEEDOR</code> con el valor <code>anthropic</code> (Claude) u <code>openai</code> (ChatGPT), y <code>IA_CLAVE</code> con tu clave.
            Opcional: <code>IA_MODELO</code> para elegir un modelo distinto.
          </li>
          <li>Vuelve a publicar la app (Deployments → Redeploy) para que tome la clave.</li>
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          La clave queda solo en el servidor: nadie puede verla desde la app. Las conversaciones no se guardan en el servidor; cada persona las ve solo en su
          dispositivo, ni siquiera el propietario puede leerlas. La IA no tiene acceso a la base de datos: solo responde con lo que la persona le escribe.
        </p>
      </div>
    </div>
  );
}
