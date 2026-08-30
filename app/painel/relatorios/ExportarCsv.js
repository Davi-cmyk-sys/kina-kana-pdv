"use client";

function paraCelulaCsv(valor) {
  const texto = String(valor ?? "");
  if (texto.includes(";") || texto.includes('"') || texto.includes("\n")) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export default function ExportarCsv({ linhas, de, ate }) {
  function exportar() {
    const cabecalho = [
      "Senha",
      "Data",
      "Hora",
      "Subtotal",
      "Desconto",
      "Total",
      "Forma de pagamento",
      "Itens",
    ];

    const corpo = linhas.map((l) =>
      [
        l.numeroSenha,
        l.data,
        l.hora,
        l.subtotal.toFixed(2).replace(".", ","),
        l.desconto.toFixed(2).replace(".", ","),
        l.total.toFixed(2).replace(".", ","),
        l.formas,
        l.itens,
      ]
        .map(paraCelulaCsv)
        .join(";")
    );

    const csv = "﻿" + [cabecalho.join(";"), ...corpo].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `pedidos-${de}-a-${ate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={linhas.length === 0}
      className="rounded-lg border border-[#1f6f3e] px-4 py-2 text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee] disabled:cursor-not-allowed disabled:opacity-50"
    >
      Exportar CSV do período ({linhas.length} pedido
      {linhas.length !== 1 ? "s" : ""})
    </button>
  );
}
