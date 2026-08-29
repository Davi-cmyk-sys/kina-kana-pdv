import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Estoque() {
  const [ingredientes, setIngredientes] = useState([]);
  const [novo, setNovo] = useState({ nome: '', unidade: 'un', quantidadeEstoque: '', quantidadeMinima: '', custoUnitario: '' });

  useEffect(() => { carregar(); }, []);
  function carregar() {
    api.get('/estoque/ingredientes').then(setIngredientes).catch(() => {});
  }
  async function salvar() {
    if (!novo.nome) return;
    await api.post('/estoque/ingredientes', novo);
    setNovo({ nome: '', unidade: 'un', quantidadeEstoque: '', quantidadeMinima: '', custoUnitario: '' });
    carregar();
  }
  async function ajustar(id, delta) {
    await api.patch(`/estoque/ingredientes/${id}/ajustar`, { quantidade: delta });
    carregar();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h1 className="font-display font-bold text-xl dark:text-white mb-1">📦 Controle de Estoque</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Cadastro de ingredientes com alerta de estoque baixo. A baixa automática por venda (via receita produto → ingredientes)
          já está modelada no banco (tabela <code>produto_ingredientes</code>) e pode ser ativada vinculando cada produto aos seus ingredientes.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <input placeholder="Ingrediente" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm col-span-2" />
          <select value={novo.unidade} onChange={(e) => setNovo({ ...novo, unidade: e.target.value })} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm">
            <option value="un">un</option><option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option>
          </select>
          <input type="number" placeholder="Qtd. inicial" value={novo.quantidadeEstoque} onChange={(e) => setNovo({ ...novo, quantidadeEstoque: e.target.value })} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
          <input type="number" placeholder="Qtd. mínima" value={novo.quantidadeMinima} onChange={(e) => setNovo({ ...novo, quantidadeMinima: e.target.value })} className="rounded-lg border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-2 py-2 text-sm" />
        </div>
        <button onClick={salvar} className="btn-toque bg-marca-700 hover:bg-marca-800 text-white font-bold px-4 py-2.5 rounded-xl">+ Adicionar ingrediente</button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="font-display font-bold text-lg dark:text-white mb-3">Ingredientes cadastrados</h2>
        <div className="space-y-2">
          {ingredientes.map((i) => (
            <div key={i.id} className={`flex items-center justify-between rounded-xl p-3 border-2 ${i.estoqueBaixo ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'border-neutral-200 dark:border-neutral-700'}`}>
              <div>
                <p className="font-semibold dark:text-white">{i.nome} {i.estoqueBaixo && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full ml-1">ESTOQUE BAIXO</span>}</p>
                <p className="text-xs text-neutral-500">{i.quantidade_estoque} {i.unidade} disponíveis (mínimo: {i.quantidade_minima}) • Custo: R$ {i.custo_unitario.toFixed(2)}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => ajustar(i.id, -1)} className="btn-toque w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 dark:text-white font-bold">−</button>
                <button onClick={() => ajustar(i.id, 1)} className="btn-toque w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 dark:text-white font-bold">+</button>
              </div>
            </div>
          ))}
          {ingredientes.length === 0 && <p className="text-sm text-neutral-400">Nenhum ingrediente cadastrado.</p>}
        </div>
      </div>
    </div>
  );
}
