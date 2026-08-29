import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/store';

export default function Delivery() {
  const { temPapel } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [motoboys, setMotoboys] = useState([]);
  const [bairros, setBairros] = useState([]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 8000);
    return () => clearInterval(t);
  }, []);

  function carregar() {
    api.get('/delivery/em-andamento').then(setPedidos).catch(() => {});
    api.get('/delivery/motoboys').then(setMotoboys).catch(() => {});
    api.get('/delivery/bairros').then(setBairros).catch(() => {});
  }

  async function avancarStatus(pedido, status) {
    await api.patch(`/pedidos/${pedido.id}/status`, { status });
    carregar();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h1 className="font-display font-bold text-xl dark:text-white mb-1">🛵 Delivery</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Pedidos criados como "Delivery" na tela de Novo Pedido aparecem aqui. Estrutura pronta para roteirização e
          integração futura com WhatsApp/iFood — ver <code>docs/FLUXOS.md</code>.
        </p>

        <div className="space-y-2">
          {pedidos.map((p) => (
            <div key={p.id} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <p className="font-bold dark:text-white">#{p.numero_senha} — {p.cliente_nome_avulso || 'Cliente'}</p>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-marca-100 text-marca-800">{p.status}</span>
              </div>
              <p className="text-sm text-neutral-500">{p.endereco_entrega}</p>
              <p className="text-sm font-bold dark:text-white">R$ {p.total.toFixed(2)} (taxa: R$ {p.taxa_entrega.toFixed(2)})</p>
              <div className="flex gap-2 mt-2">
                {p.status === 'pronto' && (
                  <button onClick={() => avancarStatus(p, 'entregue')} className="btn-toque text-xs font-bold bg-marca-700 text-white px-3 py-2 rounded-lg">🛵 Saiu para entrega / Entregue</button>
                )}
              </div>
            </div>
          ))}
          {pedidos.length === 0 && <p className="text-sm text-neutral-400 text-center py-6">Nenhum pedido de delivery em andamento.</p>}
        </div>
      </div>

      {temPapel('gerente') && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
            <h2 className="font-bold dark:text-white mb-2">🏍️ Motoboys cadastrados</h2>
            {motoboys.map((m) => <p key={m.id} className="text-sm dark:text-neutral-200">{m.nome} — {m.telefone}</p>)}
            {motoboys.length === 0 && <p className="text-xs text-neutral-400">Nenhum motoboy cadastrado ainda.</p>}
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-4">
            <h2 className="font-bold dark:text-white mb-2">📍 Taxas por bairro</h2>
            {bairros.map((b) => <p key={b.id} className="text-sm dark:text-neutral-200">{b.bairro} — R$ {b.taxa_entrega.toFixed(2)}</p>)}
            {bairros.length === 0 && <p className="text-xs text-neutral-400">Nenhuma taxa cadastrada ainda.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
