import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const TIPO_LABEL = { balcao: '🧍 Balcão', mesa: '🍽️ Mesa', delivery: '🛵 Delivery', whatsapp: '💬 WhatsApp', qrcode: '📱 QR Code', autoatendimento: '🖥️ Autoatendimento' };

export default function Cozinha() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 5000); // atualização automática a cada 5s
    return () => clearInterval(t);
  }, []);

  function carregar() {
    api.get('/pedidos/cozinha/fila').then(setPedidos).catch(() => {});
  }

  async function avancar(pedido, novoStatus) {
    try {
      await api.patch(`/pedidos/${pedido.id}/status`, { status: novoStatus });
      carregar();
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h1 className="font-display font-bold text-2xl dark:text-white mb-4">🍳 Painel da Cozinha</h1>
      {pedidos.length === 0 && <p className="text-center text-neutral-400 py-16 text-lg">Nenhum pedido na fila no momento. 🎉</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {pedidos.map((p) => (
          <div key={p.id} className={`rounded-2xl shadow-card border-2 p-4 ${p.status === 'em_preparo' ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-sky-300 bg-white dark:bg-neutral-900'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-extrabold text-2xl dark:text-white">#{p.numero_senha}</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-neutral-800 text-white">{TIPO_LABEL[p.tipo] || p.tipo}</span>
            </div>
            <p className="text-xs text-neutral-400 mb-2">Recebido às {new Date(p.criado_em).toLocaleTimeString('pt-BR')}</p>

            <div className="space-y-1.5 mb-3">
              {p.itens.map((item) => (
                <div key={item.id} className="text-sm border-b border-dashed border-neutral-200 dark:border-neutral-700 pb-1">
                  <p className="font-bold dark:text-white">{item.quantidade}x {item.nome_snapshot}</p>
                  {item.observacao && <p className="text-amber-700 dark:text-amber-400 font-semibold">📝 {item.observacao}</p>}
                  {(item.adicionais || []).map((a) => <p key={a.id} className="text-marca-700 dark:text-marca-400">+ {a.quantidade}x {a.nome_snapshot}</p>)}
                </div>
              ))}
            </div>
            {p.observacoes_gerais && <p className="text-xs italic text-neutral-500 mb-2">Obs: {p.observacoes_gerais}</p>}

            {p.status === 'pago' && (
              <button onClick={() => avancar(p, 'em_preparo')} className="btn-toque w-full py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white">▶ Iniciar Preparo</button>
            )}
            {p.status === 'em_preparo' && (
              <button onClick={() => avancar(p, 'pronto')} className="btn-toque w-full py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white">✅ Marcar Pronto</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
