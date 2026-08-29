import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

const FORMA_LABEL = {
  dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão Crédito', debito: 'Cartão Débito',
  vale_refeicao: 'Vale-Refeição', vale_alimentacao: 'Vale-Alimentação', outros: 'Outros',
};

export default function Caixa() {
  const { temPapel } = useAuth();
  const [caixa, setCaixa] = useState(undefined); // undefined = carregando, null = fechado
  const [valorInicial, setValorInicial] = useState('');
  const [movTipo, setMovTipo] = useState('sangria');
  const [movValor, setMovValor] = useState('');
  const [movDescricao, setMovDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [fechamento, setFechamento] = useState({ valorContado: '', justificativa: '', pin: '' });
  const [resumoFechado, setResumoFechado] = useState(null);

  useEffect(() => { carregar(); }, []);

  function carregar() {
    api.get('/caixa/atual').then(setCaixa).catch(() => setCaixa(null));
  }

  async function abrirCaixa() {
    setErro('');
    try {
      await api.post('/caixa/abrir', { valorInicial: Number(valorInicial || 0) });
      carregar();
    } catch (e) { setErro(e.message); }
  }

  async function registrarMovimentacao() {
    setErro('');
    if (!movValor) return setErro('Informe o valor.');
    try {
      await api.post('/caixa/movimentacao', { tipo: movTipo, valor: Number(movValor), descricao: movDescricao });
      setMovValor(''); setMovDescricao('');
      carregar();
    } catch (e) { setErro(e.message); }
  }

  async function fecharCaixa() {
    setErro('');
    try {
      const resp = await api.post('/caixa/fechar', {
        valorContado: Number(fechamento.valorContado || 0),
        justificativa: fechamento.justificativa,
      });
      setResumoFechado(resp.resumo);
      carregar();
    } catch (e) {
      if (e.dados?.exigeAutorizacaoGerente) {
        if (!fechamento.pin) return setErro('Fechamento exige o PIN do gerente. Preencha o campo PIN.');
        try {
          const auth = await api.post('/auth/autorizar-gerente', { pin: fechamento.pin });
          const resp = await api.post('/caixa/fechar', {
            valorContado: Number(fechamento.valorContado || 0),
            justificativa: fechamento.justificativa,
            autorizadoPorId: auth.autorizadoPorId,
          });
          setResumoFechado(resp.resumo);
          carregar();
        } catch (e2) { setErro(e2.message || 'PIN inválido.'); }
      } else {
        setErro(e.message);
      }
    }
  }

  if (caixa === undefined) return <p className="dark:text-white">Carregando...</p>;

  if (!caixa) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-6">
        <h1 className="font-display font-bold text-xl dark:text-white mb-3">💰 Abrir Caixa</h1>
        {resumoFechado && (
          <div className="bg-marca-50 dark:bg-marca-950/30 border border-marca-300 dark:border-marca-700 rounded-xl p-3 mb-4 text-sm dark:text-marca-200">
            <p className="font-bold mb-1">Último fechamento:</p>
            <p>Esperado: R$ {resumoFechado.valorEsperadoDinheiro.toFixed(2)} | Contado: R$ {resumoFechado.valorContado.toFixed(2)}</p>
            <p className={resumoFechado.diferenca === 0 ? '' : 'font-bold text-red-600'}>Diferença: R$ {resumoFechado.diferenca.toFixed(2)}</p>
          </div>
        )}
        <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Valor inicial (fundo de troco)</label>
        <input type="number" step="0.01" value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-3 mb-3" />
        {erro && <p className="text-red-600 text-sm font-semibold mb-2">{erro}</p>}
        <button onClick={abrirCaixa} className="btn-toque w-full py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white">Abrir Caixa</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h1 className="font-display font-bold text-xl dark:text-white mb-1">💰 Caixa Aberto</h1>
        <p className="text-sm text-neutral-500 mb-3">Aberto em {new Date(caixa.aberto_em).toLocaleString('pt-BR')} — Fundo inicial R$ {caixa.valor_inicial.toFixed(2)}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <select value={movTipo} onChange={(e) => setMovTipo(e.target.value)} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2">
            <option value="sangria">Sangria (retirada)</option>
            <option value="suprimento">Suprimento (reforço)</option>
          </select>
          <input type="number" step="0.01" placeholder="Valor" value={movValor} onChange={(e) => setMovValor(e.target.value)} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2" />
        </div>
        <input placeholder="Descrição (opcional)" value={movDescricao} onChange={(e) => setMovDescricao(e.target.value)} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 mb-2" />
        <button onClick={registrarMovimentacao} className="btn-toque w-full py-2.5 rounded-xl font-bold bg-neutral-800 hover:bg-neutral-900 text-white">Registrar Movimentação</button>

        {erro && <p className="text-red-600 text-sm font-semibold mt-2">{erro}</p>}

        <div className="mt-4">
          <p className="font-semibold text-sm dark:text-white mb-1">Movimentações de hoje</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {caixa.movimentacoes.map((m) => (
              <div key={m.id} className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 py-1">
                <span className="dark:text-neutral-300">{m.tipo} — {m.descricao || ''} ({m.funcionario_nome})</span>
                <span className={`font-bold ${m.valor < 0 ? 'text-red-600' : 'text-marca-700 dark:text-marca-400'}`}>R$ {m.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {temPapel('gerente') && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="font-display font-bold text-lg dark:text-white mb-3">🔒 Fechamento de Caixa</h2>
          <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Valor contado em dinheiro (R$)</label>
          <input type="number" step="0.01" value={fechamento.valorContado} onChange={(e) => setFechamento({ ...fechamento, valorContado: e.target.value })} className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2.5 mb-2" />
          <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Justificativa (se houver diferença)</label>
          <input value={fechamento.justificativa} onChange={(e) => setFechamento({ ...fechamento, justificativa: e.target.value })} className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2.5 mb-2" />
          <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">PIN do gerente/administrador</label>
          <input type="password" value={fechamento.pin} onChange={(e) => setFechamento({ ...fechamento, pin: e.target.value })} className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2.5 mb-3" />
          <button onClick={fecharCaixa} className="btn-toque w-full py-3 rounded-xl font-bold bg-brasa-vermelho text-white">Fechar Caixa</button>
        </div>
      )}
    </div>
  );
}
