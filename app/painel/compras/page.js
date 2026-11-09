import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { temAcesso } from "@/lib/permissoes";
import SolicitarCompras from "./SolicitarCompras";
import { atenderSolicitacaoCompra, cancelarSolicitacaoCompra } from "./actions";

const NOMES_STATUS = {
  pendente: "Pendente",
  atendida: "Atendida",
  cancelada: "Cancelada",
};

const CORES_STATUS = {
  pendente: "text-[#b3432f]",
  atendida: "text-[#1f6f3e]",
  cancelada: "text-[#8b968a]",
};

export default async function ComprasPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const { supabase, user, perfil: meuPerfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }

  const podeAcessar = temAcesso("/painel/compras", {
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeAcessar) {
    redirect("/painel");
  }

  const podeGerenciar = meuPerfil?.master === true;

  // Consultas independentes saem todas ao mesmo tempo (uma ida ao banco
  // em vez de várias seguidas).
  const [
    { data: ingredientes },
    { data: solicitacoes },
  ] = await Promise.all([
    supabase
      .from("ingredientes")
      .select("nome")
      .order("nome", { ascending: true }),
    supabase
      .from("solicitacoes_compra")
      .select("id, itens, observacao, status, criado_em, perfis(nome)")
      .order("criado_em", { ascending: false })
      .limit(30),
  ]);

  const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#1c2a1f]">Solicitar Compras</h1>
      <p className="mt-1 text-sm text-[#5b6b5c]">
        Peça os mantimentos que estão em falta — a direção recebe um aviso
        na hora.
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

      <SolicitarCompras sugestoes={(ingredientes ?? []).map((i) => i.nome)} />

      <div className="mt-8 border-t border-[#eceae0] pt-6">
        <h2 className="text-lg font-bold text-[#1c2a1f]">
          {podeGerenciar ? "Todas as solicitações" : "Minhas solicitações recentes"}
        </h2>

        {!solicitacoes?.length ? (
          <p className="mt-3 text-sm text-[#8b968a]">
            Nenhuma solicitação registrada ainda.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {solicitacoes.map((s) => (
              <div key={s.id} className="rounded-xl border border-[#dcdfd2] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#8b968a]">
                    {formatoDataHora.format(new Date(s.criado_em))}
                    {s.perfis?.nome ? ` — ${s.perfis.nome}` : ""}
                  </p>
                  <span className={"text-xs font-bold " + CORES_STATUS[s.status]}>
                    {NOMES_STATUS[s.status] ?? s.status}
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-[#1c2a1f]">
                  {(s.itens ?? []).map((item, idx) => (
                    <li key={idx}>
                      • {item.quantidade} {item.unidade} de {item.nome}
                    </li>
                  ))}
                </ul>
                {s.observacao && (
                  <p className="mt-1 text-xs text-[#5b6b5c]">
                    Obs: {s.observacao}
                  </p>
                )}

                {podeGerenciar && s.status === "pendente" && (
                  <div className="mt-3 flex gap-2">
                    <form action={atenderSolicitacaoCompra}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] hover:bg-[#f6f4ee]"
                      >
                        Marcar como atendida
                      </button>
                    </form>
                    <form action={cancelarSolicitacaoCompra}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-[#dcdfd2] px-3 py-1.5 text-xs font-semibold text-[#b3432f] hover:bg-[#f6f4ee]"
                      >
                        Cancelar
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
