import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import {
  FORMAS_PAGAMENTO,
  FORMAS_VALIDAS,
  nomeDaForma,
  ordemDaForma,
} from "@/lib/formasPagamento";
import { temAcesso } from "@/lib/permissoes";
import {
  abrirCaixa,
  registrarMovimentacao,
  fecharCaixa,
  editarCaixa,
} from "./actions";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";


const NOMES_APROVACAO = {
  pendente: "Aguardando aprovação do master",
  aprovado: "Aprovado pelo master",
  reprovado: "Reprovado pelo master",
};

const CORES_APROVACAO = {
  pendente: "text-[#b08900]",
  aprovado: "text-[#1f6f3e]",
  reprovado: "text-[#b3432f]",
};

function calcularResumo(caixa, pagamentos, movimentacoes, pedidos, itensPedido) {
  const inicio = new Date(caixa.aberto_em).getTime();
  const fim = caixa.fechado_em
    ? new Date(caixa.fechado_em).getTime()
    : Infinity;

  const pedidosDoCaixaBrutos = (pedidos ?? []).filter((p) => {
    const t = new Date(p.pago_em).getTime();
    return t >= inicio && t < fim;
  });
  const idsPedidos = new Set(pedidosDoCaixaBrutos.map((p) => p.id));

  const pagamentosDoCaixa = (pagamentos ?? []).filter((p) =>
    idsPedidos.has(p.pedido_id)
  );
  const movimentacoesDoCaixa = (movimentacoes ?? []).filter(
    (m) => m.caixa_id === caixa.id
  );

  const formaPorPedido = {};
  for (const p of pagamentosDoCaixa) {
    formaPorPedido[p.pedido_id] = p.forma;
  }

  const pedidosDoCaixa = pedidosDoCaixaBrutos
    .map((p) => ({ ...p, forma: formaPorPedido[p.id] ?? "outros" }))
    .sort((a, b) => new Date(b.pago_em) - new Date(a.pago_em));

  const quantidadePorProduto = {};
  for (const item of itensPedido ?? []) {
    if (!idsPedidos.has(item.pedido_id)) continue;
    quantidadePorProduto[item.nome_snapshot] =
      (quantidadePorProduto[item.nome_snapshot] ?? 0) + Number(item.quantidade);
  }

  const totalPorForma = {};
  for (const p of pagamentosDoCaixa) {
    totalPorForma[p.forma] = (totalPorForma[p.forma] ?? 0) + p.valor;
  }
  const totalVendas = pagamentosDoCaixa.reduce((s, p) => s + p.valor, 0);
  const totalSangria = movimentacoesDoCaixa
    .filter((m) => m.tipo === "sangria")
    .reduce((s, m) => s + m.valor, 0);
  const totalSuprimento = movimentacoesDoCaixa
    .filter((m) => m.tipo === "suprimento")
    .reduce((s, m) => s + m.valor, 0);
  const dinheiroEsperado =
    caixa.valor_abertura +
    (totalPorForma.dinheiro ?? 0) +
    totalSuprimento -
    totalSangria;

  return {
    totalPorForma,
    totalVendas,
    movimentacoes: movimentacoesDoCaixa,
    totalSangria,
    totalSuprimento,
    dinheiroEsperado,
    pedidosDoCaixa,
    quantidadePorProduto,
  };
}

// Conferência do fechamento: para cada forma de pagamento, o que o sistema
// registrou x o que foi informado no fechamento. No dinheiro, o "sistema"
// já inclui abertura, suprimentos e sangrias.
function calcularConferencia(caixa, resumo) {
  const linhas = FORMAS_PAGAMENTO.map((f) => ({
    rotulo: f.rotulo,
    esperado:
      f.valor === "dinheiro"
        ? resumo.dinheiroEsperado
        : resumo.totalPorForma[f.valor] ?? 0,
    informado: Number(caixa[f.coluna] ?? 0),
  }));

  // Caixas de antes da mudança: formas que não existem mais (Pix antigo,
  // Stone, PagSeguro, Depósito) entram juntas numa linha só.
  const esperadoAntigo = Object.entries(resumo.totalPorForma)
    .filter(([forma]) => !FORMAS_VALIDAS.includes(forma))
    .reduce((s, [, v]) => s + v, 0);
  const informadoAntigo =
    Number(caixa.valor_maquineta_stone ?? 0) +
    Number(caixa.valor_maquineta_pagseguro ?? 0) +
    Number(caixa.valor_deposito ?? 0);
  if (esperadoAntigo > 0 || informadoAntigo > 0) {
    linhas.push({
      rotulo: "Formas antigas (Stone, PagSeguro, Depósito, Pix…)",
      esperado: esperadoAntigo,
      informado: informadoAntigo,
    });
  }

  const totalEsperado = linhas.reduce((s, l) => s + l.esperado, 0);
  const totalInformado = linhas.reduce((s, l) => s + l.informado, 0);
  return {
    linhas,
    totalEsperado,
    totalInformado,
    diferenca: totalInformado - totalEsperado,
  };
}

function corDaDiferenca(valor) {
  if (Math.abs(valor) < 0.005) return "text-[#5b6b5c]";
  return valor > 0 ? "text-[#1f6f3e]" : "text-[#b3432f]";
}

export default async function CaixaPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const { supabase, user, perfil: meuPerfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }

  const podeVender = temAcesso("/painel/caixa", {
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });
  const podeGerenciar = meuPerfil?.master === true;

  if (!podeVender) {
    redirect("/painel");
  }

  // Consultas independentes saem todas ao mesmo tempo (uma ida ao banco
  // em vez de várias seguidas).
  const [
    { data: caixas },
    { data: pagamentos },
    { data: pedidos },
    { data: itensPedido },
    { data: movimentacoes },
  ] = await Promise.all([
    supabase
      .from("caixas")
      .select(
        "id, aberto_em, valor_abertura, fechado_em, fechado_por, valor_contado, valor_dinheiro, valor_pix_maquineta, valor_credito, valor_debito, valor_pix_conta, valor_maquineta_stone, valor_maquineta_pagseguro, valor_deposito, status_aprovacao, aprovado_em, observacao_aprovacao, observacoes"
      )
      .order("aberto_em", { ascending: false }),
    supabase
      .from("pagamentos")
      .select("pedido_id, forma, valor, criado_em"),
    supabase
      .from("pedidos")
      .select("id, numero_senha, subtotal, desconto, total, pago_em")
      .eq("status", "pago"),
    supabase
      .from("itens_pedido")
      .select("pedido_id, nome_snapshot, quantidade"),
    supabase
      .from("movimentacoes_caixa")
      .select("id, caixa_id, tipo, valor, motivo, criado_em")
      .order("criado_em", { ascending: false }),
  ]);

  const caixaAberto = (caixas ?? []).find((c) => !c.fechado_em) ?? null;
  const caixasFechados = (caixas ?? []).filter((c) => c.fechado_em);

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const resumo = caixaAberto
    ? calcularResumo(caixaAberto, pagamentos ?? [], movimentacoes ?? [], pedidos ?? [], itensPedido ?? [])
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">Caixa</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Abertura e fechamento de caixa, sangria e suprimento.
        </p>

        {erro && (
          <div className="mt-4 rounded-lg bg-[#fbeae6] p-3 text-sm text-[#8a3320]">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mt-4 rounded-lg bg-[#e7f2ea] p-3 text-sm text-[#1f6f3e]">
            {sucesso}
          </div>
        )}

        {!caixaAberto ? (
          <form
            action={abrirCaixa}
            className="mt-6 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4"
          >
            <p className="text-sm font-semibold text-[#1c2a1f]">
              Nenhum caixa aberto no momento.
            </p>
            <label className="mt-3 block text-sm font-medium text-[#1c2a1f]">
              Valor de abertura (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="valor_abertura"
              defaultValue="0,00"
              className={campoClasse}
            />
            <button
              type="submit"
              className="mt-3 w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Abrir caixa
            </button>
          </form>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-[#dcdfd2] p-4">
              <p className="text-sm text-[#5b6b5c]">
                Aberto às{" "}
                {formatoDataHora.format(new Date(caixaAberto.aberto_em))} com{" "}
                {formatoMoeda.format(caixaAberto.valor_abertura)}
              </p>

              <div className="mt-3 space-y-1 text-sm">
                <p className="font-semibold text-[#1c2a1f]">
                  Vendas desde a abertura:{" "}
                  {formatoMoeda.format(resumo.totalVendas)}
                </p>
                {Object.entries(resumo.totalPorForma)
                  .sort((a, b) => ordemDaForma(a[0]) - ordemDaForma(b[0]))
                  .map(([forma, valor]) => (
                  <p key={forma} className="text-[#5b6b5c]">
                    {nomeDaForma(forma)}: {formatoMoeda.format(valor)}
                  </p>
                ))}
              </div>

              {(resumo.totalSangria > 0 || resumo.totalSuprimento > 0) && (
                <div className="mt-3 space-y-1 border-t border-[#eceae0] pt-2 text-sm">
                  {resumo.totalSuprimento > 0 && (
                    <p className="text-[#1f6f3e]">
                      Suprimentos: + {formatoMoeda.format(resumo.totalSuprimento)}
                    </p>
                  )}
                  {resumo.totalSangria > 0 && (
                    <p className="text-[#b3432f]">
                      Sangrias: − {formatoMoeda.format(resumo.totalSangria)}
                    </p>
                  )}
                </div>
              )}

              <p className="mt-3 border-t border-[#eceae0] pt-2 text-sm font-bold text-[#1c2a1f]">
                Dinheiro esperado na gaveta:{" "}
                {formatoMoeda.format(resumo.dinheiroEsperado)}
              </p>
            </div>

            {/* Detalhamento por pedido + resumo de produtos */}
            {resumo.pedidosDoCaixa.length > 0 && (
              <details className="mt-4 rounded-xl border border-[#dcdfd2] bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
                  Detalhamento dos pedidos ({resumo.pedidosDoCaixa.length})
                </summary>
                <div className="mt-3 space-y-1 border-b border-[#eceae0] pb-3 text-xs">
                  {resumo.pedidosDoCaixa.map((p) => (
                    <p key={p.id} className="flex items-center justify-between text-[#1c2a1f]">
                      <span>
                        Pedido nº {p.numero_senha} — {nomeDaForma(p.forma)}
                        {p.desconto > 0 ? ` (desconto ${formatoMoeda.format(p.desconto)})` : ""}
                      </span>
                      <span className="font-semibold">{formatoMoeda.format(p.total)}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#5b6b5c]">
                  Quantidade vendida por produto
                </p>
                <div className="mt-1 space-y-0.5 text-xs">
                  {Object.entries(resumo.quantidadePorProduto)
                    .sort((a, b) => b[1] - a[1])
                    .map(([nome, qtd]) => (
                      <p key={nome} className="flex items-center justify-between text-[#1c2a1f]">
                        <span>{nome}</span>
                        <span className="font-semibold">{qtd}x</span>
                      </p>
                    ))}
                </div>
              </details>
            )}

            {/* Sangria / suprimento */}
            <details className="mt-4 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
                Registrar sangria ou suprimento
              </summary>
              <form
                action={registrarMovimentacao}
                className="mt-3 grid gap-3 sm:grid-cols-3"
              >
                <input type="hidden" name="caixa_id" value={caixaAberto.id} />
                <div>
                  <label className="block text-xs font-medium text-[#1c2a1f]">
                    Tipo
                  </label>
                  <select name="tipo" className={campoClasse}>
                    <option value="sangria">Sangria (retirada)</option>
                    <option value="suprimento">Suprimento (reforço)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1c2a1f]">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="valor"
                    required
                    className={campoClasse}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1c2a1f]">
                    Motivo (opcional)
                  </label>
                  <input type="text" name="motivo" className={campoClasse} />
                </div>
                <button
                  type="submit"
                  className="sm:col-span-3 rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
                >
                  Registrar
                </button>
              </form>

              {resumo.movimentacoes.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-[#eceae0] pt-2">
                  {resumo.movimentacoes.map((m) => (
                    <p key={m.id} className="text-xs text-[#5b6b5c]">
                      {m.tipo === "sangria" ? "Sangria" : "Suprimento"}:{" "}
                      {formatoMoeda.format(m.valor)}
                      {m.motivo ? ` — ${m.motivo}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </details>

            {/* Fechar caixa */}
            <details className="mt-4 rounded-xl border-2 border-[#1f6f3e] bg-[#f6f4ee] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
                Fechar caixa
              </summary>
              <form action={fecharCaixa} className="mt-3 space-y-3">
                <input type="hidden" name="caixa_id" value={caixaAberto.id} />
                <p className="text-xs text-[#5b6b5c]">
                  Dinheiro esperado na gaveta:{" "}
                  <strong>{formatoMoeda.format(resumo.dinheiroEsperado)}</strong>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FORMAS_PAGAMENTO.map((f) => (
                    <div key={f.coluna}>
                      <label className="block text-sm font-medium text-[#1c2a1f]">
                        {f.rotulo} (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        name={f.coluna}
                        defaultValue="0,00"
                        required
                        className={campoClasse}
                      />
                      <p className="mt-0.5 text-[11px] text-[#8b968a]">
                        Sistema:{" "}
                        {formatoMoeda.format(
                          f.valor === "dinheiro"
                            ? resumo.dinheiroEsperado
                            : resumo.totalPorForma[f.valor] ?? 0
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    name="observacoes"
                    className={campoClasse}
                  />
                </div>
                <p className="text-xs text-[#8b968a]">
                  Depois de fechar, o master recebe um aviso e pode aprovar
                  ou reprovar o fechamento.
                </p>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
                >
                  Fechar caixa
                </button>
              </form>
            </details>
          </>
        )}

        {/* Caixas fechados */}
        <div className="mt-8 border-t border-[#eceae0] pt-6">
          <h2 className="text-lg font-bold text-[#1c2a1f]">Caixas fechados</h2>
          <p className="mt-1 text-sm text-[#5b6b5c]">
            Histórico de caixas já encerrados.
            {podeGerenciar
              ? " Como master, você pode corrigir os valores de um caixa já fechado."
              : ""}
          </p>

          {!caixasFechados.length ? (
            <p className="mt-3 text-sm text-[#8b968a]">
              Nenhum caixa fechado ainda.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {caixasFechados.map((caixa) => {
                const resumoCaixa = calcularResumo(
                  caixa,
                  pagamentos ?? [],
                  movimentacoes ?? [],
                  pedidos ?? [],
                  itensPedido ?? []
                );
                const conferencia = calcularConferencia(caixa, resumoCaixa);

                return (
                  <details
                    key={caixa.id}
                    className="rounded-xl border border-[#dcdfd2] p-4"
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
                      {formatoDataHora.format(new Date(caixa.aberto_em))} até{" "}
                      {formatoDataHora.format(new Date(caixa.fechado_em))} —{" "}
                      {formatoMoeda.format(resumoCaixa.totalVendas)} em vendas
                    </summary>

                    <p
                      className={
                        "mt-2 text-xs font-bold " +
                        (CORES_APROVACAO[caixa.status_aprovacao] ?? "text-[#5b6b5c]")
                      }
                    >
                      {NOMES_APROVACAO[caixa.status_aprovacao] ?? caixa.status_aprovacao}
                    </p>
                    {caixa.observacao_aprovacao && (
                      <p className="mt-1 text-xs text-[#5b6b5c]">
                        Observação do master: {caixa.observacao_aprovacao}
                      </p>
                    )}

                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-[#5b6b5c]">
                        Abertura: {formatoMoeda.format(caixa.valor_abertura)}
                      </p>
                      {Object.entries(resumoCaixa.totalPorForma)
                        .sort((a, b) => ordemDaForma(a[0]) - ordemDaForma(b[0]))
                        .map(([forma, valor]) => (
                          <p key={forma} className="text-[#5b6b5c]">
                            {nomeDaForma(forma)}:{" "}
                            {formatoMoeda.format(valor)}
                          </p>
                        ))}
                      {resumoCaixa.totalSuprimento > 0 && (
                        <p className="text-[#1f6f3e]">
                          Suprimentos: +{" "}
                          {formatoMoeda.format(resumoCaixa.totalSuprimento)}
                        </p>
                      )}
                      {resumoCaixa.totalSangria > 0 && (
                        <p className="text-[#b3432f]">
                          Sangrias: −{" "}
                          {formatoMoeda.format(resumoCaixa.totalSangria)}
                        </p>
                      )}
                      <div className="mt-2 overflow-x-auto border-t border-[#eceae0] pt-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[#8b968a]">
                              <th className="py-1 pr-2 font-medium">Forma</th>
                              <th className="py-1 pr-2 text-right font-medium">Sistema</th>
                              <th className="py-1 pr-2 text-right font-medium">Informado</th>
                              <th className="py-1 text-right font-medium">Diferença</th>
                            </tr>
                          </thead>
                          <tbody className="text-[#1c2a1f]">
                            {conferencia.linhas.map((l) => {
                              const dif = l.informado - l.esperado;
                              return (
                                <tr key={l.rotulo} className="border-t border-[#eceae0]">
                                  <td className="py-1 pr-2">{l.rotulo}</td>
                                  <td className="py-1 pr-2 text-right">
                                    {formatoMoeda.format(l.esperado)}
                                  </td>
                                  <td className="py-1 pr-2 text-right">
                                    {formatoMoeda.format(l.informado)}
                                  </td>
                                  <td className={"py-1 text-right font-semibold " + corDaDiferenca(dif)}>
                                    {dif >= 0 ? "+" : ""}
                                    {formatoMoeda.format(dif)}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-[#dcdfd2] font-bold">
                              <td className="py-1 pr-2">Total</td>
                              <td className="py-1 pr-2 text-right">
                                {formatoMoeda.format(conferencia.totalEsperado)}
                              </td>
                              <td className="py-1 pr-2 text-right">
                                {formatoMoeda.format(conferencia.totalInformado)}
                              </td>
                              <td className={"py-1 text-right " + corDaDiferenca(conferencia.diferenca)}>
                                {conferencia.diferenca >= 0 ? "+" : ""}
                                {formatoMoeda.format(conferencia.diferenca)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="mt-1 text-[11px] text-[#8b968a]">
                          No dinheiro, o valor do sistema já inclui a
                          abertura, suprimentos e sangrias.
                        </p>
                      </div>
                      {caixa.observacoes && (
                        <p className="text-[#5b6b5c]">
                          Observações: {caixa.observacoes}
                        </p>
                      )}
                    </div>

                    {resumoCaixa.pedidosDoCaixa.length > 0 && (
                      <details className="mt-3 rounded-lg border border-[#dcdfd2] p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-[#1c2a1f]">
                          Detalhamento dos pedidos ({resumoCaixa.pedidosDoCaixa.length})
                        </summary>
                        <div className="mt-2 space-y-1 border-b border-[#eceae0] pb-2 text-xs">
                          {resumoCaixa.pedidosDoCaixa.map((p) => (
                            <p key={p.id} className="flex items-center justify-between text-[#1c2a1f]">
                              <span>
                                Pedido nº {p.numero_senha} — {nomeDaForma(p.forma)}
                                {p.desconto > 0 ? ` (desconto ${formatoMoeda.format(p.desconto)})` : ""}
                              </span>
                              <span className="font-semibold">{formatoMoeda.format(p.total)}</span>
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#5b6b5c]">
                          Quantidade vendida por produto
                        </p>
                        <div className="mt-1 space-y-0.5 text-xs">
                          {Object.entries(resumoCaixa.quantidadePorProduto)
                            .sort((a, b) => b[1] - a[1])
                            .map(([nome, qtd]) => (
                              <p key={nome} className="flex items-center justify-between text-[#1c2a1f]">
                                <span>{nome}</span>
                                <span className="font-semibold">{qtd}x</span>
                              </p>
                            ))}
                        </div>
                      </details>
                    )}

                    {podeGerenciar && (
                      <details className="mt-3 rounded-lg border border-[#dcdfd2] bg-[#f6f4ee] p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-[#1c2a1f]">
                          Editar este caixa
                        </summary>
                        <form
                          action={editarCaixa}
                          className="mt-3 space-y-3"
                        >
                          <input
                            type="hidden"
                            name="caixa_id"
                            value={caixa.id}
                          />
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Valor de abertura (R$)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="valor_abertura"
                              defaultValue={caixa.valor_abertura
                                .toFixed(2)
                                .replace(".", ",")}
                              className={campoClasse}
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {FORMAS_PAGAMENTO.map((f) => (
                              <div key={f.coluna}>
                                <label className="block text-xs font-medium text-[#1c2a1f]">
                                  {f.rotulo} (R$)
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  name={f.coluna}
                                  defaultValue={Number(caixa[f.coluna] ?? 0)
                                    .toFixed(2)
                                    .replace(".", ",")}
                                  className={campoClasse}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Observações
                            </label>
                            <input
                              type="text"
                              name="observacoes"
                              defaultValue={caixa.observacoes ?? ""}
                              className={campoClasse}
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
                          >
                            Salvar correção
                          </button>
                        </form>
                      </details>
                    )}
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </main>
  );
}
