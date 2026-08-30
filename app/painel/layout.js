import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { secoesPermitidas } from "@/lib/secoesPainel";
import PainelNav from "./PainelNav";
import { sair } from "./actions";

const NOMES_PAPEL = {
  admin: "Administrador(a)",
  gerente: "Gerente",
  caixa: "Caixa",
  cozinha: "Cozinha",
  entregador: "Entregador(a)",
  pendente: "Aguardando liberação",
};

export default async function PainelLayout({ children }) {
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
  const secoes = [
    { href: "/painel", label: "Início", icone: "🏠" },
    ...secoesPermitidas(papel),
  ];

  return (
    <div className="min-h-screen bg-[#f6f4ee]">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#1f6f3e] to-[#195c33] shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/painel" className="flex items-center gap-2 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Kina Kana"
              className="h-9 w-9 rounded-full object-cover shadow-sm"
            />
            <span className="hidden text-base font-extrabold leading-tight sm:block">
              Kina Kana
            </span>
          </Link>

          <div className="flex-1" />

          <div className="hidden text-right text-white sm:block">
            <p className="text-sm font-semibold leading-tight">
              {perfil?.nome ?? user.email}
            </p>
            <p className="text-xs leading-tight text-white/75">
              {NOMES_PAPEL[papel] ?? papel}
            </p>
          </div>

          <form action={sair}>
            <button
              type="submit"
              className="rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Sair
            </button>
          </form>
        </div>

        <PainelNav secoes={secoes} />
      </header>

      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
