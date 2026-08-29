import { useState } from 'react';
import { useCarrinho, useAuth } from '../lib/store';
import ItemEditModal from './ItemEditModal';
import DiscountModal from './DiscountModal';

const LIMITE_DESCONTO = Number(import.meta.env.VITE_DISCOUNT_AUTH_LIMIT || 10);

export default function CartPanel({ onFinalizar, enviando }) {
  const carrinho = useCarrinho();
  const { usuario } = useAuth();
  const [itemEditando, setItemEditando] = useState(null);
  const [mostrarDesconto, setMostrarDesconto] = useState(false);

  const subtotal = carrinho.subtotal();
  const total = carrinho.total();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800">
      <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-display font-bold text-lg dark:text-white mb-2">🧾 Carrinho</h2>

        <div className="flex gap-1.5 mb-2">
          {[
            { v: 'balcao', l: '🧍 Balcão' },
            { v: 'mesa', l: '🍽️ Mesa' },
            { v: 'delivery', l: '🛵 Delivery' },
          ].map((t) => (
            <button
              key={t.v} onClick={() => carrinho.definirTipo(t.v)}
              className={`btn-toque flex-1 text-xs font-semibold py-2 rounded-lg ${carrinho.tipo === t.v ? 'bg-marca-700 text-white' : 'bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300'}`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {carrinho.tipo === 'mesa' && (
          <input
            placeholder="Número da mesa" value={carrinho.mesaNumero} onChange={(e) => carrinho.definirMesa(e.target.value)}
            className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5 mb-2"
          />
        )}
        {carrinho.tipo === 'delivery' && (
          <input
            placeholder="Endereço de entrega" value={carrinho.enderecoEntrega} onChange={(e) => carrinho.definirEndereco(e.target.value)}
            className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5 mb-2"
          />
        )}

        <div className="flex gap-1.5">
          <input
            placeholder="Cliente (opcional)" value={carrinho.clienteNomeAvulso}
            onChange={(e) => carrinho.definirCliente(null, e.target.value, carrinho.clienteTelefoneAvulso)}
            className="flex-1 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5"
          />
          <input
            placeholder="Telefone" value={carrinho.clienteTelefoneAvulso}
            onChange={(e) => carrinho.definirCliente(null, carrinho.clienteNomeAvulso, e.target.value)}
            className="w-28 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {carrinho.itens.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-10">Clique nos produtos para adicionar ao pedido.</p>
        )}
        {carrinho.itens.map((item) => (
          <div key={item.idLocal} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-2.5">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm dark:text-white truncate">{item.nome}</p>
                <p className="text-xs text-neutral-500">R$ {item.precoUnitario.toFixed(2)} un.</p>
                {item.observacao && <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">📝 {item.observacao}</p>}
                {(item.adicionais || []).map((a) => (
                  <p key={a.adicionalId} className="text-xs text-marca-700 dark:text-marca-400">+ {a.nome}</p>
                ))}
                {(item.comboEscolhas || []).map((c, i) => (
                  <p key={i} className="text-xs text-neutral-500">• {c.rotulo}: {c.nomes.join(', ')}</p>
                ))}
              </div>
              <p className="font-bold text-sm text-marca-800 dark:text-marca-300 whitespace-nowrap">
                R$ {carrinho.subtotalItem(item).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <button onClick={() => carrinho.alterarQuantidade(item.idLocal, -1)} className="btn-toque w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 dark:text-white font-bold">−</button>
                <span className="w-6 text-center font-bold dark:text-white">{item.quantidade}</span>
                <button onClick={() => carrinho.alterarQuantidade(item.idLocal, 1)} className="btn-toque w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 dark:text-white font-bold">+</button>
              </div>
              <div className="flex gap-1.5">
                {!item.comboId && (
                  <button onClick={() => setItemEditando(item)} className="btn-toque text-xs font-semibold bg-marca-50 dark:bg-neutral-800 text-marca-700 dark:text-marca-300 px-2.5 py-1.5 rounded-lg">
                    ✏️ Editar
                  </button>
                )}
                <button onClick={() => carrinho.removerItem(item.idLocal)} className="btn-toque text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 px-2.5 py-1.5 rounded-lg">
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
        <textarea
          placeholder="Observações gerais do pedido..." value={carrinho.observacoesGerais}
          onChange={(e) => carrinho.definirObservacoesGerais(e.target.value)} rows={1}
          className="w-full text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5"
        />

        <div className="flex justify-between text-sm dark:text-neutral-300">
          <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
        </div>
        {carrinho.desconto.valor > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Desconto ({carrinho.desconto.motivo})</span><span>− R$ {carrinho.desconto.valor.toFixed(2)}</span>
          </div>
        )}
        <button onClick={() => setMostrarDesconto(true)} className="btn-toque text-xs font-semibold text-marca-700 dark:text-marca-400 underline">
          {carrinho.desconto.valor > 0 ? 'Alterar desconto' : '+ Aplicar desconto'}
        </button>

        <div className="flex justify-between text-xl font-extrabold dark:text-white pt-1 border-t border-dashed border-neutral-300 dark:border-neutral-700">
          <span>Total</span><span className="text-marca-700 dark:text-marca-400">R$ {total.toFixed(2)}</span>
        </div>

        <button
          disabled={carrinho.itens.length === 0 || enviando}
          onClick={onFinalizar}
          className="btn-toque w-full bg-brasa-vermelho hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-lg py-3.5 rounded-xl shadow-card"
        >
          {enviando ? 'Enviando...' : '✅ Finalizar Pedido'}
        </button>
      </div>

      {itemEditando && (
        <ItemEditModal
          item={itemEditando}
          onFechar={() => setItemEditando(null)}
          onSalvar={({ observacao, adicionais }) => {
            carrinho.definirObservacao(itemEditando.idLocal, observacao);
            carrinho.definirAdicionais(itemEditando.idLocal, adicionais);
            setItemEditando(null);
          }}
        />
      )}

      {mostrarDesconto && (
        <DiscountModal
          subtotal={subtotal}
          limiteAutorizacao={LIMITE_DESCONTO}
          onFechar={() => setMostrarDesconto(false)}
          onAplicar={(desconto) => { carrinho.definirDesconto(desconto); setMostrarDesconto(false); }}
        />
      )}
    </div>
  );
}
