"use client";

import { useState } from "react";
import { formatarRecibo, imprimirLinhas } from "@/lib/impressora";

export default function ImprimirPedidoBotao({ recibo }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function imprimir() {
    setErro(null);
    setCarregando(true);
    try {
      await imprimirLinhas(formatarRecibo(recibo));
    } catch (err) {
      setErro(err?.message ?? String(err));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mt-1 text-right">
      <button
        type="button"
        disabled={carregando}
        onClick={imprimir}
        className="text-xs font-medium text-[#1f6f3e] hover:underline disabled:opacity-50"
      >
        {carregando ? "Imprimindo..." : "🖨️ Imprimir"}
      </button>
      {erro && <p className="mt-1 max-w-[160px] text-[10px] text-[#b3432f]">{erro}</p>}
    </div>
  );
}
