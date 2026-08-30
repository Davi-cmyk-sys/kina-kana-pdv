import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { apagarPedido } from "./actions";
import BotaoApagar from "@/components/BotaoApagar";
import ImprimirPedidoBotao from "./ImprimirPedidoBotao";

const NOMES_STATUS = {
  aberto: "Aberto (sem pagamento)",
  pago: "Pago",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const CORES_STATUS = {
  aberto: "bg-[#fdf3e0] text-[#7a5b16]",
  pago: "bg-[#e7f2ea] text-[#1f6f3e]",
};

const NOMES_FORMA = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  vale_refeicao: "Vale-refeição",
  vale_alimentacao: "Vale-alimentação",
  outros: "Outros",
};

export default async function PedidosPage({ searchParams }) {
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
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  const podeVender = ["admin", "gerente", "caixa"].includes(meuPerfil?.papel);
  const podeApagar = ["admin", "gerente"].includes(meuPerfil?.papel);

  if (!podeVender) {
    redirect("/painel");
  }

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, numero_senha, data_referencia, status, subtotal, desconto, desconto_motivo, total, criado_em"
    )
    .order("criado_em", { ascending: false });

  const { data: itens } = await supabase
    .from("itens_pedido")
    .select(
      "id, pedido_id, nome_snapshot, quantidade, preco_unitario, combo_escolhas"
    );

  const { data: adicionaisDosItens } = await supabase
    .from("item_adicionais")
    .select("item_pedido_id, nome_snapshot, preco_unitario, quantidade");

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("pedido_id, forma, valor, troco, criado_em")
    .order("criado_em", { ascending: true });

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formatoData = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">Pedidos</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Histórico de tudo que já foi vendido — data, horário, itens e forma
          de pagamento de cada pedido. O pagamento agora é feito direto na
          tela "Novo Pedido", na hora de fechar a venda.
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

        <div className="mt-6 space-y-3">
          {!pedidos?.length ? (
            <p className="text-sm text-[#8b968a]">
              Nenhum pedido registrado ainda.
            </p>
          ) : (
            pedidos.map((pedido) => {
              const itensDoPedido = itens?.filter(
                (i) => i.pedido_id === pedido.id
              );
              const pagamentosDoPedido = pagamentos?.filter(
                (p) => p.pedido_id === pedido.id
              );

              const itensParaRecibo = (itensDoPedido ?? []).map((item) => ({
                nome: item.nome_snapshot,
                quantidade: item.quantidade,
                precoTotal: item.preco_unitario * item.quantidade,
                escolhas: (item.combo_escolhas ?? [])
                  .map((e) => e.produtoNome)
                  .filter(Boolean),
                adicionais: (adicionaisDosItens ?? [])
                  .filter((a) => a.item_pedido_id === item.id)
                  .map((a) => ({ nome: a.nome_snapshot, preco: a.preco_unitario })),
              }));
              const reciboDoPedido = {
                numeroSenha: pedido.numero_senha,
                dataHora: pedido.criado_em,
                itens: itensParaRecibo,
                subtotal: pedido.subtotal,
                desconto: pedido.desconto ?? 0,
                total: pedido.total,
                formaPagamento: pagamentosDoPedido?.[0]?.forma ?? "outros",
                troco: pagamentosDoPedido?.[0]?.troco ?? 0,
              };

              return (
                <div
                  key={pedido.id}
                  className="rounded-xl border border-[#dcdfd2] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1c2a1f]">
                        Pedido nº {pedido.numero_senha}
                      </p>
                      <p className="text-xs text-[#8b968a]">
                        {formatoData.format(new Date(pedido.criado_em))}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          CORES_STATUS[pedido.status] ??
                          "bg-[#f6f4ee] text-[#1c2a1f]"
                        }`}
                      >
                        {NOMES_STATUS[pedido.status] ?? pedido.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#1c2a1f]">
                        {formatoMoeda.format(pedido.total)}
                      </p>
                      <ImprimirPedidoBotao recibo={reciboDoPedido} />
                      {podeApagar && (
                        <BotaoApagar
                          acao={apagarPedido}
                          campos={{ id: pedido.id, numero_senha: pedido.numero_senha }}
                          confirmacao={`Apagar o pedido nº ${pedido.numero_senha}?`}
                          className="mt-1 text-xs font-medium text-[#b3432f] hover:underline"
                        />
                      )}
                    </div>
                  </div>

                  {itensDoPedido?.length > 0 && (
                    <div className="mt-2 border-t border-[#eceae0] pt-2">
                      {itensDoPedido.map((item, idx) => (
                        <p key={idx} className="text-xs text-[#5b6b5c]">
                          {item.quantidade}x {item.nome_snapshot}
                        </p>
                      ))}
                    </div>
                  )}

                  {pedido.desconto > 0 && (
                    <p className="mt-2 text-xs text-[#b3432f]">
                      Desconto de {formatoMoeda.format(pedido.desconto)}
                      {pedido.desconto_motivo
                        ? ` — ${pedido.desconto_motivo}`
                        : ""}{" "}
                      (subtotal {formatoMoeda.format(pedido.subtotal)})
                    </p>
                  )}

                  {pagamentosDoPedido?.length > 0 ? (
                    <div className="mt-2 border-t border-[#eceae0] pt-2">
                      {pagamentosDoPedido.map((p, idx) => (
                        <p key={idx} className="text-xs text-[#1f6f3e]">
                          ✓ {formatoMoeda.format(p.valor)} —{" "}
                          {NOMES_FORMA[p.forma] ?? p.forma}
                          {p.troco > 0 &&
                            ` (troco ${formatoMoeda.format(p.troco)})`}
                        </p>
                      ))}
                    </div>
                  ) : (
                    pedido.status !== "cancelado" && (
                      <p className="mt-2 border-t border-[#eceae0] pt-2 text-xs text-[#8a3320]">
                        Sem pagamento registrado.
                      </p>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
  );
}
