import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovoFuncionarioForm from "./NovoFuncionarioForm";
import { editarFuncionario } from "./actions";

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
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  if (meuPerfil?.papel !== "admin") {
    redirect("/painel");
  }

  const { data: funcionarios } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo, criado_em")
    .order("criado_em", { ascending: true });

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
                  <button
                    type="submit"
                    className="rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:col-span-2 sm:w-auto"
                  >
                    Salvar
                  </button>
                </form>
              </details>
            ))}
          </div>
        </div>
      </main>
  );
}
