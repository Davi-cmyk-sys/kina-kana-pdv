import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SECOES_PAINEL } from "@/lib/secoesPainel";
import { temAcesso } from "@/lib/permissoes";
import NovoFuncionarioForm from "./NovoFuncionarioForm";
import { editarFuncionario, apagarFuncionario } from "./actions";
import BotaoApagar from "@/components/BotaoApagar";

const NOMES_PAPEL = {
  admin: "Administrador(a)",
  gerente: "Gerente",
  caixa: "Caixa",
  cozinha: "Cozinha",
  entregador: "Entregador(a)",
  pendente: "Aguardando liberação",
};

const PAPEIS = [
  { valor: "caixa", rotulo: "Caixa" },
  { valor: "cozinha", rotulo: "Cozinha" },
  { valor: "entregador", rotulo: "Entregador(a)" },
  { valor: "gerente", rotulo: "Gerente" },
  { valor: "admin", rotulo: "Administrador(a)" },
  { valor: "pendente", rotulo: "Aguardando liberação" },
];

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default async function FuncionariosPage({ searchParams }) {
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
    .select("papel, master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const podeAcessar = temAcesso("/painel/funcionarios", {
    papel: meuPerfil?.papel,
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeAcessar) {
    redirect("/painel");
  }

  const { data: funcionarios } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo, master, secoes_bloqueadas, criado_em")
    .order("criado_em", { ascending: true });

  // Lista de telas que dá pra personalizar por pessoa (Auditoria fica de
  // fora — continua controlada só por quem é admin).
  const secoesPersonalizaveis = SECOES_PAINEL.filter(
    (s) => s.href !== "/painel/auditoria"
  );

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">
          Funcionários
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Cadastre aqui quem vai ter acesso ao sistema, e escolha o papel de
          cada pessoa.
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

        <NovoFuncionarioForm />

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[#1c2a1f]">
            Contas cadastradas ({funcionarios?.length ?? 0})
          </h2>

          <div className="mt-3 divide-y divide-[#eceae0] overflow-hidden rounded-xl border border-[#dcdfd2]">
            {funcionarios?.map((f) => (
              <details key={f.id} className="bg-white p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1c2a1f]">
                      {f.nome}
                      {f.master && (
                        <span className="ml-2 rounded-full bg-[#1f6f3e]/10 px-2 py-0.5 text-xs font-semibold text-[#1f6f3e]">
                          Master
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#8b968a]">
                      {NOMES_PAPEL[f.papel] ?? f.papel}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      f.ativo
                        ? "bg-[#e7f2ea] text-[#1f6f3e]"
                        : "bg-[#f0f0ea] text-[#8b968a]"
                    }`}
                  >
                    {f.ativo ? "Ativo" : "Inativo"}
                  </span>
                </summary>

                <form
                  action={editarFuncionario}
                  className="mt-3 grid gap-3 border-t border-[#eceae0] pt-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={f.id} />
                  <div>
                    <label className="block text-xs font-medium text-[#1c2a1f]">
                      Nome
                    </label>
                    <input
                      type="text"
                      name="nome"
                      required
                      defaultValue={f.nome}
                      className={campoClasse}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#1c2a1f]">
                      Papel
                    </label>
                    <select
                      name="papel"
                      defaultValue={f.papel}
                      className={campoClasse}
                    >
                      {PAPEIS.map((p) => (
                        <option key={p.valor} value={p.valor}>
                          {p.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#1c2a1f] sm:col-span-2">
                    <input
                      type="checkbox"
                      name="ativo"
                      defaultChecked={f.ativo}
                    />
                    Conta ativa (desmarque para bloquear o acesso sem apagar
                    a conta)
                  </label>

                  <div className="rounded-lg border border-[#dcdfd2] bg-white p-3 sm:col-span-2">
                    <p className="text-sm font-medium text-[#1c2a1f]">
                      Marque as telas que essa pessoa NÃO pode acessar
                    </p>
                    <p className="mt-1 text-xs text-[#8b968a]">
                      Deixe tudo desmarcado para usar o acesso normal do
                      papel dela. Marque, por exemplo, "Relatórios" para
                      esconder o lucro da loja dessa pessoa.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                      {secoesPersonalizaveis
                        .filter(
                          (s) =>
                            !(f.id === user.id && s.href === "/painel/funcionarios")
                        )
                        .map((s) => (
                          <label
                            key={s.href}
                            className="flex items-center gap-1.5 text-xs text-[#1c2a1f]"
                          >
                            <input
                              type="checkbox"
                              name="secoesBloqueadas"
                              value={s.href}
                              defaultChecked={f.secoes_bloqueadas?.includes(
                                s.href
                              )}
                            />
                            {s.icone} {s.label}
                          </label>
                        ))}
                    </div>
                    {f.id === user.id && (
                      <p className="mt-1 text-[10px] text-[#8b968a]">
                        Você não pode bloquear "Funcionários" para si
                        mesmo(a), pra não perder o acesso a essa tela.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:col-span-2 sm:w-auto"
                  >
                    Salvar
                  </button>
                </form>

                {f.id !== user.id && (
                  <div className="mt-3 border-t border-[#eceae0] pt-3">
                    <BotaoApagar
                      acao={apagarFuncionario}
                      campos={{ id: f.id, nome: f.nome }}
                      confirmacao={`Apagar a conta de "${f.nome}"? Essa pessoa perde o acesso ao sistema imediatamente e não é possível desfazer.`}
                      className="text-xs font-medium text-[#b3432f] hover:underline"
                      texto="Excluir esta conta"
                    />
                  </div>
                )}
              </details>
            ))}
          </div>
        </div>
      </main>
  );
}
