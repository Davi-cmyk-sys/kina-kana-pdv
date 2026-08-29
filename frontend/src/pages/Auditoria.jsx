import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ACAO_LABEL = {
  desconto: '💸 Desconto', cancelamento: '🚫 Cancelamento', reembolso: '↩️ Reembolso',
  reimpressao: '🖨️ Reimpressão', falha_impressao: '⚠️ Falha de impressão',
  abertura_caixa: '💰 Abertura de caixa', fechamento_caixa: '🔒 Fechamento de caixa',
  sangria: '📤 Sangria', suprimento: '📥 Suprimento',
};

export default function Auditoria() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    api.get('/auditoria').then(setRegistros).catch(() => {});
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h1 className="font-display font-bold text-xl dark:text-white mb-1">🛡️ Auditoria</h1>
        <p className="text-sm text-neutral-500 mb-4">Registro de todas as ações sensíveis: descontos, cancelamentos, reembolsos, reimpressões e movimentações de caixa.</p>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {registros.map((r) => (
            <div key={r.id} className="border-l-4 border-marca-400 pl-3 py-1">
              <p className="text-sm font-semibold dark:text-white">{ACAO_LABEL[r.acao] || r.acao} — {r.usuario_nome || 'Sistema'}</p>
              <p className="text-xs text-neutral-500">{new Date(r.criado_em).toLocaleString('pt-BR')} {r.pedido_id ? `• Pedido #${r.pedido_id}` : ''}</p>
              {r.motivo && <p className="text-xs italic text-neutral-500">Motivo: {r.motivo}</p>}
            </div>
          ))}
          {registros.length === 0 && <p className="text-sm text-neutral-400">Nenhum registro ainda.</p>}
        </div>
      </div>
    </div>
  );
}
