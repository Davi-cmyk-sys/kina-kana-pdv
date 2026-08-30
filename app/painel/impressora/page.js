import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temAcesso } from "@/lib/permissoes";
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
    .select("papel, master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const podeVender = temAcesso("/painel/impressora", {
    papel: meuPerfil?.papel,
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeVender) {
    redirect("/painel");
  }

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">
          Configuração de Impressora
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Pareie a impressora térmica Bluetooth deste computador/tablet para
          imprimir os comprovantes dos pedidos.
        </p>

        <ConfiguracaoImpressora />
      </main>
  );
}
