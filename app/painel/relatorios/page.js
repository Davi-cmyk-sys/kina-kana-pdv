import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExportarCsv from "./ExportarCsv";

const NOMES_FORMA = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  vale_refeicao: "Vale-refeição",
  vale_alimentacao: "Vale-alimentação",
  outros: "Outros",
};

function paraISO(data) {
  return data.toISOString().slice(0, 10);
}

export default async function RelatoriosPage({ searchParams }) {
  const params = await searchParams;

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

  const podeVerRelatorios = ["admin", "gerente"].includes(meuPerfil?.papel);

  if (!podeVerRelatorios) {
    redirect("/painel");
  }

  const hoje = new Date();
  const seteAtras = new Date(hoje);
  seteAtras.setDate(seteAtras.getDate() - 6);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const de = typeof params?.de === "string" ? params.de : paraISO(hoje);
  const ate = typeof params?.ate === "string" ? params.ate : paraISO(hoje);

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, numero_senha, data_referencia, criado_em, subtotal, desconto, total"
    )
    .eq("status", "pago")
    .gte("data_referencia", de)
    .lte("data_referencia", ate)
    .order("criado_em", { ascending: true });

  const idsPedidos = (pedidos ?? []).map((p) => p.id);

  const [{ data: itens }, { data: pagamentos }, { data: produtos }, { data: combos }] =
    idsPedidos.length > 0
      ? await Promise.all([
          supabase
            .from("itens_pedido")
            .select(
              "pedido_id, produto_id, combo_id, nome_snapshot, quantidade, preco_unitario, subtotal"
            )
            .in("pedido_id", idsPedidos),
          supabase
            .from("pagamentos")
            .select("pedido_id, forma, valor")
            .in("pedido_id", idsPedidos),
          supabase.from("produtos").select("id, custo"),
          supabase.from("combos").select("id, custo"),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const custoProduto = new Map((produtos ?? []).map((p) => [p.id, p.custo ?? 0]));
  const custoCombo = new Map((combos ?? []).map((c) => [c.id, c.custo ?? 0]));

  const totalVendido = (pedidos ?? []).reduce((s, p) => s + p.total, 0);
  const numPedidos = (pedidos ?? []).length;
  const ticketMedio = numPedidos > 0 ? totalVendido / numPedidos : 0;
  const totalDesconto = (pedidos ?? []).reduce((s, p) => s + (p.desconto ?? 0), 0);

  const porForma = {};
  for (const p of pagamentos ?? []) {
    porForma[p.forma] = (porForma[p.forma] ?? 0) + p.valor;
  }

  const porHora = Array.from({ length: 24 }, (_, hora) => ({
    hora,
    pedidos: 0,
    total: 0,
  }));
  for (const p of pedidos ?? []) {
    const hora = new Date(p.criado_em).getHours();
    porHora[hora].pedidos += 1;
    porHora[hora].total += p.total;
  }
  const picoMaximo = Math.max(1, ...porHora.map((h) => h.pedidos));

  let custoTotal = 0;
  const vendasPorItem = new Map();
  for (const item of itens ?? []) {
    const custoUnit = item.produto_id
      ? custoProduto.get(item.produto_id) ?? 0
      : item.combo_id
      ? custoCombo.get(item.combo_id) ?? 0
      : 0;
    custoTotal += custoUnit * item.quantidade;

    const chave = `${item.produto_id ? "p" : "c"}-${
      item.produto_id ?? item.combo_id
    }-${item.nome_snapshot}`;
    const atual = vendasPorItem.get(chave) ?? {
      nome: item.nome_snapshot,
      quantidade: 0,
      total: 0,
    };
    atual.quantidade += item.quantidade;
    atual.total += item.subtotal;
    vendasPorItem.set(chave, atual);
  }

  const maisVendidos = Array.from(vendasPorItem.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  const lucroEstimado = totalVendido - custoTotal;
  const margem = totalVendido > 0 ? (lucroEstimado / totalVendido) * 100 : 0;

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const formatoData = (iso) =>
    new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");

  const linhasCsv = (pedidos ?? []).map((pedido) => {
    const itensDoPedido = (itens ?? []).filter((i) => i.pedido_id === pedido.id);
    const pagamentosDoPedido = (pagamentos ?? []).filter(
      (p) => p.pedido_id === pedido.id
    );
    return {
      numeroSenha: pedido.numero_senha,
      data: pedido.data_referencia,
      hora: new Date(pedido.criado_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      subtotal: pedido.subtotal,
      desconto: pedido.desconto ?? 0,
      total: pedido.total,
      formas: pagamentosDoPedido
        .map((p) => NOMES_FORMA[p.forma] ?? p.forma)
        .join(" + "),
      itens: itensDoPedido
        .map((i) => `${i.quantidade}x ${i.nome_snapshot}`)
        .join("; "),
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">
          Relatórios e estatísticas
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Resumo de vendas, produtos mais vendidos e lucro estimado por
          período.
        </p>

        {/* Filtro de período */}
        <form
          method="get"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4"
        >
          <div>
            <label className="block text-xs font-medium text-[#1c2a1f]">
              De
            </label>
            <input
              type="date"
              name="de"
              defaultValue={de}
              className="mt-1 rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1c2a1f]">
              Até
            </label>
            <input
              type="date"
              name="ate"
              defaultValue={ate}
              className="mt-1 rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33]"
          >
            Filtrar
          </button>

          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <Link
              href={`/painel/relatorios?de=${paraISO(hoje)}&ate=${paraISO(hoje)}`}
              className="rounded-full border border-[#1f6f3e] px-3 py-1 text-[#1f6f3e] hover:bg-white"
            >
              Hoje
            </Link>
            <Link
              href={`/painel/relatorios?de=${paraISO(seteAtras)}&ate=${paraISO(
                hoje
              )}`}
              className="rounded-full border border-[#1f6f3e] px-3 py-1 text-[#1f6f3e] hover:bg-white"
            >
              Últimos 7 dias
            </Link>
            <Link
              href={`/painel/relatorios?de=${paraISO(inicioMes)}&ate=${paraISO(
                hoje
              )}`}
              className="rounded-full border border-[#1f6f3e] px-3 py-1 text-[#1f6f3e] hover:bg-white"
            >
              Este mês
            </Link>
          </div>
        </form>

        <p className="mt-3 text-xs text-[#8b968a]">
          Período: {formatoData(de)} até {formatoData(ate)}
        </p>

        {/* Resumo */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#dcdfd2] p-3">
            <p className="text-xs text-[#8b968a]">Total vendido</p>
            <p className="mt-1 text-lg font-bold text-[#1c2a1f]">
              {formatoMoeda.format(totalVendido)}
            </p>
          </div>
          <div className="rounded-xl border border-[#dcdfd2] p-3">
            <p className="text-xs text-[#8b968a]">Pedidos</p>
            <p className="mt-1 text-lg font-bold text-[#1c2a1f]">
              {numPedidos}
            </p>
          </div>
          <div className="rounded-xl border border-[#dcdfd2] p-3">
            <p className="text-xs text-[#8b968a]">Ticket médio</p>
            <p className="mt-1 text-lg font-bold text-[#1c2a1f]">
              {formatoMoeda.format(ticketMedio)}
            </p>
          </div>
          <div className="rounded-xl border border-[#dcdfd2] p-3">
            <p className="text-xs text-[#8b968a]">Descontos dados</p>
            <p className="mt-1 text-lg font-bold text-[#b3432f]">
              {formatoMoeda.format(totalDesconto)}
            </p>
          </div>
        </div>

        {/* Lucro estimado */}
        <div className="mt-4 rounded-xl border-2 border-[#1f6f3e] bg-[#f6f4ee] p-4">
          <p className="text-sm font-semibold text-[#1c2a1f]">
            Lucro estimado (baseado no custo cadastrado de produtos e combos)
          </p>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <p>
              <span className="text-[#8b968a]">Custo estimado: </span>
              <span className="font-semibold text-[#1c2a1f]">
                {formatoMoeda.format(custoTotal)}
              </span>
            </p>
            <p>
              <span className="text-[#8b968a]">Lucro estimado: </span>
              <span className="font-semibold text-[#1f6f3e]">
                {formatoMoeda.format(lucroEstimado)}
              </span>
            </p>
            <p>
              <span className="text-[#8b968a]">Margem: </span>
              <span className="font-semibold text-[#1c2a1f]">
                {margem.toFixed(1)}%
              </span>
            </p>
          </div>
          <p className="mt-2 text-xs text-[#8b968a]">
            Valor estimado — não considera custo de adicionais nem perdas.
            Cadastre o custo de cada produto/combo em "Cardápio" ou "Combos e
            adicionais" para deixar essa conta mais precisa.
          </p>
        </div>

        {/* Formas de pagamento */}
        <div className="mt-4 rounded-xl border border-[#dcdfd2] p-4">
          <p className="text-sm font-semibold text-[#1c2a1f]">
            Formas de pagamento
          </p>
          {Object.keys(porForma).length === 0 ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Nenhuma venda no período.
            </p>
          ) : (
            <div className="mt-2 space-y-1 text-sm">
              {Object.entries(porForma)
                .sort((a, b) => b[1] - a[1])
                .map(([forma, valor]) => (
                  <p key={forma} className="text-[#5b6b5c]">
                    {NOMES_FORMA[forma] ?? forma}:{" "}
                    <span className="font-semibold text-[#1c2a1f]">
                      {formatoMoeda.format(valor)}
                    </span>
                  </p>
                ))}
            </div>
          )}
        </div>

        {/* Produtos mais vendidos */}
        <div className="mt-4 rounded-xl border border-[#dcdfd2] p-4">
          <p className="text-sm font-semibold text-[#1c2a1f]">
            Produtos mais vendidos
          </p>
          {maisVendidos.length === 0 ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Nenhuma venda no período.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#8b968a]">
                    <th className="pb-1">Produto</th>
                    <th className="pb-1 text-right">Qtd.</th>
                    <th className="pb-1 text-right">Total vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {maisVendidos.map((item, idx) => (
                    <tr key={idx} className="border-t border-[#eceae0]">
                      <td className="py-1 text-[#1c2a1f]">{item.nome}</td>
                      <td className="py-1 text-right text-[#1c2a1f]">
                        {item.quantidade}
                      </td>
                      <td className="py-1 text-right text-[#1c2a1f]">
                        {formatoMoeda.format(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Horário de pico */}
        <div className="mt-4 rounded-xl border border-[#dcdfd2] p-4">
          <p className="text-sm font-semibold text-[#1c2a1f]">
            Pedidos por horário
          </p>
          {numPedidos === 0 ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Nenhuma venda no período.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {porHora
                .filter((h) => h.pedidos > 0)
                .map((h) => (
                  <div key={h.hora} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-[#8b968a]">
                      {String(h.hora).padStart(2, "0")}h
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#eceae0]">
                      <div
                        className="h-full rounded-full bg-[#1f6f3e]"
                        style={{
                          width: `${(h.pedidos / picoMaximo) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right text-xs text-[#5b6b5c]">
                      {h.pedidos} pedido{h.pedidos !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <ExportarCsv linhas={linhasCsv} de={de} ate={ate} />
        </div>
      </main>
  );
}
