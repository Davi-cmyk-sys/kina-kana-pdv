import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// Tela pública para TV do balcão — sem autenticação, mostra apenas as senhas
// prontas para retirada. Ficar em tela cheia ligada no monitor/TV da loja.
export default function TVBalcao() {
  const [pedidos, setPedidos] = useState([]);
  const ultimaSenhaAnunciada = useRef(null);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, []);

  function carregar() {
    api.get('/pedidos/prontos-tv').then((lista) => {
      setPedidos(lista);
      const maisRecente = lista.find((p) => p.status === 'pronto');
      if (maisRecente && maisRecente.numero_senha !== ultimaSenhaAnunciada.current) {
        ultimaSenhaAnunciada.current = maisRecente.numero_senha;
        falarSenha(maisRecente.numero_senha);
      }
    }).catch(() => {});
  }

  function falarSenha(numero) {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(`Senha ${numero}. Pedido pronto para retirada.`);
      msg.lang = 'pt-BR';
      window.speechSynthesis.speak(msg);
    }
  }

  const prontos = pedidos.filter((p) => p.status === 'pronto');
  const entreguesRecentes = pedidos.filter((p) => p.status === 'entregue').slice(0, 8);

  return (
    <div className="min-h-screen bg-marca-900 text-white flex flex-col items-center p-6">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo.svg" alt="Kina Kana" className="w-16 h-16 rounded-full bg-white" />
        <div>
          <h1 className="font-display font-extrabold text-3xl">Kina Kana</h1>
          <p className="text-marca-200">Pedidos Prontos para Retirada</p>
        </div>
      </div>

      {prontos.length === 0 ? (
        <p className="text-2xl text-marca-200 mt-16">Aguardando pedidos...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full max-w-5xl mt-4">
          {prontos.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-3xl p-6 text-center shadow-2xl ${i === 0 ? 'bg-amber-400 text-marca-950 animate-pulse scale-105' : 'bg-white text-marca-900'}`}
            >
              <p className="text-6xl font-extrabold">{String(p.numero_senha).padStart(3, '0')}</p>
            </div>
          ))}
        </div>
      )}

      {prontos[0] && (
        <p className="mt-8 text-2xl font-bold text-center">
          Senha {String(prontos[0].numero_senha).padStart(3, '0')} — Pedido pronto para retirada.
        </p>
      )}

      {entreguesRecentes.length > 0 && (
        <div className="mt-10 opacity-60">
          <p className="text-sm text-center mb-2">Já retirados</p>
          <div className="flex gap-3 flex-wrap justify-center">
            {entreguesRecentes.map((p) => (
              <span key={p.id} className="text-lg font-bold bg-marca-800 px-3 py-1 rounded-full">{String(p.numero_senha).padStart(3, '0')}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
