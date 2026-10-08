"use client";

export default function BotonImprimir() {
  return (
    <button onClick={() => window.print()} className="boton-sec">
      Imprimir / Guardar PDF
    </button>
  );
}
