import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { estaConectada, imprimirFicha } from '../lib/bluetoothPrinter';

const NOMES_FORMA = {
  dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão Crédito', debito: 'Cartão Débito',
  vale_refeicao: 'Vale-Refeição', vale_alimentacao: 'Vale-Alimentação', outros: 'Outros',
};
const NOMES_TIPO = {
  balcao: 'Balcão', mesa: 'Mesa', delivery: 'Delivery', whatsapp: 'WhatsApp', qrcode: 'QR Code (mesa)', autoatendimento: 'Autoatendimento',
};

export default function TicketPreview({ pedidoId, tipoImpressao = 'original', onFechado }) {
  const [ficha, setFicha] = useState(null);
  const [status, setStatus] = useState('carregando'); // carregando | pronto | imprimindo | sucesso | falha
  const [mensagemErro, setMensagemErro] = useState('');

  useEffect(() => {
    api.get(`/pedidos/${pedidoId}/ficha`).then((f) => { setFicha(f); setStatus('pronto'); }).catch((e) => setMensagemErro(e.message));
  }, [pedidoId]);

  async function imprimirBluetooth() {
    setStatus('imprimindo');
    setMensagemErro('');
    try {
      if (!estaConectada()) {
        throw new Error('Nenhuma impressora Bluetooth conectada. Vá em Impressora nas configurações para conectar.');
      }
      await imprimirFicha(ficha);
      await api.post(`/pedidos/${pedidoId}/registrar-impressao`, { sucesso: true, tipo: tipoImpressao });
      setStatus('sucesso');
    } catch (e) {
      setMensagemErro(e.message);
      setStatus('falha');
      // O pedido continua marcado como PAGO no banco — nunca se perde uma venda por falha de impressão.
      try {
        await api.post(`/pedidos/${pedidoId}/registrar-impressao`, { sucesso: false, tipo: tipoImpressao, erro: e.message });
      } catch { /* ignore erro de log */ }
    }
  }

  async function imprimirPeloNavegador() {
    window.print();
    await api.post(`/pedidos/${pedidoId}/registrar-impressao`, { sucesso: true, tipo: tipoImpressao }).catch(() => {});
    setStatus('sucesso');
  }

  if (status === 'carregando') return <div className="p-8 text-center dark:text-white">Carregando ficha...</div>;
  if (!ficha) return <div className="p-8 text-center text-red-600">{mensagemErro || 'Não foi possível carregar a ficha.'}</div>;

  const { pedido, loja, viaOriginal } = ficha;

  return (
    <div className="p-4">
      {pedido.status === 'pago' || pedido.status === 'em_preparo' || pedido.status === 'pronto' || pedido.status === 'entregue' ? (
        <div className="text-center mb-3">
          <p className="text-sm text-neutral-500">Pedido confirmado!</p>
          <p className="text-5xl font-extrabold text-marca-700 dark:text-marca-400">#{String(pedido.numero_senha).padStart(3, '0')}</p>
        </div>
      ) : null}

      <div id="ficha-impressao" className="mx-auto max-w-[300px] bg-white text-black font-mono text-xs border border-dashed border-neutral-400 p-3 rounded-lg">
        <p className="text-center font-bold text-sm">{loja?.nome}</p>
        {loja?.endereco && <p className="text-center">{loja.endereco}</p>}
        {loja?.telefone && <p className="text-center">{loja.telefone}</p>}
        <p className="text-center my-1">================================</p>
        <p>{new Date(pedido.pago_em || pedido.criado_em).toLocaleString('pt-BR')}</p>
        <p className="text-center font-bold">{!(viaOriginal && tipoImpressao === 'original') ? '*** REIMPRESSÃO ***' : 'VIA ORIGINAL'}</p>
        <p className="text-center my-1">================================</p>
        <p className="text-center font-extrabold text-lg">SENHA {String(pedido.numero_senha).padStart(3, '0')}</p>
        <p className="text-center my-1">================================</p>
        <p>Tipo: {NOMES_TIPO[pedido.tipo] || pedido.tipo}{pedido.mesa_numero ? ` ${pedido.mesa_numero}` : ''}</p>
        {(pedido.cliente_nome_cadastro || pedido.cliente_nome_avulso) && <p>Cliente: {pedido.cliente_nome_cadastro || pedido.cliente_nome_avulso}</p>}
        <p>--------------------------------</p>
        {pedido.itens.map((item) => (
          <div key={item.id} className="mb-1">
            <p className="font-bold">{item.quantidade}x {item.nome_snapshot}</p>
            <p>  R$ {item.preco_unitario.toFixed(2)} un | Subt. R$ {item.subtotal.toFixed(2)}</p>
            {item.observacao && <p>  Obs: {item.observacao}</p>}
            {(item.adicionais || []).map((a) => (
              <p key={a.id}>  + {a.quantidade}x {a.nome_snapshot}</p>
            ))}
          </div>
        ))}
        <p>--------------------------------</p>
        <p>Subtotal{' '.repeat(18)}R$ {pedido.subtotal.toFixed(2)}</p>
        {pedido.desconto > 0 && <p>Desconto{' '.repeat(18)}-R$ {pedido.desconto.toFixed(2)}</p>}
        {pedido.taxa_entrega > 0 && <p>Taxa entrega{' '.repeat(14)}R$ {pedido.taxa_entrega.toFixed(2)}</p>}
        <p className="font-bold text-sm">TOTAL{' '.repeat(21)}R$ {pedido.total.toFixed(2)}</p>
        <p>--------------------------------</p>
        {(pedido.pagamentos || []).map((pg) => (
          <div key={pg.id}>
            <p>{NOMES_FORMA[pg.forma] || pg.forma}: R$ {pg.valor.toFixed(2)}</p>
            {pg.forma === 'dinheiro' && <p>  Receb: R$ {(pg.valor_recebido || 0).toFixed(2)} Troco: R$ {(pg.troco || 0).toFixed(2)}</p>}
          </div>
        ))}
        <p>--------------------------------</p>
        <p>Atendente: {pedido.funcionario_nome}</p>
        <p className="text-center my-1">================================</p>
        <p className="text-center font-bold">RETIRE SEU PEDIDO NO BALCÃO</p>
        <p className="text-center">Pedido #{pedido.id}</p>
      </div>

      {mensagemErro && status === 'falha' && (
        <p className="text-red-600 text-sm font-semibold text-center mt-3">
          ⚠ Falha ao imprimir: {mensagemErro}<br />
          <span className="font-normal">O pedido já está salvo e pago — você pode reimprimir depois em "Pedidos".</span>
        </p>
      )}
      {status === 'sucesso' && <p className="text-marca-700 dark:text-marca-400 text-sm font-semibold text-center mt-3">✅ Ficha enviada para impressão!</p>}

      <div className="flex gap-2 mt-4">
        <button onClick={imprimirPeloNavegador} className="btn-toque flex-1 py-3 rounded-xl font-semibold bg-neutral-200 dark:bg-neutral-800 dark:text-white text-sm">
          🖨️ Imprimir (navegador)
        </button>
        <button onClick={imprimirBluetooth} className="btn-toque flex-1 py-3 rounded-xl font-bold bg-marca-700 hover:bg-marca-800 text-white text-sm">
          📶 Imprimir (Bluetooth)
        </button>
      </div>
      <button onClick={onFechado} className="btn-toque w-full mt-2 py-3 rounded-xl font-semibold bg-brasa-vermelho text-white">
        Concluir e novo pedido
      </button>
    </div>
  );
}
