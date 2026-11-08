"use client";

import { useState, useTransition } from "react";
import { criarSolicitacaoCompra } from "./actions";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

const UNIDADES = ["un", "kg", "g", "l", "ml", "pacote", "caixa", "saco"];

function linhaVazia() {
  return { chave: `${Date.now()}-${Math.random()}`, nome: "", quantidade: "", unidade: "un" };
}

export default function SolicitarCompras({ sugestoes }) {
  const [linhas, setLinhas] = useState([linhaVazia()]);
  const [observacao, setObservacao] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [pending, startTransition] = useTransition();

  function atualizarLinha(chave, campo, valor) {
    setLinhas((atual) =>
      atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l))
    );
  }

  function adicionarLinha() {
    setLinhas((atual) => [...atual, linhaVazia()]);
  }

  function removerLinha(chave) {
    setLinhas((atual) =>
      atual.length > 1 ? atual.filter((l) => l.chave !== chave) : atual
    );
  }

  function enviar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await criarSolicitacaoCompra({ itens: linhas, observacao });
      if (resultado?.erro) {
        setMensagem({ tipo: "erro", texto: resultado.erro });
      } else {
        setMensagem({
          tipo: "sucesso",
          texto: "Solicitação enviada! A direção foi avisada.",
        });
        setLinhas([linhaVazia()]);
        setObservacao("");
      }
    });
  }

  return (
    <div className="mt-6 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4">
      {mensagem && (
        <div
          className={
            "mb-3 rounded-lg p-3 text-sm " +
            (mensagem.tipo === "erro"
              ? "bg-[#fbeae6] text-[#8a3320]"
              : "bg-[#e7f2ea] text-[#1f6f3e]")
          }
        >
          {mensagem.texto}
        </div>
      )}

      <datalist id="sugestoes-itens-compra">
        {(sugestoes ?? []).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="space-y-2">
        {linhas.map((linha) => (
          <div key={linha.chave} className="grid grid-cols-[1fr_90px_100px_auto] items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-[#1c2a1f]">Item</label>
              <input
                type="text"
                list="sugestoes-itens-compra"
                value={linha.nome}
                onChange={(e) => atualizarLinha(linha.chave, "nome", e.target.value)}
                placeholder="Ex: Farinha de trigo"
                className={campoClasse}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1c2a1f]">Qtd.</label>
              <input
                type="text"
                inputMode="decimal"
                value={linha.quantidade}
                onChange={(e) => atualizarLinha(linha.chave, "quantidade", e.target.value)}
                placeholder="5"
                className={campoClasse}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1c2a1f]">Unidade</label>
              <select
                value={linha.unidade}
                onChange={(e) => atualizarLinha(linha.chave, "unidade", e.target.value)}
                className={campoClasse}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => removerLinha(linha.chave)}
              className="mb-0.5 h-9 w-9 rounded-lg border border-[#dcdfd2] text-[#b3432f] hover:bg-white"
              title="Remover item"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={adicionarLinha}
        className="mt-2 text-xs font-semibold text-[#1f6f3e] hover:underline"
      >
        + Adicionar item
      </button>

      <div className="mt-3">
        <label className="block text-xs font-medium text-[#1c2a1f]">
          Observação (opcional)
        </label>
        <input
          type="text"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          className={campoClasse}
          placeholder="Ex: precisa ser até amanhã de manhã"
        />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={enviar}
        className="mt-3 w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Enviando..." : "Enviar solicitação"}
      </button>
    </div>
  );
}
