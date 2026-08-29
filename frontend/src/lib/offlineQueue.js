// Fila offline — quando o balcão fica sem internet/rede, os pedidos criados
// localmente são guardados no IndexedDB do navegador e sincronizados
// automaticamente assim que a conexão com a API voltar.
import { openDB } from 'idb';
import { api } from './api';
import { useConexao } from './store';

const DB_NAME = 'kina-kana-offline';
const STORE = 'pedidos_pendentes';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'chaveLocal' });
      }
    },
  });
}

export async function salvarPedidoOffline(payload) {
  const db = await getDb();
  const chaveLocal = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.put(STORE, { chaveLocal, payload, criadoEm: new Date().toISOString(), tentativas: 0 });
  await atualizarContagemPendentes();
  return chaveLocal;
}

export async function listarPedidosOffline() {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function removerPedidoOffline(chaveLocal) {
  const db = await getDb();
  await db.delete(STORE, chaveLocal);
  await atualizarContagemPendentes();
}

export async function atualizarContagemPendentes() {
  const pendentes = await listarPedidosOffline();
  useConexao.getState().definirPendentes(pendentes.length);
  return pendentes.length;
}

// Tenta enviar todos os pedidos pendentes para a API. Chamado automaticamente
// quando o navegador detecta que voltou a ficar online.
export async function sincronizarPedidosOffline() {
  const pendentes = await listarPedidosOffline();
  for (const item of pendentes) {
    try {
      await api.post('/pedidos', item.payload);
      await removerPedidoOffline(item.chaveLocal);
    } catch (e) {
      // Mantém na fila para tentar novamente na próxima sincronização
      console.warn('Falha ao sincronizar pedido offline, tentará novamente:', e.message);
    }
  }
  await atualizarContagemPendentes();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    sincronizarPedidosOffline();
  });
  atualizarContagemPendentes();
}
