import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovoFuncionarioForm from "./NovoFuncionarioForm";

const NOMES_PAPEL = {
  admin: "Administrador(a)",
  gerente: "Gerente",
  caixa: "Caixa",
  cozinha: "Cozinha",
  entregador: "Entregador(a)",
  pendente: "Aguardando liberação",
};

export default async function FuncionariosPage() {
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
    <div className="min-h-screen bg-[#f6f4ee] p-6">
      <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <Link
          href="/painel"
          className="text-sm font-medium text-[#1f6f3e] hover:underline"
        >
          ← Voltar ao painel
        </Link>

        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#1f6f3e]">
          Kina Kana PDV
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#1c2a1f]">
          Funcionários
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Cadastre aqui quem vai ter acesso ao sistema, e escolha o papel de
          cada pessoa.
        </p>

        <NovoFuncionarioForm />

        <div className="mt-8">
          <h2 className="text-sm font-semibold text-[#1c2a1f]">
            Contas cadastradas ({funcionarios?.length ?? 0})
          </h2>

          <div className="mt-3 divide-y divide-[#eceae0] overflow-hidden rounded-xl border border-[#dcdfd2]">
            {funcionarios?.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 bg-white p-3"
              >
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
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
