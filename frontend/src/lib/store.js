import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

// -------------------------------------------------------------------
// AUTENTICAÇÃO
// -------------------------------------------------------------------
export const useAuth = create(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      async login(email, senha) {
        const resp = await api.post('/auth/login', { email, senha }, { semAuth: true });
        localStorage.setItem('kk_token', resp.token);
        set({ token: resp.token, usuario: resp.usuario });
        return resp.usuario;
      },
      logout() {
        localStorage.removeItem('kk_token');
        set({ token: null, usuario: null });
      },
      temPapel(...papeis) {
        const u = get().usuario;
        return !!u && (u.papel === 'admin' || papeis.includes(u.papel));
      },
    }),
    { name: 'kk-auth' }
  )
);

// -------------------------------------------------------------------
// TEMA (claro/escuro)
// -------------------------------------------------------------------
export const useTema = create(
  persist(
    (set, get) => ({
      escuro: false,
      alternar: () => set({ escuro: !get().escuro }),
    }),
    { name: 'kk-tema' }
  )
);

// -------------------------------------------------------------------
// CARRINHO / NOVO PEDIDO
// -------------------------------------------------------------------
let proximoIdLocal = 1;

export const useCarrinho = create((set, get) => ({
  itens: [], // { idLocal, produtoId?, comboId?, nome, precoUnitario, quantidade, observacao, adicionais[], comboEscolhas? }
  tipo: 'balcao',
  mesaNumero: '',
  clienteId: null,
  clienteNomeAvulso: '',
  clienteTelefoneAvulso: '',
  enderecoEntrega: '',
  observacoesGerais: '',
  desconto: { valor: 0, motivo: '', autorizadoPorId: null },
  taxaEntrega: 0,

  adicionarItem(item) {
    set((state) => ({
      itens: [...state.itens, { idLocal: proximoIdLocal++, quantidade: 1, adicionais: [], observacao: '', ...item }],
    }));
  },
  removerItem(idLocal) {
    set((state) => ({ itens: state.itens.filter((i) => i.idLocal !== idLocal) }));
  },
  alterarQuantidade(idLocal, delta) {
    set((state) => ({
      itens: state.itens
        .map((i) => (i.idLocal === idLocal ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i))
        .filter((i) => i.quantidade > 0),
    }));
  },
  definirObservacao(idLocal, observacao) {
    set((state) => ({ itens: state.itens.map((i) => (i.idLocal === idLocal ? { ...i, observacao } : i)) }));
  },
  definirAdicionais(idLocal, adicionais) {
    set((state) => ({ itens: state.itens.map((i) => (i.idLocal === idLocal ? { ...i, adicionais } : i)) }));
  },
  definirTipo(tipo) { set({ tipo }); },
  definirMesa(mesaNumero) { set({ mesaNumero }); },
  definirCliente(clienteId, nome, telefone) {
    set({ clienteId, clienteNomeAvulso: nome || '', clienteTelefoneAvulso: telefone || '' });
  },
  definirEndereco(enderecoEntrega) { set({ enderecoEntrega }); },
  definirObservacoesGerais(observacoesGerais) { set({ observacoesGerais }); },
  definirDesconto(desconto) { set({ desconto }); },
  definirTaxaEntrega(taxaEntrega) { set({ taxaEntrega }); },

  subtotalItem(item) {
    const adicionaisTotal = (item.adicionais || []).reduce((s, a) => s + a.preco * a.quantidade, 0);
    return (item.precoUnitario * item.quantidade) + adicionaisTotal;
  },
  subtotal() {
    return get().itens.reduce((s, item) => s + get().subtotalItem(item), 0);
  },
  total() {
    const subtotal = get().subtotal();
    const desconto = Number(get().desconto.valor || 0);
    const taxa = Number(get().taxaEntrega || 0);
    return Math.max(0, subtotal - desconto + taxa);
  },
  limpar() {
    set({
      itens: [], tipo: 'balcao', mesaNumero: '', clienteId: null, clienteNomeAvulso: '',
      clienteTelefoneAvulso: '', enderecoEntrega: '', observacoesGerais: '',
      desconto: { valor: 0, motivo: '', autorizadoPorId: null }, taxaEntrega: 0,
    });
  },
}));

// -------------------------------------------------------------------
// STATUS DE CONEXÃO (para o indicador "offline" e fila de sincronização)
// -------------------------------------------------------------------
export const useConexao = create((set) => ({
  online: navigator.onLine,
  pendentesSincronizar: 0,
  definirOnline: (online) => set({ online }),
  definirPendentes: (n) => set({ pendentesSincronizar: n }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useConexao.getState().definirOnline(true));
  window.addEventListener('offline', () => useConexao.getState().definirOnline(false));
}
