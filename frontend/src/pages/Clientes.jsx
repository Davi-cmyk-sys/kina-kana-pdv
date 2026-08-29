import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [novo, setNovo] = useState({ nome: '', telefone: '', dataNascimento: '', endereco: '', observacoes: '' });
  const [mostrarNovo, setMostrarNovo] = useState(false);

  useEffect(() => { carregar(); }, []);
  function carregar() {
    api.get(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`).then(setClientes).catch(() => {});
  }
  function abrir(c) {
    api.get(`/clientes/${c.id}`).then(setSelecionado).catch(() => {});
  }
  async function salvarNovo() {
    if (!novo.nome) return;
    await api.post('/clientes', novo);
    setNovo({ nome: '', telefone: '', dataNascimento: '', endereco: '', observacoes: '' });
    setMostrarNovo(false);
    carregar();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-display font-bold text-xl dark:text-white">👤 Clientes &amp; Fidelidade</h1>
          <button onClick={() => setMostrarNovo(!mostrarNovo)} className="btn-toque text-sm font-bold bg-marca-700 text-white px-3 py-2 rounded-lg">+ Novo</button>
        </div>

        {mostrarNovo && (
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 mb-3 space-y-2">
            <input placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
            <input placeholder="Telefone" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
            <input type="date" value={novo.dataNascimento} onChange={(e) => setNovo({ ...novo, dataNascimento: e.target.value })} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
            <input placeholder="Endereço (opcional)" value={novo.endereco} onChange={(e) => setNovo({ ...novo, endereco: e.target.value })} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
            <input placeholder="Preferências/observações" value={novo.observacoes} onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })} className="w-full rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
            <button onClick={salvarNovo} className="btn-toque w-full py-2.5 rounded-xl font-bold bg-marca-700 text-white">Salvar cliente</button>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input placeholder="Buscar por nome ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2 text-sm" />
          <button onClick={carregar} className="btn-toque bg-neutral-800 text-white px-3 py-2 rounded-lg text-sm font-bold">Buscar</button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {clientes.map((c) => (
            <button key={c.id} onClick={() => abrir(c)} className="btn-toque w-full text-left border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 hover:bg-marca-50 dark:hover:bg-neutral-800">
              <p className="font-semibold text-sm dark:text-white">{c.nome}</p>
              <p className="text-xs text-neutral-500">{c.telefone} • ⭐ {c.pontos_fidelidade} pontos</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
        {!selecionado ? (
          <p className="text-neutral-400 text-sm text-center py-10">Selecione um cliente para ver detalhes, histórico de pedidos e pontos de fidelidade.</p>
        ) : (
          <div>
            <h2 className="font-display font-bold text-lg dark:text-white">{selecionado.nome}</h2>
            <p className="text-sm text-neutral-500 mb-2">{selecionado.telefone} {selecionado.endereco ? `• ${selecionado.endereco}` : ''}</p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 mb-3">
              <p className="font-extrabold text-amber-800 dark:text-amber-300">⭐ {selecionado.pontos_fidelidade} pontos de fidelidade</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">Regra ativa: 1 ponto a cada R$ 1,00 gasto.</p>
            </div>
            {selecionado.observacoes && <p className="text-sm italic text-neutral-500 mb-3">"{selecionado.observacoes}"</p>}

            <p className="font-semibold text-sm dark:text-white mb-1">Histórico de pedidos</p>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {selecionado.pedidos.map((p) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-neutral-100 dark:border-neutral-800 py-1 dark:text-neutral-200">
                  <span>#{p.numero_senha || '—'} — {p.status}</span><span className="font-bold">R$ {p.total.toFixed(2)}</span>
                </div>
              ))}
              {selecionado.pedidos.length === 0 && <p className="text-xs text-neutral-400">Nenhum pedido ainda.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
