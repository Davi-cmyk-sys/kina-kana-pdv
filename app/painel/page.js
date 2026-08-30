import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

const NOMES_PAPEL = {
  admin: "Administrador(a)",
  gerente: "Gerente",
  caixa: "Caixa",
  cozinha: "Cozinha",
  entregador: "Entregador(a)",
  pendente: "Aguardando liberação",
};

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel")
    .eq("id", user.id)
    .maybeSingle();

  const papel = perfil?.papel ?? "pendente";
  const nome = perfil?.nome ?? user.email;
  const aguardandoLiberacao = papel === "pendente";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee] p-6">
      <main className="w-full max-w-lg rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f3e]">
          Kina Kana PDV
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1c2a1f]">
          Olá, {nome}
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Você está logado como{" "}
          <span className="font-semibold text-[#1c2a1f]">
            {NOMES_PAPEL[papel] ?? papel}
          </span>
          .
        </p>

        {aguardandoLiberacao && (
          <div className="mt-4 rounded-xl bg-[#fdf3e0] p-3 text-sm text-[#7a5b16]">
            Sua conta ainda não tem um papel definido no sistema. Peça para
            um administrador liberar seu acesso.
          </div>
        )}

        {["admin", "gerente", "caixa"].includes(papel) && (
          <Link
            href="/painel/pedido"
            className="mt-6 block w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#195c33]"
          >
            Novo Pedido
          </Link>
        )}

        {["admin", "gerente", "caixa"].includes(papel) && (
          <Link
            href="/painel/pedidos"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Pedidos
          </Link>
        )}

        {["admin", "gerente", "caixa"].includes(papel) && (
          <Link
            href="/painel/caixa"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Caixa
          </Link>
        )}

        {["admin", "gerente"].includes(papel) && (
          <Link
            href="/painel/produtos"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Cardápio (categorias e produtos)
          </Link>
        )}

        {["admin", "gerente"].includes(papel) && (
          <Link
            href="/painel/combos"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Combos e adicionais
          </Link>
        )}

        {["admin", "gerente", "caixa"].includes(papel) && (
          <Link
            href="/painel/impressora"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Configuração de Impressora
          </Link>
        )}

        {["admin", "gerente"].includes(papel) && (
          <Link
            href="/painel/relatorios"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Relatórios e estatísticas
          </Link>
        )}

        {papel === "admin" && (
          <Link
            href="/painel/funcionarios"
            className="mt-3 block w-full rounded-lg border border-[#1f6f3e] px-4 py-2 text-center text-sm font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
          >
            Gerenciar funcionários
          </Link>
        )}

        <form action={sair} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-lg border border-[#dcdfd2] px-4 py-2 text-sm font-semibold text-[#1c2a1f] transition hover:bg-[#f6f4ee]"
          >
            Sair
          </button>
        </form>
      </main>
    </div>
  );
}
