// Cliente HTTP simples para a API do Kina Kana PDV.
// Centraliza o cabeçalho de autenticação e o tratamento de erros em português.

const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('kk_token');
}

async function request(path, { method = 'GET', body, semAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token && !semAuth) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (erroRede) {
    const erro = new Error('Sem conexão com o servidor. Verifique sua internet/rede local.');
    erro.offline = true;
    throw erro;
  }

  let dados = null;
  const texto = await resposta.text();
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }

  if (!resposta.ok) {
    const erro = new Error((dados && dados.erro) || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
  }
  return dados;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
};

export function csvUrl(path) {
  const token = getToken();
  return `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${token || ''}`;
}
