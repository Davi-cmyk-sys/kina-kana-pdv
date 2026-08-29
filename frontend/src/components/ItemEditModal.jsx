import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const OBSERVACOES_RAPIDAS = ['Sem cebola', 'Sem açúcar', 'Pouco gelo', 'Bem assado', 'Sem molho'];

export default function ItemEditModal({ item, onFechar, onSalvar }) {
  const [observacao, setObservacao] = useState(item.observacao || '');
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState([]);
  const [selecionados, setSelecionados] = useState(item.adicionais || []);

  useEffect(() => {
    api.get('/adicionais').then(setAdicionaisDisponiveis).catch(() => {});
  }, []);

  function alternarAdicional(ad) {
    setSelecionados((prev) => {
      const existe = prev.find((s) => s.adicionalId === ad.id);
      if (existe) return prev.filter((s) => s.adicionalId !== ad.id);
      return [...prev, { adicionalId: ad.id, nome: ad.nome, preco: ad.preco, quantidade: 1 }];
    });
  }

  function adicionarChip(texto) {
    setObservacao((prev) => {
      if (prev.toLowerCase().includes(texto.toLowerCase())) return prev;
      return prev ? `${prev}, ${texto}` : texto;
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="font-display font-bold text-lg dark:text-white">{item.nome}</h2>
          <p className="text-sm text-neutral-500">Observações e adicionais</p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <p className="font-semibold text-sm mb-2 dark:text-neutral-200">Observações rápidas</p>
            <div className="flex flex-wrap gap-2">
              {OBSERVACOES_RAPIDAS.map((o) => (
                <button
                  key={o} type="button" onClick={() => adicionarChip(o)}
                  className="btn-toque text-xs font-semibold bg-marca-50 dark:bg-neutral-800 text-marca-800 dark:text-marca-300 px-3 py-1.5 rounded-full border border-marca-200 dark:border-neutral-700"
                >
                  + {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Observação do item</label>
            <textarea
              value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2}
              placeholder="Ex: sem cebola, ponto bem passado..."
              className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2 text-sm"
            />
          </div>

          {adicionaisDisponiveis.length > 0 && (
            <div>
              <p className="font-semibold text-sm mb-2 dark:text-neutral-200">Adicionais</p>
              <div className="space-y-1.5">
                {adicionaisDisponiveis.map((ad) => {
                  const marcado = selecionados.some((s) => s.adicionalId === ad.id);
                  return (
                    <label key={ad.id} className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 cursor-pointer ${marcado ? 'border-marca-500 bg-marca-50 dark:bg-marca-950/30' : 'border-neutral-200 dark:border-neutral-700'}`}>
                      <span className="flex items-center gap-2 text-sm dark:text-neutral-200">
                        <input type="checkbox" checked={marcado} onChange={() => alternarAdicional(ad)} className="w-4 h-4 accent-marca-600" />
                        {ad.nome}
                      </span>
                      <span className="text-sm font-bold text-marca-700 dark:text-marca-300">+R$ {ad.preco.toFixed(2)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-2">
          <button onClick={onFechar} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white">
            Cancelar
          </button>
          <button
            onClick={() => onSalvar({ observacao, adicionais: selecionados })}
            className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
