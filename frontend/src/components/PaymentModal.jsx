import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import TicketPreview from './TicketPreview';

const FORMAS = [
  { v: 'dinheiro', l: 'Dinheiro', icone: '💵' },
  { v: 'pix', l: 'Pix', icone: '📱' },
  { v: 'credito', l: 'Cartão Crédito', icone: '💳' },
  { v: 'debito', l: 'Cartão Débito', icone: '💳' },
  { v: 'vale_refeicao', l: 'Vale-Refeição', icone: '🍽️' },
  { v: 'vale_alimentacao', l: 'Vale-Alimentação', icone: '🛒' },
  { v: 'outros', l: 'Outros', icone: '➕' },
];

export default function PaymentModal({ pedido: pedidoInicial, onFechado }) {
  const [pedido, setPedido] = useState(pedidoInicial);
  const [linhas, setLinhas] = useState([]); // { forma, valor, valorRecebido }
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState('formas'); // formas | aguardando_pix | pronto
  const [qrDataUrl, setQrDataUrl] = useState(null);

  const totalPedido = pedido.total;
  const totalLinhas = linhas.reduce((s, l) => s + Number(l.valor || 0), 0);
  const restante = Math.max(0, totalPedido - totalLinhas);

  function adicionarLinha(forma) {
    setLinhas((prev) => [...prev, { forma, valor: restante > 0 ? restante.toFixed(2) : totalPedido.toFixed(2), valorRecebido: '' }]);
  }
  function atualizarLinha(i, campo, valor) {
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }
  function removerLinha(i) {
    setLinhas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function confirmarPagamento() {
    setErro('');
    if (Math.abs(totalLinhas - totalPedido) > 0.009) {
      setErro(`O total pago (R$ ${totalLinhas.toFixed(2)}) precisa ser igual ao total do pedido (R$ ${totalPedido.toFixed(2)}).`);
      return;
    }
    setEnviando(true);
    try {
      const payload = {
        pagamentos: linhas.map((l) => ({
          forma: l.forma,
          valor: Number(l.valor),
          valorRecebido: l.forma === 'dinheiro' ? Number(l.valorRecebido || l.valor) : Number(l.valor),
        })),
      };
      const atualizado = await api.post(`/pedidos/${pedido.id}/pagamentos`, payload);
      setPedido(atualizado);

      const temPixPendente = atualizado.pagamentos.some((p) => p.forma === 'pix' && p.status === 'aguardando');
      if (temPixPendente) {
        const pixLinha = atualizado.pagamentos.find((p) => p.forma === 'pix' && p.status === 'aguardando');
        const payloadPix = `00020126PIXKINAKANA${pedido.id}5204000053039865406${pixLinha.valor.toFixed(2)}5802BR5913KINA KANA LTDA6009SAOPAULO62070503***6304`;
        const url = await QRCode.toDataURL(payloadPix, { margin: 1, width: 240 });
        setQrDataUrl(url);
        setEtapa('aguardando_pix');
      } else {
        setEtapa('pronto');
      }
    } catch (e) {
      setErro(e.message || 'Não foi possível registrar o pagamento.');
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarPix() {
    const pixLinha = pedido.pagamentos.find((p) => p.forma === 'pix' && p.status === 'aguardando');
    const atualizado = await api.patch(`/pedidos/${pedido.id}/pagamentos/${pixLinha.id}/confirmar`);
    setPedido(atualizado);
    setEtapa('pronto');
  }

  const trocoTotal = linhas
    .filter((l) => l.forma === 'dinheiro')
    .reduce((s, l) => s + Math.max(0, Number(l.valorRecebido || l.valor) - Number(l.valor)), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl">
        {etapa === 'formas' && (
          <div className="p-5">
            <h2 className="font-display font-bold text-xl dark:text-white mb-1">Finalizar Pagamento</h2>
            <p className="text-3xl font-extrabold text-marca-700 dark:text-marca-400 mb-4">R$ {totalPedido.toFixed(2)}</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {FORMAS.map((f) => (
                <button key={f.v} onClick={() => adicionarLinha(f.v)} className="btn-toque flex flex-col items-center gap-1 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl py-3 font-semibold text-xs">
                  <span className="text-2xl">{f.icone}</span> {f.l}
                </button>
              ))}
            </div>

            <div className="space-y-2 mb-3">
              {linhas.map((l, i) => {
                const forma = FORMAS.find((f) => f.v === l.forma);
                return (
                  <div key={i} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm dark:text-white">{forma.icone} {forma.l}</span>
                      <button onClick={() => removerLinha(i)} className="text-red-500 text-xs font-bold">remover</button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] text-neutral-500">Valor (R$)</label>
                        <input type="number" step="0.01" value={l.valor} onChange={(e) => atualizarLinha(i, 'valor', e.target.value)}
                          className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5 text-sm" />
                      </div>
                      {l.forma === 'dinheiro' && (
                        <div className="flex-1">
                          <label className="text-[11px] text-neutral-500">Valor recebido (R$)</label>
                          <input type="number" step="0.01" value={l.valorRecebido} onChange={(e) => atualizarLinha(i, 'valorRecebido', e.target.value)}
                            className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-1.5 text-sm" />
                        </div>
                      )}
                    </div>
                    {l.forma === 'dinheiro' && Number(l.valorRecebido) > Number(l.valor) && (
                      <p className="text-xs text-marca-700 dark:text-marca-400 font-semibold mt-1">
                        Troco: R$ {(Number(l.valorRecebido) - Number(l.valor)).toFixed(2)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-sm font-semibold mb-1 dark:text-neutral-300">
              <span>Total informado</span><span>R$ {totalLinhas.toFixed(2)}</span>
            </div>
            <div className={`flex justify-between text-sm font-bold mb-3 ${restante > 0.009 ? 'text-red-600' : 'text-marca-700 dark:text-marca-400'}`}>
              <span>{restante > 0.009 ? 'Falta' : 'Tudo certo'}</span><span>R$ {restante.toFixed(2)}</span>
            </div>
            {trocoTotal > 0 && (
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-2">💰 Troco total: R$ {trocoTotal.toFixed(2)}</p>
            )}

            {erro && <p className="text-red-600 text-sm font-semibold mb-2">{erro}</p>}

            <div className="flex gap-2">
              <button onClick={onFechado} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white">Voltar</button>
              <button disabled={enviando || linhas.length === 0} onClick={confirmarPagamento} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white disabled:opacity-50">
                {enviando ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        )}

        {etapa === 'aguardando_pix' && (
          <div className="p-5 text-center">
            <h2 className="font-display font-bold text-xl dark:text-white mb-3">Pagamento via Pix</h2>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code Pix" className="mx-auto rounded-xl border-4 border-marca-200 mb-3" />}
            <p className="text-xs text-neutral-500 mb-1">(QR Code ilustrativo para demonstração do fluxo — integre com seu PSP/banco para gerar o BR Code real.)</p>
            <p className="text-2xl font-extrabold text-marca-700 dark:text-marca-400 mb-4">Aguardando pagamento...</p>
            <div className="flex gap-2">
              <button onClick={onFechado} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white">Fechar</button>
              <button onClick={confirmarPix} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white">
                ✅ Marcar como Pago
              </button>
            </div>
          </div>
        )}

        {etapa === 'pronto' && <TicketPreview pedidoId={pedido.id} onFechado={onFechado} />}
      </div>
    </div>
  );
}
