// =========================================================================
// Impressora térmica Bluetooth (ESC/POS) via Web Bluetooth API
// =========================================================================
// LIMITAÇÕES IMPORTANTES (leia docs/IMPRESSAO_BLUETOOTH.md para mais detalhes):
// - Web Bluetooth só funciona em navegadores baseados em Chromium (Chrome,
//   Edge, Opera) no Android, Windows, macOS e Linux. NÃO funciona no Safari/iOS.
// - É preciso interação direta do usuário (clique em botão) para abrir o
//   seletor de dispositivos — não é possível conectar "sozinho" ao carregar
//   a página.
// - Cada impressora tem um UUID de serviço/característica Bluetooth próprio.
//   Os valores abaixo (SERVICE_UUID/CHARACTERISTIC_UUID) cobrem o padrão mais
//   comum entre impressoras térmicas genéricas ESC/POS; ajuste conforme o
//   modelo real da impressora usada na loja.
// =========================================================================

const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

let dispositivoConectado = null;
let characteristicAtual = null;

export function bluetoothSuportado() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

export async function escanearEConectar() {
  if (!bluetoothSuportado()) {
    throw new Error('Este navegador não suporta Web Bluetooth. Use Chrome/Edge no Android, Windows, macOS ou Linux.');
  }
  const dispositivo = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });
  const servidor = await dispositivo.gatt.connect();
  const servico = await servidor.getPrimaryService(SERVICE_UUID);
  const characteristic = await servico.getCharacteristic(CHARACTERISTIC_UUID);

  dispositivoConectado = dispositivo;
  characteristicAtual = characteristic;

  dispositivo.addEventListener('gattserverdisconnected', () => {
    dispositivoConectado = null;
    characteristicAtual = null;
  });

  return { nome: dispositivo.name || 'Impressora Bluetooth' };
}

export function desconectar() {
  if (dispositivoConectado?.gatt?.connected) {
    dispositivoConectado.gatt.disconnect();
  }
  dispositivoConectado = null;
  characteristicAtual = null;
}

export function estaConectada() {
  return !!dispositivoConectado?.gatt?.connected;
}

export function nomeDispositivoAtual() {
  return dispositivoConectado?.name || null;
}

// ---------------------------------------------------------------------
// Geração de comandos ESC/POS
// ---------------------------------------------------------------------
const ESC = 0x1b, GS = 0x1d;
const COMANDOS = {
  INICIALIZAR: [ESC, 0x40],
  ALINHAR_ESQUERDA: [ESC, 0x61, 0x00],
  ALINHAR_CENTRO: [ESC, 0x61, 0x01],
  NEGRITO_ON: [ESC, 0x45, 0x01],
  NEGRITO_OFF: [ESC, 0x45, 0x00],
  FONTE_GRANDE_ON: [GS, 0x21, 0x11],
  FONTE_NORMAL: [GS, 0x21, 0x00],
  FONTE_MUITO_GRANDE_ON: [GS, 0x21, 0x33],
  CORTAR_PAPEL: [GS, 0x56, 0x41, 0x00],
  PULAR_LINHA: [0x0a],
};

function textoParaBytes(texto) {
  return Array.from(new TextEncoder().encode(texto));
}

function linha(largura, char = '-') {
  return char.repeat(largura) + '\n';
}

/**
 * Constrói o array de bytes ESC/POS para a ficha de retirada, a partir dos
 * dados retornados por GET /api/pedidos/:id/ficha
 */
export function montarComandosFicha({ pedido, loja, viaOriginal }, larguraColunas = 42) {
  const bytes = [];
  const add = (arr) => bytes.push(...arr);
  const addTexto = (t) => add(textoParaBytes(t));

  add(COMANDOS.INICIALIZAR);
  add(COMANDOS.ALINHAR_CENTRO);
  add(COMANDOS.NEGRITO_ON);
  add(COMANDOS.FONTE_GRANDE_ON);
  addTexto((loja?.nome || 'Kina Kana Pastelaria') + '\n');
  add(COMANDOS.FONTE_NORMAL);
  add(COMANDOS.NEGRITO_OFF);
  if (loja?.endereco) addTexto(loja.endereco + '\n');
  if (loja?.telefone) addTexto(loja.telefone + '\n');
  addTexto(linha(larguraColunas, '='));

  addTexto(`${new Date(pedido.pago_em || pedido.criado_em).toLocaleString('pt-BR')}\n`);
  addTexto(!viaOriginal ? '*** REIMPRESSAO ***\n' : 'VIA ORIGINAL\n');
  addTexto(linha(larguraColunas, '='));

  add(COMANDOS.NEGRITO_ON);
  add(COMANDOS.FONTE_MUITO_GRANDE_ON);
  addTexto(`SENHA ${String(pedido.numero_senha).padStart(3, '0')}\n`);
  add(COMANDOS.FONTE_NORMAL);
  add(COMANDOS.NEGRITO_OFF);
  addTexto(linha(larguraColunas, '='));

  add(COMANDOS.ALINHAR_ESQUERDA);
  const tipoLabel = { balcao: 'Balcão', mesa: `Mesa ${pedido.mesa_numero || ''}`, delivery: 'Delivery', whatsapp: 'WhatsApp', qrcode: 'QR Code (mesa)', autoatendimento: 'Autoatendimento' }[pedido.tipo] || pedido.tipo;
  addTexto(`Tipo: ${tipoLabel}\n`);
  if (pedido.cliente_nome_cadastro || pedido.cliente_nome_avulso) {
    addTexto(`Cliente: ${pedido.cliente_nome_cadastro || pedido.cliente_nome_avulso}\n`);
  }
  addTexto(linha(larguraColunas));

  for (const item of pedido.itens) {
    add(COMANDOS.NEGRITO_ON);
    addTexto(`${item.quantidade}x ${item.nome_snapshot}\n`);
    add(COMANDOS.NEGRITO_OFF);
    addTexto(`   R$ ${item.preco_unitario.toFixed(2)} un | Subtotal R$ ${item.subtotal.toFixed(2)}\n`);
    if (item.observacao) addTexto(`   Obs: ${item.observacao}\n`);
    for (const ad of item.adicionais || []) {
      addTexto(`   + ${ad.quantidade}x ${ad.nome_snapshot} (R$ ${ad.preco_unitario.toFixed(2)})\n`);
    }
  }
  addTexto(linha(larguraColunas));

  const addLinhaValor = (rotulo, valor) => addTexto(`${rotulo.padEnd(largurasColuna(larguraColunas))}R$ ${valor.toFixed(2)}\n`);
  function largurasColuna(total) { return total - 12; }

  addLinhaValor('Subtotal', pedido.subtotal);
  if (pedido.desconto > 0) addLinhaValor('Desconto', -pedido.desconto);
  if (pedido.taxa_entrega > 0) addLinhaValor('Taxa entrega', pedido.taxa_entrega);
  add(COMANDOS.NEGRITO_ON);
  add(COMANDOS.FONTE_GRANDE_ON);
  addLinhaValor('TOTAL', pedido.total);
  add(COMANDOS.FONTE_NORMAL);
  add(COMANDOS.NEGRITO_OFF);
  addTexto(linha(larguraColunas));

  for (const pg of pedido.pagamentos || []) {
    const nomeForma = {
      dinheiro: 'Dinheiro', pix: 'Pix', credito: 'Cartão Crédito', debito: 'Cartão Débito',
      vale_refeicao: 'Vale-Refeição', vale_alimentacao: 'Vale-Alimentação', outros: 'Outros',
    }[pg.forma] || pg.forma;
    addTexto(`${nomeForma}: R$ ${pg.valor.toFixed(2)}\n`);
    if (pg.forma === 'dinheiro') {
      addTexto(`  Recebido: R$ ${(pg.valor_recebido || 0).toFixed(2)} | Troco: R$ ${(pg.troco || 0).toFixed(2)}\n`);
    }
  }
  addTexto(linha(larguraColunas));

  addTexto(`Atendente: ${pedido.funcionario_nome || ''}\n`);
  addTexto(linha(larguraColunas, '='));

  add(COMANDOS.ALINHAR_CENTRO);
  add(COMANDOS.NEGRITO_ON);
  addTexto('RETIRE SEU PEDIDO NO BALCAO\n');
  add(COMANDOS.NEGRITO_OFF);
  addTexto(`Pedido #${pedido.id}\n`);

  add(COMANDOS.PULAR_LINHA);
  add(COMANDOS.PULAR_LINHA);
  add(COMANDOS.PULAR_LINHA);
  add(COMANDOS.CORTAR_PAPEL);

  return new Uint8Array(bytes);
}

/**
 * Envia os bytes ESC/POS para a impressora conectada, dividindo em pedaços
 * pequenos (chunks) porque a maioria das impressoras BLE tem um limite de
 * ~180-244 bytes por escrita GATT.
 */
export async function imprimirFicha(dadosFicha, larguraColunas = 42) {
  if (!characteristicAtual) {
    throw new Error('Nenhuma impressora Bluetooth conectada. Conecte em Configurações > Impressora.');
  }
  const bytes = montarComandosFicha(dadosFicha, larguraColunas);
  const TAMANHO_CHUNK = 180;
  for (let i = 0; i < bytes.length; i += TAMANHO_CHUNK) {
    const pedaco = bytes.slice(i, i + TAMANHO_CHUNK);
    await characteristicAtual.writeValue(pedaco);
  }
}

export async function imprimirTeste() {
  if (!characteristicAtual) {
    throw new Error('Nenhuma impressora Bluetooth conectada.');
  }
  const bytes = [];
  bytes.push(...COMANDOS.INICIALIZAR, ...COMANDOS.ALINHAR_CENTRO, ...COMANDOS.NEGRITO_ON);
  bytes.push(...textoParaBytes('Kina Kana PDV\n'));
  bytes.push(...COMANDOS.NEGRITO_OFF);
  bytes.push(...textoParaBytes('Teste de impressao OK!\n'));
  bytes.push(...textoParaBytes(new Date().toLocaleString('pt-BR') + '\n'));
  bytes.push(...COMANDOS.PULAR_LINHA, ...COMANDOS.PULAR_LINHA, ...COMANDOS.CORTAR_PAPEL);
  await characteristicAtual.writeValue(new Uint8Array(bytes));
}
