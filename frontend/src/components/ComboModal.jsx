import { useState } from 'react';

export default function ComboModal({ combo, onFechar, onConfirmar }) {
  // Para cada item do combo que exige escolha (categoria_id), guardamos um array
  // de produtoId escolhidos, um por "slot" de quantidade.
  const [escolhas, setEscolhas] = useState(() => {
    const inicial = {};
    for (const item of combo.itens) {
      if (item.categoria_id) {
        inicial[item.id] = Array.from({ length: item.quantidade }, (_, i) => item.opcoes[i % item.opcoes.length]?.id || '');
      }
    }
    return inicial;
  });

  function alterarEscolha(itemId, slotIndex, produtoId) {
    setEscolhas((prev) => {
      const copia = { ...prev, [itemId]: [...prev[itemId]] };
      copia[itemId][slotIndex] = Number(produtoId);
      return copia;
    });
  }

  function confirmar() {
    const escolhasFinais = combo.itens.map((item) => {
      if (item.categoria_id) {
        const nomes = escolhas[item.id].map((id) => item.opcoes.find((o) => o.id === id)?.nome).filter(Boolean);
        return { rotulo: item.rotulo, escolhas: escolhas[item.id], nomes };
      }
      return { rotulo: item.rotulo || item.produto_nome, escolhas: [item.produto_id], nomes: [item.produto_nome] };
    });
    onConfirmar(escolhasFinais);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-3">
          <span className="text-3xl">{combo.imagem}</span>
          <div>
            <h2 className="font-display font-bold text-lg dark:text-white">{combo.nome}</h2>
            <p className="text-sm text-neutral-500">{combo.descricao}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {combo.itens.map((item) => (
            <div key={item.id}>
              <p className="font-semibold text-sm mb-2 dark:text-neutral-200">{item.rotulo || item.produto_nome}</p>
              {item.categoria_id ? (
                <div className="space-y-2">
                  {escolhas[item.id]?.map((valor, slotIndex) => (
                    <select
                      key={slotIndex}
                      value={valor}
                      onChange={(e) => alterarEscolha(item.id, slotIndex, e.target.value)}
                      className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2 text-sm"
                    >
                      {item.opcoes.map((op) => (
                        <option key={op.id} value={op.id}>{op.nome}</option>
                      ))}
                    </select>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">✔ {item.produto_nome} (incluso)</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
          <button onClick={onFechar} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white">
            Cancelar
          </button>
          <button onClick={confirmar} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white">
            Adicionar — R$ {Number(combo.preco).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
