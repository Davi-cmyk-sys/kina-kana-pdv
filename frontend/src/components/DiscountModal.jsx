import { useState } from 'react';
import { api } from '../lib/api';

export default function DiscountModal({ subtotal, limiteAutorizacao, onFechar, onAplicar }) {
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const valorNum = Number(valor || 0);
  const precisaAutorizacao = valorNum > limiteAutorizacao;

  async function aplicar() {
    setErro('');
    if (valorNum <= 0) return setErro('Informe um valor de desconto válido.');
    if (valorNum > subtotal) return setErro('O desconto não pode ser maior que o subtotal.');
    if (!motivo) return setErro('Informe o motivo do desconto.');

    let autorizadoPorId = null;
    if (precisaAutorizacao) {
      if (!pin) return setErro('Descontos altos exigem o PIN do gerente.');
      setEnviando(true);
      try {
        const resp = await api.post('/auth/autorizar-gerente', { pin });
        autorizadoPorId = resp.autorizadoPorId;
      } catch (e) {
        setEnviando(false);
        return setErro('PIN de gerente inválido.');
      }
      setEnviando(false);
    }

    onAplicar({ valor: valorNum, motivo, autorizadoPorId });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-sm shadow-2xl p-5">
        <h2 className="font-display font-bold text-lg mb-1 dark:text-white">Aplicar desconto</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Descontos acima de R$ {limiteAutorizacao.toFixed(2)} exigem autorização de um gerente.
        </p>

        <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Valor do desconto (R$)</label>
        <input
          type="number" min="0" step="0.5" value={valor} onChange={(e) => setValor(e.target.value)}
          className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2 mb-3"
        />

        <label className="block text-sm font-semibold mb-1 dark:text-neutral-200">Motivo</label>
        <input
          value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: cliente fidelidade, cortesia..."
          className="w-full rounded-xl border-2 border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white px-3 py-2 mb-3"
        />

        {precisaAutorizacao && (
          <>
            <label className="block text-sm font-semibold mb-1 text-amber-700 dark:text-amber-400">PIN do gerente 🔒</label>
            <input
              type="password" value={pin} onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border-2 border-amber-300 dark:border-amber-700 dark:bg-neutral-800 dark:text-white px-3 py-2 mb-3"
            />
          </>
        )}

        {erro && <p className="text-red-600 text-sm font-semibold mb-2">{erro}</p>}

        <div className="flex gap-2 mt-2">
          <button onClick={onFechar} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white">
            Cancelar
          </button>
          <button disabled={enviando} onClick={aplicar} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white disabled:opacity-60">
            {enviando ? 'Verificando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
