import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  marcarNotificacaoLida,
  marcarTodasLidas,
  responderFechamentoCaixa,
} from "./actions";

const ICONES_TIPO = {
  desconto: "🏷️",
  caixa_fechado: "💰",
  caixa_aprovado: "✅",
  caixa_reprovado: "⚠️",
  compra_solicitada: "🛒",
};

export default async function NotificacoesPage({ searchParams }) {
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
    .select("master")
    .eq("id", user.id)
    .maybeSingle();

  if (meuPerfil?.master !== true) {
    redirect("/painel");
  }

  const { data: notificacoes } = await supabase
    .from("notificacoes")
    .select("id, tipo, titulo, mensagem, lida, criado_em, relacionado_id")
    .order("lida", { ascending: true })
    .order("criado_em", { ascending: false })
    .limit(50);

  const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida).length;

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2a1f]">Notificações</h1>
          <p className="mt-1 text-sm text-[#5b6b5c]">
            Avisos de descontos, fechamento de caixa e solicitações de compra.
          </p>
        </div>
        {naoLidas > 0 && (
          <form action={marcarTodasLidas}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg border border-[#dcdfd2] px-3 py-1.5 text-xs font-semibold text-[#1c2a1f] hover:bg-[#f6f4ee]"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

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

      {!notificacoes?.length ? (
        <p className="mt-6 text-sm text-[#8b968a]">
          Nenhuma notificação por aqui ainda.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={
                "rounded-xl border p-4 " +
                (n.lida
                  ? "border-[#eceae0] bg-white"
                  : "border-[#1f6f3e] bg-[#e7f2ea]")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-[#1c2a1f]">
                  {ICONES_TIPO[n.tipo] ?? "🔔"} {n.titulo}
                </p>
                <p className="whitespace-nowrap text-xs text-[#8b968a]">
                  {formatoDataHora.format(new Date(n.criado_em))}
                </p>
              </div>
              <p className="mt-1 text-sm text-[#5b6b5c]">{n.mensagem}</p>

              {n.tipo === "caixa_fechado" && !n.lida && n.relacionado_id && (
                <form
                  action={responderFechamentoCaixa}
                  className="mt-3 space-y-2 rounded-lg border border-[#dcdfd2] bg-white p-3"
                >
                  <input type="hidden" name="notificacao_id" value={n.id} />
                  <input type="hidden" name="caixa_id" value={n.relacionado_id} />
                  <label className="block text-xs font-medium text-[#1c2a1f]">
                    Observação (opcional, volta pra quem fechou)
                  </label>
                  <input
                    type="text"
                    name="observacao"
                    className="w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      name="decisao"
                      value="aprovado"
                      className="rounded-lg bg-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#195c33]"
                    >
                      ✅ Aprovar
                    </button>
                    <button
                      type="submit"
                      name="decisao"
                      value="reprovado"
                      className="rounded-lg border border-[#b3432f] px-3 py-1.5 text-xs font-semibold text-[#b3432f] hover:bg-[#fbeae6]"
                    >
                      ⚠️ Reprovar
                    </button>
                  </div>
                </form>
              )}

              {!n.lida && n.tipo !== "caixa_fechado" && (
                <form action={marcarNotificacaoLida} className="mt-2">
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-[#1f6f3e] hover:underline"
                  >
                    Marcar como lida
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
