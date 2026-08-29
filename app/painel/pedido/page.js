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

  const { data: adicionais } = await supabase
    .from("adicionais")
    .select("id, nome, preco, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: combosBrutos } = await supabase
    .from("combos")
    .select("id, nome, preco, imagem, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const { data: itensCombo } = await supabase
    .from("combo_itens")
    .select(
      "id, combo_id, quantidade, rotulo, produto_id, produtos(nome), categoria_id, categorias(nome, icone)"
    );

  // Monta cada combo já com a lista dos itens dele (pra não precisar de
  // outra chamada ao banco no navegador).
  const combos = (combosBrutos ?? []).map((combo) => ({
    id: combo.id,
    nome: combo.nome,
    preco: combo.preco,
    imagem: combo.imagem,
    itens: (itensCombo ?? [])
      .filter((item) => item.combo_id === combo.id)
      .map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
        rotulo: item.rotulo,
        produtoId: item.produto_id,
        produtoNome: item.produtos?.nome ?? null,
        categoriaId: item.categoria_id,
        categoriaNome: item.categorias?.nome ?? null,
        categoriaIcone: item.categorias?.icone ?? null,
      })),
  }));

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
          Clique nos produtos ou combos para montar o pedido. Adicione
          adicionais em cada item e, se precisar, aplique um desconto com
          autorização de um gerente/admin.
        </p>

        <NovoPedido
          categorias={categorias ?? []}
          produtos={produtos ?? []}
          combos={combos}
          adicionais={adicionais ?? []}
        />
      </div>
    </div>
  );
}
