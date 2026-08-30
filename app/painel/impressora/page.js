import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfiguracaoImpressora from "./ConfiguracaoImpressora";

export default async function ImpressoraPage() {
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

  const podeVender = ["admin", "gerente", "caixa"].includes(meuPerfil?.papel);

  if (!podeVender) {
    redirect("/painel");
  }

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
          Configuração de Impressora
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Pareie a impressora térmica Bluetooth deste computador/tablet para
          imprimir os comprovantes dos pedidos.
        </p>

        <ConfiguracaoImpressora />
      </main>
    </div>
  );
}
