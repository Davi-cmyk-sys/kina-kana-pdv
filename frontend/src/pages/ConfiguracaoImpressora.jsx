import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { bluetoothSuportado, escanearEConectar, desconectar, estaConectada, nomeDispositivoAtual, imprimirTeste } from '../lib/bluetoothPrinter';

export default function ConfiguracaoImpressora() {
  const [config, setConfig] = useState(null);
  const [conectada, setConectada] = useState(estaConectada());
  const [nomeAtual, setNomeAtual] = useState(nomeDispositivoAtual());
  const [larguraMm, setLarguraMm] = useState(80);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [pendentes, setPendentes] = useState([]);
  const [errosImpressao, setErrosImpressao] = useState([]);

  useEffect(() => {
    api.get('/impressora/config').then((c) => { setConfig(c); setLarguraMm(c?.largura_mm || 80); });
    carregarFilas();
  }, []);

  function carregarFilas() {
    api.get('/impressora/pendentes').then(setPendentes).catch(() => {});
    api.get('/impressora/erros').then(setErrosImpressao).catch(() => {});
  }

  async function conectar() {
    setErro(''); setMensagem('');
    try {
      const { nome } = await escanearEConectar();
      setConectada(true);
      setNomeAtual(nome);
      await api.put('/impressora/config', { nomeDispositivo: nome, larguraMm });
      setMensagem(`Conectado a "${nome}" com sucesso!`);
    } catch (e) {
      setErro(e.message);
    }
  }

  function desconectarImpressora() {
    desconectar();
    setConectada(false);
    setNomeAtual(null);
    setMensagem('Impressora desconectada.');
  }

  async function testarImpressao() {
    setErro(''); setMensagem('');
    try {
      await imprimirTeste();
      setMensagem('Página de teste enviada! Verifique a impressora.');
    } catch (e) {
      setErro(e.message);
    }
  }

  async function salvarLargura(valor) {
    setLarguraMm(valor);
    await api.put('/impressora/config', { larguraMm: valor });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h1 className="font-display font-bold text-xl dark:text-white mb-1">🖨️ Configuração da Impressora Térmica</h1>
        <p className="text-sm text-neutral-500 mb-4">
          Conexão via Bluetooth (Web Bluetooth API). Disponível em navegadores Chromium (Chrome/Edge) no Android, Windows, macOS e Linux.
        </p>

        {!bluetoothSuportado() && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-3 text-sm mb-4">
            ⚠ Este navegador não suporta Web Bluetooth (ex: Safari/iOS). Use Chrome/Edge para conectar a impressora,
            ou utilize a opção "Imprimir pelo navegador" na tela de pagamento. Veja <code>docs/IMPRESSAO_BLUETOOTH.md</code> para arquiteturas alternativas.
          </div>
        )}

        <div className={`rounded-xl p-4 mb-4 border-2 ${conectada ? 'border-marca-400 bg-marca-50 dark:bg-marca-950/30' : 'border-neutral-200 dark:border-neutral-700'}`}>
          <p className="font-semibold dark:text-white">
            Status: {conectada ? <span className="text-marca-700 dark:text-marca-400">🟢 Conectada — {nomeAtual}</span> : <span className="text-neutral-500">⚪ Nenhuma impressora conectada</span>}
          </p>
          <div className="flex gap-2 mt-3">
            {!conectada ? (
              <button onClick={conectar} disabled={!bluetoothSuportado()} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white disabled:opacity-50">
                🔍 Buscar e Conectar
              </button>
            ) : (
              <>
                <button onClick={testarImpressao} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white">🧪 Teste de Impressão</button>
                <button onClick={desconectarImpressora} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-red-100 dark:bg-red-950/40 text-red-700">Desconectar</button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4">
          <p className="font-semibold text-sm mb-2 dark:text-white">Largura da bobina</p>
          <div className="flex gap-2">
            {[58, 80].map((l) => (
              <button key={l} onClick={() => salvarLargura(l)} className={`btn-toque flex-1 py-3 rounded-xl font-bold ${larguraMm === l ? 'bg-marca-700 text-white' : 'bg-neutral-100 dark:bg-neutral-800 dark:text-white'}`}>
                {l} mm
              </button>
            ))}
          </div>
        </div>

        {mensagem && <p className="text-marca-700 dark:text-marca-400 text-sm font-semibold">{mensagem}</p>}
        {erro && <p className="text-red-600 text-sm font-semibold">{erro}</p>}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="font-display font-bold text-lg dark:text-white mb-3">📋 Fichas pendentes de impressão</h2>
        {pendentes.length === 0 && <p className="text-sm text-neutral-500">Nenhuma ficha pendente. Tudo certo!</p>}
        <div className="space-y-2">
          {pendentes.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2">
              <span className="text-sm dark:text-white">Senha #{p.numero_senha} — R$ {p.total.toFixed(2)}</span>
              <span className="text-xs text-neutral-500">{new Date(p.criado_em).toLocaleTimeString('pt-BR')}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-2">Vá em "Pedidos" para reimprimir qualquer ficha pendente.</p>
      </div>

      {errosImpressao.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card border border-neutral-200 dark:border-neutral-800 p-5">
          <h2 className="font-display font-bold text-lg dark:text-white mb-3">⚠ Registro de erros de impressão</h2>
          <div className="space-y-2">
            {errosImpressao.map((e) => (
              <div key={e.id} className="text-sm border-l-4 border-red-400 pl-3">
                <p className="dark:text-white">Senha #{e.numero_senha} — {e.funcionario_nome} — {new Date(e.criado_em).toLocaleString('pt-BR')}</p>
                <p className="text-red-600">{e.erro}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
