import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useCarrinho, useConexao } from '../lib/store';
import { salvarPedidoOffline } from '../lib/offlineQueue';
import ProductCard from '../components/ProductCard';
import ComboModal from '../components/ComboModal';
import CartPanel from '../components/CartPanel';
import PaymentModal from '../components/PaymentModal';

export default function NovoPedido() {
  const carrinho = useCarrinho();
  const { online } = useConexao();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [adicionais, setAdicionais] = useState([]);
  const [abaSelecionada, setAbaSelecionada] = useState(null);
  const [comboAberto, setComboAberto] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [pedidoCriado, setPedidoCriado] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/categorias'), api.get('/produtos'), api.get('/combos'), api.get('/adicionais'),
    ]).then(([cat, prod, comb, adi]) => {
      setCategorias(cat);
      setProdutos(prod);
      setCombos(comb);
      setAdicionais(adi);
      setAbaSelecionada(cat[0]?.id);
    }).catch((e) => setErro(e.message));
  }, []);

  // Monta as abas na ordem pedida: categorias de produto + abas virtuais "Combos" e "Adicionais"
  const abas = [];
  categorias.forEach((c, i) => {
    abas.push({ id: c.id, nome: c.nome, icone: c.icone, tipo: 'categoria' });
    if (i === 1) abas.push({ id: 'combos', nome: 'Combos', icone: '🍱', tipo: 'combos' });
  });
  abas.push({ id: 'adicionais', nome: 'Adicionais', icone: '➕', tipo: 'adicionais' });

  const abaAtual = abas.find((a) => a.id === abaSelecionada) || abas[0];

  function adicionarProduto(produto) {
    carrinho.adicionarItem({ produtoId: produto.id, nome: produto.nome, precoUnitario: produto.preco });
  }

  function adicionarAdicionalAvulso(ad) {
    carrinho.adicionarItem({ adicionalAvulsoId: ad.id, nome: ad.nome, precoUnitario: ad.preco });
  }

  function confirmarCombo(escolhas) {
    carrinho.adicionarItem({
      comboId: comboAberto.id, nome: comboAberto.nome, precoUnitario: comboAberto.preco, comboEscolhas: escolhas,
    });
    setComboAberto(null);
  }

  async function finalizarPedido() {
    setErro('');
    setEnviando(true);
    const payload = {
      tipo: carrinho.tipo,
      mesaNumero: carrinho.mesaNumero || null,
      clienteNomeAvulso: carrinho.clienteNomeAvulso || null,
      clienteTelefoneAvulso: carrinho.clienteTelefoneAvulso || null,
      enderecoEntrega: carrinho.enderecoEntrega || null,
      observacoesGerais: carrinho.observacoesGerais || null,
      taxaEntrega: carrinho.taxaEntrega,
      desconto: carrinho.desconto,
      itens: carrinho.itens.map((i) => ({
        produtoId: i.produtoId || undefined,
        comboId: i.comboId || undefined,
        adicionalAvulsoId: i.adicionalAvulsoId || undefined,
        quantidade: i.quantidade,
        observacao: i.observacao || undefined,
        comboEscolhas: i.comboEscolhas || undefined,
        adicionais: (i.adicionais || []).map((a) => ({ adicionalId: a.adicionalId, quantidade: a.quantidade })),
      })),
    };

    try {
      if (!online) {
        await salvarPedidoOffline(payload);
        carrinho.limpar();
        setEnviando(false);
        alert('Você está offline. O pedido foi salvo neste dispositivo e será enviado automaticamente quando a conexão voltar. Combine o pagamento manualmente com o cliente por enquanto.');
        return;
      }
      const pedido = await api.post('/pedidos', payload);
      setPedidoCriado(pedido);
    } catch (e) {
      setErro(e.message || 'Não foi possível criar o pedido.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 h-[calc(100vh-110px)]">
      <div className="flex flex-col min-h-0">
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1">
          {abas.map((a) => (
            <button
              key={a.id} onClick={() => setAbaSelecionada(a.id)}
              className={`btn-toque flex items-center gap-1.5 whitespace-nowrap px-4 py-3 rounded-xl font-bold text-sm shadow-card ${
                abaAtual.id === a.id ? 'bg-brasa-laranja text-white' : 'bg-white dark:bg-neutral-800 dark:text-neutral-200'
              }`}
            >
              <span className="text-lg">{a.icone}</span> {a.nome}
            </button>
          ))}
        </div>

        {erro && <p className="text-red-600 text-sm font-semibold mb-2">{erro}</p>}

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
            {abaAtual?.tipo === 'categoria' && produtos.filter((p) => p.categoria_id === abaAtual.id).map((p) => (
              <ProductCard key={p.id} nome={p.nome} preco={p.preco} imagem={p.imagem} cor={p.cor} esgotado={!!p.esgotado} descricao={p.descricao} onClick={() => adicionarProduto(p)} />
            ))}
            {abaAtual?.tipo === 'combos' && combos.map((c) => (
              <ProductCard key={c.id} nome={c.nome} preco={c.preco} imagem={c.imagem} cor={c.cor} descricao={c.descricao} onClick={() => setComboAberto(c)} />
            ))}
            {abaAtual?.tipo === 'adicionais' && adicionais.map((a) => (
              <ProductCard key={a.id} nome={a.nome} preco={a.preco} imagem="➕" cor="lime" onClick={() => adicionarAdicionalAvulso(a)} />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0">
        <CartPanel onFinalizar={finalizarPedido} enviando={enviando} />
      </div>

      {comboAberto && (
        <ComboModal combo={comboAberto} onFechar={() => setComboAberto(null)} onConfirmar={confirmarCombo} />
      )}

      {pedidoCriado && (
        <PaymentModal
          pedido={pedidoCriado}
          onFechado={() => {
            setPedidoCriado(null);
            carrinho.limpar();
            navigate('/pedidos');
          }}
        />
      )}
    </div>
  );
}
