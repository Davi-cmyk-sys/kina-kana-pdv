import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function paraISO(data) {
  return data.toISOString().slice(0, 10);
}

const ROTULOS_ACAO = {
  "produto.apagar": "Produto apagado",
  "categoria.apagar": "Categoria apagada",
  "adicional.apagar": "Adicional apagado",
  "combo.apagar": "Combo apagado",
  "pedido.apagar": "Pedido apagado",
  "ingrediente.apagar": "Ingrediente apagado",
  "funcionario.editar": "Funcionário editado",
  "caixa.abrir": "Caixa aberto",
  "caixa.fechar": "Caixa fechado",
  "caixa.editar": "Caixa corrigido",
  "caixa.sangria": "Sangria",
  "caixa.suprimento": "Suprimento",
  "desconto.autorizar": "Desconto autorizado",
  "estoque.entrada": "Entrada de estoque",
  "estoque.ajuste": "Ajuste de estoque",
};

export default async function AuditoriaPage({ searchParams }) {
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

  if (meuPerfil?.papel !== "admin") {
    redirect("/painel");
  }

  const hoje = new Date();
  const seteAtras = new Date(hoje);
  seteAtras.setDate(seteAtras.getDate() - 6);

  const de = typeof params?.de === "string" ? params.de : paraISO(seteAtras);
  const ate = typeof params?.ate === "string" ? params.ate : paraISO(hoje);
  const busca = typeof params?.busca === "string" ? params.busca.trim() : "";

  let consulta = supabase
    .from("auditoria")
    .select("id, usuario_id, acao, descricao, criado_em")
    .gte("criado_em", `${de}T00:00:00`)
    .lte("criado_em", `${ate}T23:59:59`)
    .order("criado_em", { ascending: false })
    .limit(300);

  if (busca) {
    consulta = consulta.or(
      `descricao.ilike.%${busca}%,acao.ilike.%${busca}%`
    );
  }

  const { data: registros } = await consulta;

  const { data: perfis } = await supabase.from("perfis").select("id, nome");
  const mapaNomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]));

  const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-3xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">Auditoria</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Histórico de quem fez o quê: exclusões, edições de funcionários,
          abertura/fechamento de caixa, descontos autorizados e movimentações
          de estoque. Visível só para administradores.
        </p>

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
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-[#1c2a1f]">
              Buscar
            </label>
            <input
              type="text"
              name="busca"
              defaultValue={busca}
              placeholder="Ex: nome do produto, funcionário..."
              className="mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33]"
          >
            Filtrar
          </button>
        </form>

        <div className="mt-6">
          {!registros?.length ? (
            <p className="text-sm text-[#8b968a]">
              Nenhum registro de auditoria no período.
            </p>
          ) : (
            <div className="space-y-2">
              {registros.map((registro) => (
                <div
                  key={registro.id}
                  className="rounded-xl border border-[#dcdfd2] p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#1c2a1f]">
                      {ROTULOS_ACAO[registro.acao] ?? registro.acao}
                    </span>
                    <span className="text-xs text-[#8b968a]">
                      {formatoDataHora.format(new Date(registro.criado_em))}
                    </span>
                  </div>
                  <p className="mt-1 text-[#5b6b5c]">{registro.descricao}</p>
                  <p className="mt-1 text-xs text-[#8b968a]">
                    Por: {mapaNomes.get(registro.usuario_id) ?? "desconhecido"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-[#8b968a]">
          Esse histórico cobre exclusões, edições de funcionários,
          abertura/fechamento/correção de caixa, sangria/suprimento,
          descontos autorizados e entradas/ajustes de estoque. Cadastros
          rotineiros (criar produto, categoria, combo etc.) não entram aqui
          por enquanto, pra manter a lista fácil de acompanhar.
        </p>
      </main>
  );
}
