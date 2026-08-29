import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NovoPedido from "./NovoPedido";

export default async function PedidoPage() {
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

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, icone")
    .order("ordem", { ascending: true });

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, preco, imagem, categoria_id, disponivel")
    .eq("disponivel", true)
    .order("nome", { ascending: true });

  return (
    <div className="min-h-screen bg-[#f6f4ee] p-6">
      <div className="mx-auto max-w-5xl">
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
          Novo Pedido
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Clique nos produtos para montar o pedido. Combos, adicionais e
          desconto chegam nas próximas partes desta fase.
        </p>

        <NovoPedido categorias={categorias ?? []} produtos={produtos ?? []} />
      </div>
    </div>
  );
}
