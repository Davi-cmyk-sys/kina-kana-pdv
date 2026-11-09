import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { temAcesso } from "@/lib/permissoes";
import { registrarProducao } from "./actions";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default async function ProducaoPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const { supabase, user, perfil: meuPerfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }

  const podeAcessar = temAcesso("/painel/producao", {
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeAcessar) {
    redirect("/painel");
  }

  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);

  // Consultas independentes saem todas ao mesmo tempo (uma ida ao banco
  // em vez de várias seguidas).
  const [
    { data: produtos },
    { data: producoesHoje },
  ] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, imagem, disponivel")
      .eq("disponivel", true)
      .order("nome", { ascending: true }),
    supabase
      .from("producao_cozinha")
      .select("id, quantidade, criado_em, produtos(nome), perfis(nome)")
      .gte("criado_em", inicioDoDia.toISOString())
      .order("criado_em", { ascending: false }),
  ]);

  const totalPorProduto = {};
  for (const p of producoesHoje ?? []) {
    const nome = p.produtos?.nome ?? "Produto removido";
    totalPorProduto[nome] = (totalPorProduto[nome] ?? 0) + Number(p.quantidade);
  }

  const formatoHora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-[#1c2a1f]">Produção Cozinha</h1>
      <p className="mt-1 text-sm text-[#5b6b5c]">
        Registre quantos salgados (ou outros produtos) foram produzidos.
        Quando o produto tem ficha técnica cadastrada, os ingredientes já
        saem do estoque automaticamente.
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

      {!produtos?.length ? (
        <p className="mt-4 text-sm text-[#8b968a]">
          Nenhum produto cadastrado ainda.
        </p>
      ) : (
        <form
          action={registrarProducao}
          className="mt-6 grid gap-3 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4 sm:grid-cols-[1fr_140px_auto]"
        >
          <div>
            <label className="block text-xs font-medium text-[#1c2a1f]">
              Produto
            </label>
            <select name="produto_id" required className={campoClasse}>
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.imagem && !p.imagem.startsWith("http") ? p.imagem + " " : ""}
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1c2a1f]">
              Quantidade
            </label>
            <input
              type="text"
              inputMode="decimal"
              name="quantidade"
              required
              placeholder="Ex: 50"
              className={campoClasse}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Registrar
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 border-t border-[#eceae0] pt-6">
        <h2 className="text-lg font-bold text-[#1c2a1f]">Produção de hoje</h2>

        {!Object.keys(totalPorProduto).length ? (
          <p className="mt-3 text-sm text-[#8b968a]">
            Nenhuma produção registrada hoje ainda.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {Object.entries(totalPorProduto).map(([nome, total]) => (
              <p
                key={nome}
                className="flex items-center justify-between text-sm font-semibold text-[#1c2a1f]"
              >
                <span>{nome}</span>
                <span className="text-[#1f6f3e]">{total}x</span>
              </p>
            ))}
          </div>
        )}

        {producoesHoje?.length > 0 && (
          <div className="mt-4 space-y-1 border-t border-[#eceae0] pt-3">
            {producoesHoje.map((p) => (
              <p key={p.id} className="text-xs text-[#5b6b5c]">
                {formatoHora.format(new Date(p.criado_em))} —{" "}
                <strong>{p.quantidade}x</strong>{" "}
                {p.produtos?.nome ?? "Produto removido"}
                {p.perfis?.nome ? ` (${p.perfis.nome})` : ""}
              </p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
