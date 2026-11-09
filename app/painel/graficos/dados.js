// Busca e soma os números da tela de Gráficos. Tudo é contado no fuso da
// loja (Fortaleza, UTC-3): o servidor roda em UTC, e sem isso as vendas
// depois das 21h cairiam no dia seguinte e as horas sairiam 3h adiantadas.

export const FUSO = "America/Fortaleza";
const DESLOCAMENTO = "-03:00"; // Fortaleza não tem horário de verão

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  hourCycle: "h23",
});

export function diaLocal(data) {
  return formatoDia.format(new Date(data));
}
function horaLocal(data) {
  return Number(formatoHora.format(new Date(data)));
}
export function hojeLocal() {
  return diaLocal(new Date());
}
export function somarDias(diaIso, dias) {
  const d = new Date(`${diaIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function inicioDoDiaUtc(diaIso) {
  return new Date(`${diaIso}T00:00:00${DESLOCAMENTO}`).toISOString();
}
function diasEntre(deIso, ateIso) {
  return Math.round(
    (new Date(`${ateIso}T12:00:00Z`) - new Date(`${deIso}T12:00:00Z`)) / 864e5
  ) + 1;
}

export const PERIODOS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "ontem", rotulo: "Ontem" },
  { chave: "7d", rotulo: "7 dias" },
  { chave: "30d", rotulo: "30 dias" },
  { chave: "mes", rotulo: "Este mês" },
  { chave: "mes_passado", rotulo: "Mês passado" },
];

// Período escolhido (atalho ou datas de/até), sempre em dias locais.
export function resolverPeriodo(params) {
  const hoje = hojeLocal();
  const valido = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

  if (valido(params?.de) && valido(params?.ate)) {
    let de = params.de;
    let ate = params.ate;
    if (de > ate) [de, ate] = [ate, de];
    if (diasEntre(de, ate) > 366) de = somarDias(ate, -365);
    return { chave: "personalizado", de, ate };
  }

  const chave = PERIODOS.some((p) => p.chave === params?.periodo)
    ? params.periodo
    : "7d";
  const primeiroDoMes = `${hoje.slice(0, 7)}-01`;
  switch (chave) {
    case "hoje":
      return { chave, de: hoje, ate: hoje };
    case "ontem": {
      const ontem = somarDias(hoje, -1);
      return { chave, de: ontem, ate: ontem };
    }
    case "30d":
      return { chave, de: somarDias(hoje, -29), ate: hoje };
    case "mes":
      return { chave, de: primeiroDoMes, ate: hoje };
    case "mes_passado": {
      const fim = somarDias(primeiroDoMes, -1);
      const inicio = `${fim.slice(0, 7)}-01`;
      return { chave, de: inicio, ate: fim };
    }
    default:
      return { chave: "7d", de: somarDias(hoje, -6), ate: hoje };
  }
}

// O Supabase devolve no máximo 1000 linhas por consulta: busca em páginas
// para não perder vendas em períodos longos.
async function buscarTudo(montarConsulta) {
  const tamanho = 1000;
  const todas = [];
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await montarConsulta().range(
      inicio,
      inicio + tamanho - 1
    );
    if (error) throw error;
    todas.push(...(data ?? []));
    if (!data || data.length < tamanho) break;
  }
  return todas;
}

const STATUS_FORA = "(aberto,cancelado)";

export async function carregarDados(supabase, { de, ate }) {
  const dias = diasEntre(de, ate);
  const deAnterior = somarDias(de, -dias);
  const desdeUtc = inicioDoDiaUtc(deAnterior);
  const inicioUtc = inicioDoDiaUtc(de);
  const fimUtc = inicioDoDiaUtc(somarDias(ate, 1));

  const [pedidos, itens, pagamentos, produtosR, combosR, categoriasR] =
    await Promise.all([
      buscarTudo(() =>
        supabase
          .from("pedidos")
          .select("id, total, desconto, criado_em")
          .not("status", "in", STATUS_FORA)
          .gte("criado_em", desdeUtc)
          .lt("criado_em", fimUtc)
          .order("id", { ascending: true })
      ),
      buscarTudo(() =>
        supabase
          .from("itens_pedido")
          .select(
            "id, pedido_id, produto_id, combo_id, nome_snapshot, quantidade, subtotal, pedidos!inner(criado_em, status)"
          )
          .not("pedidos.status", "in", STATUS_FORA)
          .gte("pedidos.criado_em", desdeUtc)
          .lt("pedidos.criado_em", fimUtc)
          .order("id", { ascending: true })
      ),
      buscarTudo(() =>
        supabase
          .from("pagamentos")
          .select("id, pedido_id, forma, valor, pedidos!inner(criado_em, status)")
          .not("pedidos.status", "in", STATUS_FORA)
          .gte("pedidos.criado_em", inicioUtc)
          .lt("pedidos.criado_em", fimUtc)
          .order("id", { ascending: true })
      ),
      supabase.from("produtos").select("id, codigo, nome, custo, categoria_id"),
      supabase.from("combos").select("id, nome, custo"),
      supabase.from("categorias").select("id, nome, icone, ordem"),
    ]);

  return montarResumo({
    de,
    ate,
    dias,
    inicioUtc,
    pedidos,
    itens,
    pagamentos,
    produtos: produtosR.data ?? [],
    combos: combosR.data ?? [],
    categorias: categoriasR.data ?? [],
  });
}

function vazioDoDia() {
  return { faturamento: 0, custo: 0, pedidos: 0 };
}

export function montarResumo({
  de,
  dias,
  inicioUtc,
  pedidos,
  itens,
  pagamentos,
  produtos,
  combos,
  categorias,
}) {
  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
  const comboPorId = new Map(combos.map((c) => [c.id, c]));
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const inicio = new Date(inicioUtc).getTime();

  // Pedidos do período atual x anterior
  const pedidoAtual = new Map();
  const anterior = { faturamento: 0, custo: 0, pedidos: 0 };
  const atual = { faturamento: 0, custo: 0, pedidos: 0, descontos: 0 };
  for (const p of pedidos) {
    const doPeriodo = new Date(p.criado_em).getTime() >= inicio;
    const alvo = doPeriodo ? atual : anterior;
    alvo.faturamento += Number(p.total) || 0;
    alvo.pedidos += 1;
    if (doPeriodo) {
      atual.descontos += Number(p.desconto) || 0;
      pedidoAtual.set(p.id, {
        dia: diaLocal(p.criado_em),
        hora: horaLocal(p.criado_em),
      });
    }
  }

  // Linhas do gráfico de tempo: por hora (1 dia) ou por dia.
  const porTempo = new Map();
  if (dias === 1) {
    for (let h = 0; h < 24; h++) porTempo.set(h, vazioDoDia());
  } else {
    for (let i = 0; i < dias; i++) porTempo.set(somarDias(de, i), vazioDoDia());
  }
  const chaveTempo = (info) => (dias === 1 ? info.hora : info.dia);
  for (const p of pedidos) {
    const info = pedidoAtual.get(p.id);
    if (!info) continue;
    const linha = porTempo.get(chaveTempo(info));
    if (!linha) continue;
    linha.faturamento += Number(p.total) || 0;
    linha.pedidos += 1;
  }

  // Movimento (nº de pedidos) por hora do dia, somando o período todo
  const movimentoPorHora = Array.from({ length: 24 }, () => 0);
  for (const info of pedidoAtual.values()) movimentoPorHora[info.hora] += 1;

  // Itens: custo, ranking de produtos e categorias
  const porProduto = new Map();
  const porCategoria = new Map();
  for (const item of itens) {
    const quantidade = Number(item.quantidade) || 0;
    const subtotal = Number(item.subtotal) || 0;
    const produto = item.produto_id ? produtoPorId.get(item.produto_id) : null;
    const combo = item.combo_id ? comboPorId.get(item.combo_id) : null;
    const custoUnitario = Number(produto?.custo ?? combo?.custo ?? 0) || 0;
    const custo = custoUnitario * quantidade;

    const info = pedidoAtual.get(item.pedido_id);
    if (!info) {
      anterior.custo += custo;
      continue;
    }
    atual.custo += custo;
    const linhaTempo = porTempo.get(chaveTempo(info));
    if (linhaTempo) linhaTempo.custo += custo;

    const chave = produto
      ? `p${produto.id}`
      : combo
      ? `c${combo.id}`
      : `n${item.nome_snapshot}`;
    const registro = porProduto.get(chave) ?? {
      chave,
      nome: produto?.nome ?? combo?.nome ?? item.nome_snapshot,
      codigo: produto?.codigo ?? null,
      tipo: combo ? "combo" : "produto",
      quantidade: 0,
      faturamento: 0,
      custo: 0,
      semCusto: custoUnitario <= 0,
    };
    registro.quantidade += quantidade;
    registro.faturamento += subtotal;
    registro.custo += custo;
    porProduto.set(chave, registro);

    const categoria = produto ? categoriaPorId.get(produto.categoria_id) : null;
    const nomeCategoria = combo
      ? "🍱 Combos"
      : categoria
      ? `${categoria.icone ? categoria.icone + " " : ""}${categoria.nome}`
      : "Outros";
    porCategoria.set(
      nomeCategoria,
      (porCategoria.get(nomeCategoria) ?? 0) + subtotal
    );
  }

  const produtosVendidos = Array.from(porProduto.values()).map((p) => ({
    ...p,
    lucro: p.faturamento - p.custo,
    margem: p.faturamento > 0 ? ((p.faturamento - p.custo) / p.faturamento) * 100 : 0,
  }));

  const formas = {};
  for (const pg of pagamentos) {
    formas[pg.forma] = (formas[pg.forma] ?? 0) + (Number(pg.valor) || 0);
  }

  const lucro = atual.faturamento - atual.custo;
  const lucroAnterior = anterior.faturamento - anterior.custo;

  return {
    dias,
    kpis: {
      faturamento: atual.faturamento,
      faturamentoAnterior: anterior.faturamento,
      lucro,
      lucroAnterior,
      margem: atual.faturamento > 0 ? (lucro / atual.faturamento) * 100 : 0,
      pedidos: atual.pedidos,
      pedidosAnterior: anterior.pedidos,
      ticket: atual.pedidos ? atual.faturamento / atual.pedidos : 0,
      ticketAnterior: anterior.pedidos ? anterior.faturamento / anterior.pedidos : 0,
      descontos: atual.descontos,
    },
    porTempo: Array.from(porTempo.entries()).map(([chave, v]) => ({
      chave,
      ...v,
      lucro: v.faturamento - v.custo,
    })),
    movimentoPorHora,
    produtos: produtosVendidos,
    categorias: Array.from(porCategoria.entries())
      .map(([nome, faturamento]) => ({ nome, faturamento }))
      .sort((a, b) => b.faturamento - a.faturamento),
    formas,
    produtosSemCusto: produtos.filter((p) => !(Number(p.custo) > 0)).length,
    totalProdutos: produtos.length,
  };
}
