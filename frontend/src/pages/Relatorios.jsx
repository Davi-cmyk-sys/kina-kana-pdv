import { useEffect, useState } from 'react';
import { api, csvUrl } from '../lib/api';

const FORMA_LABEL = {
  dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão Crédito', debito: 'Cartão Débito',
  vale_refeicao: 'Vale-Refeição', vale_alimentacao: 'Vale-Alimentação', outros: 'Outros',
};

export default function Relatorios() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [relatorio, setRelatorio] = useState(null);

  useEffect(() => { carregar(); }, [data]);

  function carregar() {
    api.get(`/relatorios/diario?data=${data}`).then(setRelatorio).catch(() => {});
  }

  function imprimirRelatorio() {
    window.print();
  }

  if (!relatorio) return <p className="dark:text-white">Carregando...</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5 flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="font-display font-bold text-xl dark:text-white">📊 Resumo Diário</h1>
          <p className="text-sm text-neutral-500">Fechamento de caixa e desempenho de vendas</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2" />
          <a href={csvUrl(`/relatorios/diario/csv?data=${data}`)} target="_blank" rel="noreferrer" className="btn-toque bg-neutral-800 text-white text-sm font-bold px-3 py-2 rounded-lg">⬇ CSV/Excel</a>
          <button onClick={imprimirRelatorio} className="btn-toque bg-marca-700 hover:bg-marca-800 text-white text-sm font-bold px-3 py-2 rounded-lg">🖨️ PDF (imprimir)</button>
        </div>
      </div>

      <div id="ficha-impressao" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Total vendido', `R$ ${relatorio.totalVendido.toFixed(2)}`],
          ['Pedidos', relatorio.quantidadePedidos],
          ['Ticket médio', `R$ ${relatorio.ticketMedio.toFixed(2)}`],
          ['Descontos', `R$ ${relatorio.totalDescontos.toFixed(2)}`],
          ['Cancelamentos', `${relatorio.totalCancelamentos} (R$ ${relatorio.valorCancelamentos.toFixed(2)})`],
          ['Reembolsos', `${relatorio.totalReembolsos} (R$ ${relatorio.valorReembolsos.toFixed(2)})`],
        ].map(([label, valor]) => (
          <div key={label} className="bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4 text-center">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="font-extrabold text-lg text-marca-700 dark:text-marca-400">{valor}</p>
          </div>
        ))}

        <div className="col-span-2 sm:col-span-4 bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="font-bold dark:text-white mb-2">Formas de pagamento</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {relatorio.porFormaPagamento.map((f) => (
              <div key={f.forma} className="text-sm bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 flex justify-between">
                <span className="dark:text-neutral-200">{FORMA_LABEL[f.forma] || f.forma}</span><span className="font-bold dark:text-white">R$ {f.total.toFixed(2)}</span>
              </div>
            ))}
            {relatorio.porFormaPagamento.length === 0 && <p className="text-sm text-neutral-400">Sem pagamentos no dia.</p>}
          </div>
        </div>

        <div className="col-span-2 bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="font-bold dark:text-white mb-2">🏆 Produtos mais vendidos</p>
          <div className="space-y-1">
            {relatorio.produtosMaisVendidos.map((p, i) => (
              <div key={p.nome} className="flex justify-between text-sm dark:text-neutral-200">
                <span>{i + 1}. {p.nome} ({p.quantidade}x)</span><span className="font-bold">R$ {p.total.toFixed(2)}</span>
              </div>
            ))}
            {relatorio.produtosMaisVendidos.length === 0 && <p className="text-sm text-neutral-400">Sem vendas no dia.</p>}
          </div>
        </div>

        <div className="col-span-2 bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="font-bold dark:text-white mb-2">👤 Vendas por atendente</p>
          <div className="space-y-1">
            {relatorio.vendasPorFuncionario.map((v) => (
              <div key={v.funcionario} className="flex justify-between text-sm dark:text-neutral-200">
                <span>{v.funcionario} ({v.pedidos} pedidos)</span><span className="font-bold">R$ {v.total.toFixed(2)}</span>
              </div>
            ))}
            {relatorio.vendasPorFuncionario.length === 0 && <p className="text-sm text-neutral-400">Sem vendas no dia.</p>}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-4 bg-white dark:bg-neutral-900 rounded-xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="font-bold dark:text-white mb-2">🕒 Horários com mais pedidos</p>
          <div className="flex gap-2 flex-wrap">
            {relatorio.horarios.map((h) => (
              <span key={h.hora} className="text-xs bg-marca-50 dark:bg-marca-950/30 text-marca-800 dark:text-marca-300 px-2.5 py-1 rounded-full font-semibold">{h.hora} — {h.pedidos} pedido(s)</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
        📌 Relatórios avançados (por período semanal/mensal/anual, lucro estimado detalhado por produto, comparativos históricos) fazem parte do roadmap —
        a base de dados já registra tudo o que é necessário (custo do produto, descontos, cancelamentos, auditoria), bastando construir novas consultas SQL sobre as tabelas existentes.
      </div>
    </div>
  );
}
