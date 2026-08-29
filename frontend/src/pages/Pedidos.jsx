import { useEffect, useState } from 'react';
import { api, csvUrl } from '../lib/api';
import { useAuth } from '../lib/store';
import TicketPreview from '../components/TicketPreview';

const STATUS_LABEL = {
  aguardando_pagamento: { l: 'Aguardando pagamento', c: 'bg-neutral-200 text-neutral-700' },
  pago: { l: 'Pago', c: 'bg-sky-100 text-sky-800' },
  em_preparo: { l: 'Em preparo', c: 'bg-amber-100 text-amber-800' },
  pronto: { l: 'Pronto', c: 'bg-marca-100 text-marca-800' },
  entregue: { l: 'Entregue', c: 'bg-neutral-800 text-white' },
  cancelado: { l: 'Cancelado', c: 'bg-red-100 text-red-700' },
  reembolsado: { l: 'Reembolsado', c: 'bg-purple-100 text-purple-700' },
};
const FORMAS = ['dinheiro', 'pix', 'credito', 'debito', 'vale_refeicao', 'vale_alimentacao', 'outros'];

export default function Pedidos() {
  const { usuario, temPapel } = useAuth();
  const [filtros, setFiltros] = useState({ numero: '', cliente: '', telefone: '', data: '', funcionarioId: '', status: '', formaPagamento: '' });
  const [pedidos, setPedidos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [reimprimindoId, setReimprimindoId] = useState(null);

  useEffect(() => {
    buscar();
    if (temPapel('gerente')) api.get('/config/usuarios').then(setFuncionarios).catch(() => {});
  }, []);

  function buscar() {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    api.get(`/pedidos?${params.toString()}`).then(setPedidos).catch(() => {});
  }

  async function cancelar(pedido) {
    const motivo = prompt('Motivo do cancelamento:');
    if (!motivo) return;
    try {
      await api.post(`/pedidos/${pedido.id}/cancelar`, { motivo });
      buscar();
    } catch (e) {
      if (e.dados?.exigeAutorizacaoGerente) {
        const pin = prompt('Pedido já pago. Digite o PIN do gerente para autorizar o cancelamento:');
        if (!pin) return;
        try {
          const auth = await api.post('/auth/autorizar-gerente', { pin });
          await api.post(`/pedidos/${pedido.id}/cancelar`, { motivo, autorizadoPorId: auth.autorizadoPorId });
          buscar();
        } catch {
          alert('PIN inválido. Cancelamento não autorizado.');
        }
      } else {
        alert(e.message);
      }
    }
  }

  async function reembolsar(pedido) {
    const motivo = prompt('Motivo do reembolso:');
    if (!motivo) return;
    try {
      await api.post(`/pedidos/${pedido.id}/reembolsar`, { motivo });
      buscar();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
        <h1 className="font-display font-bold text-xl dark:text-white mb-3">📋 Gestão de Pedidos</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <input placeholder="Nº pedido" value={filtros.numero} onChange={(e) => setFiltros({ ...filtros, numero: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
          <input placeholder="Cliente" value={filtros.cliente} onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
          <input placeholder="Telefone" value={filtros.telefone} onChange={(e) => setFiltros({ ...filtros, telefone: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
          <input type="date" value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
          {funcionarios.length > 0 && (
            <select value={filtros.funcionarioId} onChange={(e) => setFiltros({ ...filtros, funcionarioId: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm">
              <option value="">Funcionário (todos)</option>
              {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
          <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm">
            <option value="">Status (todos)</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <select value={filtros.formaPagamento} onChange={(e) => setFiltros({ ...filtros, formaPagamento: e.target.value })} className="rounded-lg border border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm">
            <option value="">Pagamento (todos)</option>
            {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button onClick={buscar} className="btn-toque mt-3 bg-marca-700 hover:bg-marca-800 text-white font-bold px-5 py-2.5 rounded-xl">🔍 Buscar</button>
      </div>

      <div className="space-y-2">
        {pedidos.map((p) => (
          <div key={p.id} className="bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="flex flex-wrap items-center gap-2 justify-between cursor-pointer" onClick={() => setExpandido(expandido === p.id ? null : p.id)}>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg dark:text-white">#{p.numero_senha || '—'}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_LABEL[p.status]?.c}`}>{STATUS_LABEL[p.status]?.l}</span>
                <span className="text-xs text-neutral-500">{p.cliente_nome_cadastro || p.cliente_nome_avulso || 'Sem cliente'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold dark:text-white">R$ {p.total.toFixed(2)}</span>
                <span className="text-neutral-400 text-xs">{p.funcionario_nome}</span>
                <span className="text-neutral-400 text-xs">{new Date(p.criado_em).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {expandido === p.id && (
              <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-wrap gap-2">
                {['pago', 'em_preparo', 'pronto'].includes(p.status) && (
                  <button onClick={() => cancelar(p)} className="btn-toque text-xs font-bold bg-red-100 dark:bg-red-950/40 text-red-700 px-3 py-2 rounded-lg">Cancelar pedido</button>
                )}
                {temPapel('gerente') && ['pago', 'em_preparo', 'pronto', 'entregue'].includes(p.status) && (
                  <button onClick={() => reembolsar(p)} className="btn-toque text-xs font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 px-3 py-2 rounded-lg">Reembolsar</button>
                )}
                {p.status !== 'aguardando_pagamento' && (
                  <button onClick={() => setReimprimindoId(p.id)} className="btn-toque text-xs font-bold bg-marca-100 dark:bg-marca-950/40 text-marca-800 dark:text-marca-300 px-3 py-2 rounded-lg">🖨️ Reimprimir ficha</button>
                )}
              </div>
            )}
          </div>
        ))}
        {pedidos.length === 0 && <p className="text-center text-neutral-400 py-10">Nenhum pedido encontrado com os filtros atuais.</p>}
      </div>

      {reimprimindoId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto shadow-2xl">
            <TicketPreview pedidoId={reimprimindoId} tipoImpressao="reimpressao" onFechado={() => { setReimprimindoId(null); buscar(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
