import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temAcesso } from "@/lib/permissoes";
import {
  abrirCaixa,
  registrarMovimentacao,
  fecharCaixa,
  editarCaixa,
} from "./actions";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

const NOMES_FORMA = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  vale_refeicao: "Vale-refeição",
  vale_alimentacao: "Vale-alimentação",
  outros: "Outros",
};

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

export default async function CaixaPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const podeVender = temAcesso("/painel/caixa", {
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });
  const podeGerenciar = meuPerfil?.master === true;

  if (!podeVender) {
    redirect("/painel");
  }

  const { data: caixas } = await supabase
    .from("caixas")
    .select(
      "id, aberto_em, valor_abertura, fechado_em, fechado_por, valor_contado, valor_maquineta_stone, valor_maquineta_pagseguro, valor_dinheiro, valor_deposito, status_aprovacao, aprovado_em, observacao_aprovacao, observacoes"
    )
    .order("aberto_em", { ascending: false });

  const caixaAberto = (caixas ?? []).find((c) => !c.fechado_em) ?? null;
  const caixasFechados = (caixas ?? []).filter((c) => c.fechado_em);

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("pedido_id, forma, valor, criado_em");

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, numero_senha, subtotal, desconto, total, pago_em")
    .eq("status", "pago");

  const { data: itensPedido } = await supabase
    .from("itens_pedido")
    .select("pedido_id, nome_snapshot, quantidade");

  const { data: movimentacoes } = await supabase
    .from("movimentacoes_caixa")
    .select("id, caixa_id, tipo, valor, motivo, criado_em")
    .order("criado_em", { ascending: false });

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
                {Object.entries(resumo.totalPorForma).map(([forma, valor]) => (
                  <p key={forma} className="text-[#5b6b5c]">
                    {NOMES_FORMA[forma] ?? forma}: {formatoMoeda.format(valor)}
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
                        Pedido nº {p.numero_senha} — {NOMES_FORMA[p.forma] ?? p.forma}
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
                  <div>
                    <label className="block text-sm font-medium text-[#1c2a1f]">
                      Maquineta Stone (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valor_maquineta_stone"
                      defaultValue="0,00"
                      required
                      className={campoClasse}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c2a1f]">
                      Maquineta PagSeguro (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valor_maquineta_pagseguro"
                      defaultValue="0,00"
                      required
                      className={campoClasse}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c2a1f]">
                      Dinheiro (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valor_dinheiro"
                      defaultValue="0,00"
                      required
                      className={campoClasse}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c2a1f]">
                      Depósito bancário (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="valor_deposito"
                      defaultValue="0,00"
                      required
                      className={campoClasse}
                    />
                  </div>
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
                const diferenca =
                  (caixa.valor_contado ?? 0) - resumoCaixa.dinheiroEsperado;

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
                      {Object.entries(resumoCaixa.totalPorForma).map(
                        ([forma, valor]) => (
                          <p key={forma} className="text-[#5b6b5c]">
                            {NOMES_FORMA[forma] ?? forma}:{" "}
                            {formatoMoeda.format(valor)}
                          </p>
                        )
                      )}
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
                      <p className="border-t border-[#eceae0] pt-2 font-semibold text-[#1c2a1f]">
                        Dinheiro esperado:{" "}
                        {formatoMoeda.format(resumoCaixa.dinheiroEsperado)}
                      </p>
                      <p className="font-semibold text-[#1c2a1f]">
                        Valor contado:{" "}
                        {formatoMoeda.format(caixa.valor_contado ?? 0)}
                      </p>
                      <div className="pl-3 text-xs text-[#5b6b5c]">
                        <p>Maquineta Stone: {formatoMoeda.format(caixa.valor_maquineta_stone ?? 0)}</p>
                        <p>Maquineta PagSeguro: {formatoMoeda.format(caixa.valor_maquineta_pagseguro ?? 0)}</p>
                        <p>Dinheiro: {formatoMoeda.format(caixa.valor_dinheiro ?? 0)}</p>
                        <p>Depósito bancário: {formatoMoeda.format(caixa.valor_deposito ?? 0)}</p>
                      </div>
                      <p
                        className={
                          diferenca === 0
                            ? "text-[#5b6b5c]"
                            : diferenca > 0
                            ? "text-[#1f6f3e]"
                            : "text-[#b3432f]"
                        }
                      >
                        Diferença: {diferenca >= 0 ? "+" : ""}
                        {formatoMoeda.format(diferenca)}
                      </p>
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
                                Pedido nº {p.numero_senha} — {NOMES_FORMA[p.forma] ?? p.forma}
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
                            <div>
                              <label className="block text-xs font-medium text-[#1c2a1f]">
                                Maquineta Stone (R$)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                name="valor_maquineta_stone"
                                defaultValue={(caixa.valor_maquineta_stone ?? 0)
                                  .toFixed(2)
                                  .replace(".", ",")}
                                className={campoClasse}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#1c2a1f]">
                                Maquineta PagSeguro (R$)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                name="valor_maquineta_pagseguro"
                                defaultValue={(caixa.valor_maquineta_pagseguro ?? 0)
                                  .toFixed(2)
                                  .replace(".", ",")}
                                className={campoClasse}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#1c2a1f]">
                                Dinheiro (R$)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                name="valor_dinheiro"
                                defaultValue={(caixa.valor_dinheiro ?? 0)
                                  .toFixed(2)
                                  .replace(".", ",")}
                                className={campoClasse}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-[#1c2a1f]">
                                Depósito bancário (R$)
                              </label>
                              <input
                                type="text"
                                inputMode="decimal"
                                name="valor_deposito"
                                defaultValue={(caixa.valor_deposito ?? 0)
                                  .toFixed(2)
                                  .replace(".", ",")}
                                className={campoClasse}
                              />
                            </div>
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
