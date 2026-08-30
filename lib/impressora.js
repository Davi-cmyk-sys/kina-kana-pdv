"use client";

// Integração com impressoras térmicas de recibo via Web Bluetooth (ESC/POS).
// Funciona só em navegadores com suporte a Web Bluetooth (Chrome/Edge no
// Windows, Android e ChromeOS). NÃO funciona no Safari/iOS.
//
// UUIDs usados por praticamente todas as miniimpressoras térmicas Bluetooth
// "genéricas" vendidas no Brasil (ex.: MPT-II, Goojprt PT-210 e clones).
// Ainda não testamos com uma impressora física nesta reconstrução — se o
// pareamento ou a impressão falharem com o aparelho real, provavelmente é
// só ajustar esses UUIDs/comandos para o modelo específico.
const SERVICO_IMPRESSORA = "000018f0-0000-1000-8000-00805f9b34fb";
const CARACTERISTICA_IMPRESSORA = "00002af1-0000-1000-8000-00805f9b34fb";

const CHAVE_LOCALSTORAGE = "kkpdv_impressora";

let caracteristicaAtual = null;
let dispositivoAtual = null;

export function navegadorSuportaBluetooth() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

export function impressoraConectada() {
  return !!caracteristicaAtual && !!dispositivoAtual?.gatt?.connected;
}

export function nomeImpressoraSalva() {
  if (typeof window === "undefined") return null;
  try {
    const salvo = window.localStorage.getItem(CHAVE_LOCALSTORAGE);
    return salvo ? JSON.parse(salvo).nome : null;
  } catch {
    return null;
  }
}

function salvarImpressoraLocal(nome) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAVE_LOCALSTORAGE,
      JSON.stringify({ nome, salvoEm: new Date().toISOString() })
    );
  } catch {
    // localStorage indisponível — não é crítico, só perde a lembrança do nome.
  }
}

export async function parearImpressora() {
  if (!navegadorSuportaBluetooth()) {
    throw new Error(
      "Esse navegador não tem suporte a Bluetooth. Use o Chrome ou o Edge no computador, ou o Chrome no Android."
    );
  }

  const dispositivo = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICO_IMPRESSORA] }],
    optionalServices: [SERVICO_IMPRESSORA],
  });

  const servidor = await dispositivo.gatt.connect();
  const servico = await servidor.getPrimaryService(SERVICO_IMPRESSORA);
  const caracteristica = await servico.getCharacteristic(
    CARACTERISTICA_IMPRESSORA
  );

  dispositivo.addEventListener("gattserverdisconnected", () => {
    caracteristicaAtual = null;
  });

  dispositivoAtual = dispositivo;
  caracteristicaAtual = caracteristica;
  salvarImpressoraLocal(dispositivo.name || "Impressora sem nome");

  return dispositivo.name || "Impressora sem nome";
}

function removerAcentos(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

const ESC = 0x1b;
const GS = 0x1d;

function montarComandosEscPos(linhas) {
  const partes = [];

  partes.push(new Uint8Array([ESC, 0x40])); // inicializa

  for (const linha of linhas) {
    const texto = removerAcentos(linha.texto ?? "");
    const bytesTexto = new TextEncoder().encode(texto + "\n");

    const alinhamento = { esquerda: 0, centro: 1, direita: 2 }[
      linha.alinhamento ?? "esquerda"
    ];
    partes.push(new Uint8Array([ESC, 0x61, alinhamento]));
    partes.push(new Uint8Array([ESC, 0x45, linha.negrito ? 1 : 0]));
    partes.push(bytesTexto);
  }

  partes.push(new Uint8Array([ESC, 0x45, 0])); // negrito off
  partes.push(new Uint8Array([0x0a, 0x0a, 0x0a])); // avança papel
  partes.push(new Uint8Array([GS, 0x56, 0x00])); // corta papel

  const tamanhoTotal = partes.reduce((s, p) => s + p.length, 0);
  const resultado = new Uint8Array(tamanhoTotal);
  let offset = 0;
  for (const parte of partes) {
    resultado.set(parte, offset);
    offset += parte.length;
  }
  return resultado;
}

async function enviarBytes(caracteristica, bytes) {
  const TAMANHO_BLOCO = 100;
  for (let i = 0; i < bytes.length; i += TAMANHO_BLOCO) {
    const bloco = bytes.slice(i, i + TAMANHO_BLOCO);
    if (caracteristica.writeValueWithoutResponse) {
      await caracteristica.writeValueWithoutResponse(bloco);
    } else {
      await caracteristica.writeValue(bloco);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export async function imprimirLinhas(linhas) {
  if (!impressoraConectada()) {
    throw new Error(
      'Nenhuma impressora conectada. Vá em "Configuração de Impressora" e pareie a impressora primeiro.'
    );
  }
  const bytes = montarComandosEscPos(linhas);
  await enviarBytes(caracteristicaAtual, bytes);
}

export async function imprimirTeste() {
  await imprimirLinhas([
    { texto: "Kina Kana PDV", alinhamento: "centro", negrito: true },
    { texto: "Teste de impressão", alinhamento: "centro" },
    { texto: "--------------------------------" },
    { texto: new Date().toLocaleString("pt-BR") },
    { texto: "Se você está lendo isso, a" },
    { texto: "impressora está funcionando!" },
  ]);
}

const NOMES_FORMA_PAGAMENTO = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  vale_refeicao: "Vale-refeição",
  vale_alimentacao: "Vale-alimentação",
  outros: "Outros",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Monta as linhas do comprovante a partir dos dados de um pedido.
// Aceita tanto o formato usado no carrinho (Novo Pedido) quanto o formato
// vindo do banco (tela Pedidos/histórico) — veja os dois campos opcionais.
export function formatarRecibo({
  numeroSenha,
  dataHora,
  itens,
  subtotal,
  desconto,
  total,
  formaPagamento,
  troco,
}) {
  const linhas = [
    { texto: "Kina Kana Pastelaria", alinhamento: "centro", negrito: true },
    { texto: "--------------------------------", alinhamento: "centro" },
    { texto: `Senha: ${numeroSenha}`, alinhamento: "centro", negrito: true },
    {
      texto: new Date(dataHora).toLocaleString("pt-BR"),
      alinhamento: "centro",
    },
    { texto: "--------------------------------" },
  ];

  for (const item of itens) {
    linhas.push({
      texto: `${item.quantidade}x ${item.nome}  ${formatoMoeda.format(
        item.precoTotal
      )}`,
    });
    if (item.escolhas?.length) {
      linhas.push({ texto: `  (${item.escolhas.join(", ")})` });
    }
    for (const adicional of item.adicionais ?? []) {
      linhas.push({
        texto: `  + ${adicional.nome} ${formatoMoeda.format(adicional.preco)}`,
      });
    }
  }

  linhas.push({ texto: "--------------------------------" });
  linhas.push({ texto: `Subtotal: ${formatoMoeda.format(subtotal)}` });
  if (desconto > 0) {
    linhas.push({ texto: `Desconto: -${formatoMoeda.format(desconto)}` });
  }
  linhas.push({
    texto: `TOTAL: ${formatoMoeda.format(total)}`,
    negrito: true,
  });
  linhas.push({
    texto: `Pagamento: ${NOMES_FORMA_PAGAMENTO[formaPagamento] ?? formaPagamento}`,
  });
  if (troco > 0) {
    linhas.push({ texto: `Troco: ${formatoMoeda.format(troco)}` });
  }
  linhas.push({ texto: "--------------------------------", alinhamento: "centro" });
  linhas.push({ texto: "Obrigado pela preferência!", alinhamento: "centro" });

  return linhas;
}
