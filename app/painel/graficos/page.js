import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { temAcesso } from "@/lib/permissoes";
import { FORMAS_PAGAMENTO, FORMAS_VALIDAS } from "@/lib/formasPagamento";
import { PERIODOS, carregarDados, resolverPeriodo, somarDias } from "./dados";
import { BarraSegmentada, BarrasRanking, GraficoColunas, Legenda } from "./Graficos";
import { COR, formatarMoeda } from "./formato";

// Cor fixa de cada forma de pagamento (a cor segue a forma, nunca a
// posição). Conjunto validado para daltonismo; como 3 delas têm pouco
// contraste no branco, o nome e o valor vêm sempre escritos ao lado.
const COR_FORMA = {
  dinheiro: "#2a78d6",
  pix_maquineta: "#eb6834",
  credito: "#1baf7a",
  debito: "#eda100",
  pix_conta: "#e87ba4",
};
const COR_FORMAS_ANTIGAS = "#b8beb0";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const numero = new Intl.NumberFormat("pt-BR");

function dataCurta(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
function dataLonga(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DIAS_SEMANA[d.getUTCDay()]}, ${dataCurta(iso)}/${iso.slice(0, 4)}`;
}
function porcentagem(v) {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

// Faixa de horas com movimento (com 1h de folga em cada lado).
function faixaComMovimento(valores) {
  const ativos = valores
    .map((v, i) => (v > 0 ? i : null))
    .filter((i) => i !== null);
  if (!ativos.length) return [8, 20];
  return [Math.max(0, ativos[0] - 1), Math.min(23, ativos[ativos.length - 1] + 1)];
}

function Cartao({ titulo, subtitulo, children, className = "" }) {
  return (
    <section
      className={
        "rounded-2xl border border-[#dcdfd2] bg-white p-4 shadow-sm sm:p-5 " + className
      }
    >
      <h2 className="text-base font-bold text-[#1c2a1f]">{titulo}</h2>
      {subtitulo && <p className="mt-0.5 text-xs text-[#5b6b5c]">{subtitulo}</p>}
      {children}
    </section>
  );
}

function Indicador({ rotulo, valor, atual, anterior, rodape }) {
  let variacao = null;
  if (anterior > 0) variacao = ((atual - anterior) / anterior) * 100;
  const subiu = variacao !== null && variacao > 0.05;
  const caiu = variacao !== null && variacao < -0.05;
  return (
    <div className="rounded-2xl border border-[#dcdfd2] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-[#5b6b5c]">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold text-[#1c2a1f] sm:text-[26px]">{valor}</p>
      <p className="mt-1 text-xs">
        {variacao === null ? (
          <span className="text-[#8b968a]">sem vendas no período anterior</span>
        ) : (
          <span
            className={
              subiu ? "text-[#1f6f3e]" : caiu ? "text-[#b3432f]" : "text-[#5b6b5c]"
            }
          >
            <span aria-hidden="true">{subiu ? "▲" : caiu ? "▼" : "="}</span>{" "}
            {subiu ? "+" : ""}
            {porcentagem(variacao)}{" "}
            <span className="text-[#8b968a]">vs período anterior</span>
          </span>
        )}
      </p>
      {rodape && <p className="mt-0.5 text-xs text-[#8b968a]">{rodape}</p>}
    </div>
  );
}

export default async function GraficosPage({ searchParams }) {
  const params = await searchParams;
  const { supabase, user, perfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }
  if (
    !temAcesso("/painel/graficos", {
      master: perfil?.master,
      secoesBloqueadas: perfil?.secoes_bloqueadas,
    })
  ) {
    redirect("/painel");
  }

  const periodo = resolverPeriodo(params);
  const dados = await carregarDados(supabase, periodo);
  const { kpis } = dados;
  const umDia = dados.dias === 1;
  const anteriorDe = somarDias(periodo.de, -dados.dias);
  const anteriorAte = somarDias(periodo.de, -1);
  const temVendas = kpis.pedidos > 0;

  const produtosVendidos = dados.produtos;
  const nenhumCustoNasVendas =
    produtosVendidos.length > 0 && produtosVendidos.every((p) => p.semCusto);

  // ---------- gráfico de tempo: lucro + custo = faturamento ----------
  let pontosTempo = dados.porTempo;
  if (umDia) {
    const [ini, fim] = faixaComMovimento(pontosTempo.map((p) => p.faturamento));
    pontosTempo = pontosTempo.filter((p) => p.chave >= ini && p.chave <= fim);
  }
  const pontosFaturamento = pontosTempo.map((p) => {
    const rotulo = umDia ? `${p.chave}h` : dataCurta(p.chave);
    const rotuloLongo = umDia
      ? `${String(p.chave).padStart(2, "0")}:00 às ${String(p.chave).padStart(2, "0")}:59`
      : dataLonga(p.chave);
    const lucroDesenho = Math.max(p.lucro, 0);
    return {
      chave: String(p.chave),
      rotulo,
      rotuloLongo,
      partes: [
        { serie: "lucro", valor: lucroDesenho },
        { serie: "custo", valor: Math.max(p.faturamento - lucroDesenho, 0) },
      ],
      detalhes: [
        { rotulo: "Faturamento", valor: formatarMoeda(p.faturamento) },
        { rotulo: "Lucro", valor: formatarMoeda(p.lucro), cor: COR.destaque },
        { rotulo: "Custo", valor: formatarMoeda(p.custo), cor: COR.apagado },
        { rotulo: "Pedidos", valor: numero.format(p.pedidos) },
      ],
    };
  });

  // ---------- movimento por hora (vários dias) ----------
  const [horaIni, horaFim] = faixaComMovimento(dados.movimentoPorHora);
  const pontosMovimento = dados.movimentoPorHora
    .map((qtd, hora) => ({ qtd, hora }))
    .filter((h) => h.hora >= horaIni && h.hora <= horaFim)
    .map(({ qtd, hora }) => ({
      chave: String(hora),
      rotulo: `${hora}h`,
      rotuloLongo: `${String(hora).padStart(2, "0")}:00 às ${String(hora).padStart(2, "0")}:59`,
      partes: [{ serie: "pedidos", valor: qtd }],
      detalhes: [
        { rotulo: "Pedidos", valor: numero.format(qtd) },
        {
          rotulo: "Média por dia",
          valor: (qtd / dados.dias).toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
        },
      ],
    }));

  // ---------- rankings ----------
  const detalhesProduto = (p) => [
    { rotulo: "Quantidade", valor: `${numero.format(p.quantidade)} un.` },
    { rotulo: "Faturamento", valor: formatarMoeda(p.faturamento) },
    { rotulo: "Custo", valor: p.semCusto ? "não cadastrado" : formatarMoeda(p.custo) },
    { rotulo: "Lucro", valor: formatarMoeda(p.lucro) },
    { rotulo: "Margem", valor: porcentagem(p.margem) },
  ];
  const nomeProduto = (p) => (p.codigo ? `${p.codigo} · ${p.nome}` : p.nome);

  const maisVendidos = [...produtosVendidos]
    .sort((a, b) => b.quantidade - a.quantidade || b.faturamento - a.faturamento)
    .slice(0, 10)
    .map((p) => ({
      chave: p.chave,
      nome: nomeProduto(p),
      valor: p.quantidade,
      rotuloValor: `${numero.format(p.quantidade)} un.`,
      detalhes: detalhesProduto(p),
    }));

  // Produto sem custo cadastrado não entra no ranking de lucro: sem custo,
  // todo o valor vendido pareceria lucro e ele iria para o topo sem merecer.
  const medidaLucro = nenhumCustoNasVendas ? "faturamento" : "lucro";
  const vendidosSemCusto = produtosVendidos.filter((p) => p.semCusto).length;
  const maisLucro = [...produtosVendidos]
    .filter((p) => nenhumCustoNasVendas || !p.semCusto)
    .sort((a, b) => b[medidaLucro] - a[medidaLucro])
    .slice(0, 10)
    .map((p) => ({
      chave: p.chave,
      nome: nomeProduto(p),
      valor: Math.max(p[medidaLucro], 0),
      rotuloValor: formatarMoeda(p[medidaLucro]),
      detalhes: detalhesProduto(p),
    }));

  const categorias = dados.categorias.map((c) => ({
    chave: c.nome,
    nome: c.nome,
    valor: c.faturamento,
    rotuloValor: formatarMoeda(c.faturamento),
    detalhes: [
      { rotulo: "Faturamento", valor: formatarMoeda(c.faturamento) },
      {
        rotulo: "Do total vendido",
        valor: porcentagem(
          (c.faturamento /
            (dados.categorias.reduce((s, x) => s + x.faturamento, 0) || 1)) *
            100
        ),
      },
    ],
  }));

  // ---------- formas de pagamento ----------
  const partesFormas = FORMAS_PAGAMENTO.map((f) => ({
    chave: f.valor,
    nome: f.rotulo,
    valor: dados.formas[f.valor] ?? 0,
    cor: COR_FORMA[f.valor],
  }));
  const antigas = Object.entries(dados.formas)
    .filter(([forma]) => !FORMAS_VALIDAS.includes(forma))
    .reduce((s, [, v]) => s + v, 0);
  if (antigas > 0) {
    partesFormas.push({
      chave: "antigas",
      nome: "Formas antigas (Pix, vale…)",
      valor: antigas,
      cor: COR_FORMAS_ANTIGAS,
    });
  }

  const tabelaProdutos = [...produtosVendidos].sort(
    (a, b) => b.faturamento - a.faturamento
  );

  const linkPeriodo = (chave) => `/painel/graficos?periodo=${chave}`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2a1f]">Gráficos de vendas</h1>
          <p className="mt-1 text-sm text-[#5b6b5c]">
            O que mais vende, quanto entra e quanto sobra de lucro.
          </p>
        </div>
        <Link
          href={`/painel/relatorios?de=${periodo.de}&ate=${periodo.ate}`}
          className="text-sm font-medium text-[#1f6f3e] hover:underline"
        >
          Relatório detalhado e CSV →
        </Link>
      </div>

      {/* Filtro de período — vale para tudo abaixo */}
      <div className="rounded-2xl border border-[#dcdfd2] bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => {
            const ativo = periodo.chave === p.chave;
            return (
              <Link
                key={p.chave}
                href={linkPeriodo(p.chave)}
                aria-current={ativo ? "true" : undefined}
                className={
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition " +
                  (ativo
                    ? "bg-[#1f6f3e] text-white"
                    : "border border-[#dcdfd2] bg-white text-[#1c2a1f] hover:bg-[#f6f4ee]")
                }
              >
                {p.rotulo}
              </Link>
            );
          })}
          <form method="get" className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <input
              type="date"
              name="de"
              defaultValue={periodo.de}
              aria-label="De"
              className="rounded-lg border border-[#dcdfd2] px-2 py-1.5 text-sm text-[#1c2a1f]"
            />
            <span className="text-xs text-[#8b968a]">até</span>
            <input
              type="date"
              name="ate"
              defaultValue={periodo.ate}
              aria-label="Até"
              className="rounded-lg border border-[#dcdfd2] px-2 py-1.5 text-sm text-[#1c2a1f]"
            />
            <button
              type="submit"
              className={
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition " +
                (periodo.chave === "personalizado"
                  ? "bg-[#1f6f3e] text-white"
                  : "border border-[#1f6f3e] text-[#1f6f3e] hover:bg-[#f6f4ee]")
              }
            >
              Ver
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-[#8b968a]">
          {periodo.de === periodo.ate
            ? dataLonga(periodo.de)
            : `${dataLonga(periodo.de)} a ${dataLonga(periodo.ate)}`}{" "}
          · comparado com{" "}
          {anteriorDe === anteriorAte
            ? dataLonga(anteriorDe)
            : `${dataCurta(anteriorDe)} a ${dataCurta(anteriorAte)}`}
        </p>
      </div>

      {dados.produtosSemCusto > 0 && (
        <div className="rounded-xl border border-[#f0d9a8] bg-[#fdf3e0] p-3 text-sm text-[#7a5b16]">
          <strong>⚠ Lucro incompleto:</strong>{" "}
          {dados.produtosSemCusto === dados.totalProdutos
            ? "nenhum produto tem custo cadastrado"
            : `${dados.produtosSemCusto} de ${dados.totalProdutos} produtos estão sem custo`}
          , então o lucro deles aparece igual ao valor vendido. Cadastre o custo
          em{" "}
          <Link href="/painel/produtos" className="font-semibold underline">
            Cardápio → Editar produto → Custo
          </Link>
          .
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Faturamento"
          valor={formatarMoeda(kpis.faturamento)}
          atual={kpis.faturamento}
          anterior={kpis.faturamentoAnterior}
          rodape={kpis.descontos > 0 ? `${formatarMoeda(kpis.descontos)} em descontos` : null}
        />
        <Indicador
          rotulo="Lucro estimado"
          valor={formatarMoeda(kpis.lucro)}
          atual={kpis.lucro}
          anterior={kpis.lucroAnterior}
          rodape={`margem de ${porcentagem(kpis.margem)}`}
        />
        <Indicador
          rotulo="Pedidos"
          valor={numero.format(kpis.pedidos)}
          atual={kpis.pedidos}
          anterior={kpis.pedidosAnterior}
        />
        <Indicador
          rotulo="Ticket médio"
          valor={formatarMoeda(kpis.ticket)}
          atual={kpis.ticket}
          anterior={kpis.ticketAnterior}
        />
      </div>

      {!temVendas ? (
        <div className="rounded-2xl border border-[#dcdfd2] bg-white p-8 text-center text-sm text-[#5b6b5c] shadow-sm">
          Nenhuma venda nesse período. Escolha outro período acima.
        </div>
      ) : (
        <>
          <Cartao
            titulo={umDia ? "Faturamento e lucro por hora" : "Faturamento e lucro por dia"}
            subtitulo="A coluna inteira é o faturamento; a parte verde é o lucro. Toque numa coluna para ver os valores."
          >
            <div className="mt-2">
              <Legenda
                itens={[
                  { nome: "Lucro", cor: COR.destaque },
                  { nome: "Custo", cor: COR.apagado },
                ]}
              />
            </div>
            <GraficoColunas
              pontos={pontosFaturamento}
              series={[
                { chave: "lucro", nome: "Lucro", cor: COR.destaque },
                { chave: "custo", nome: "Custo", cor: COR.apagado },
              ]}
              rotuloTabela={umDia ? "Hora" : "Dia"}
              colunasTabela={["Faturamento", "Lucro", "Custo", "Pedidos"]}
            />
          </Cartao>

          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao titulo="Mais vendidos" subtitulo="Top 10 por quantidade vendida.">
              <BarrasRanking linhas={maisVendidos} />
            </Cartao>
            <Cartao
              titulo={nenhumCustoNasVendas ? "Que mais faturam" : "Que mais dão lucro"}
              subtitulo={
                nenhumCustoNasVendas
                  ? "Top 10 por valor vendido (sem custo cadastrado não dá para calcular o lucro)."
                  : "Top 10 por lucro estimado (valor vendido menos o custo)."
              }
            >
              <BarrasRanking linhas={maisLucro} />
              {!nenhumCustoNasVendas && vendidosSemCusto > 0 && (
                <p className="mt-2 text-xs text-[#b08900]">
                  {vendidosSemCusto === 1
                    ? "1 produto vendido está sem custo cadastrado e ficou de fora."
                    : `${vendidosSemCusto} produtos vendidos estão sem custo cadastrado e ficaram de fora.`}
                </p>
              )}
            </Cartao>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao titulo="Formas de pagamento" subtitulo="Quanto entrou por cada forma.">
              <BarraSegmentada partes={partesFormas} />
            </Cartao>
            <Cartao titulo="Vendas por categoria" subtitulo="Valor vendido em cada categoria do cardápio.">
              <BarrasRanking linhas={categorias} />
            </Cartao>
          </div>

          {!umDia && (
            <Cartao
              titulo="Movimento por hora do dia"
              subtitulo="Quantos pedidos em cada horário, somando o período — mostra os horários de pico."
            >
              <GraficoColunas
                pontos={pontosMovimento}
                series={[{ chave: "pedidos", nome: "Pedidos", cor: COR.destaque }]}
                tipoEixo="numero"
                altura={140}
                rotuloTabela="Hora"
                colunasTabela={["Pedidos", "Média por dia"]}
              />
            </Cartao>
          )}

          <Cartao
            titulo="Todos os produtos vendidos"
            subtitulo="Do que mais faturou para o que menos. Os descontos dados no pedido entram só no total, não por produto."
          >
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm tabular-nums">
                <thead className="text-xs text-[#5b6b5c]">
                  <tr className="border-b border-[#eceae0]">
                    <th className="py-2 pr-2 font-medium">Produto</th>
                    <th className="px-2 py-2 text-right font-medium">Qtd.</th>
                    <th className="px-2 py-2 text-right font-medium">Faturamento</th>
                    <th className="px-2 py-2 text-right font-medium">Custo</th>
                    <th className="px-2 py-2 text-right font-medium">Lucro</th>
                    <th className="py-2 pl-2 text-right font-medium">Margem</th>
                  </tr>
                </thead>
                <tbody className="text-[#1c2a1f]">
                  {tabelaProdutos.map((p) => (
                    <tr key={p.chave} className="border-b border-[#eceae0] last:border-0">
                      <td className="py-1.5 pr-2">
                        {p.codigo && (
                          <span className="mr-1.5 font-mono text-xs text-[#8b968a]">{p.codigo}</span>
                        )}
                        {p.nome}
                      </td>
                      <td className="px-2 py-1.5 text-right">{numero.format(p.quantidade)}</td>
                      <td className="px-2 py-1.5 text-right">{formatarMoeda(p.faturamento)}</td>
                      <td className="px-2 py-1.5 text-right">
                        {p.semCusto ? (
                          <span className="text-xs text-[#b08900]">sem custo</span>
                        ) : (
                          formatarMoeda(p.custo)
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold">
                        {formatarMoeda(p.lucro)}
                      </td>
                      <td className="py-1.5 pl-2 text-right text-[#5b6b5c]">
                        {p.semCusto ? "—" : porcentagem(p.margem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Cartao>
        </>
      )}
    </div>
  );
}
