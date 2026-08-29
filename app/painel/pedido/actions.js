"use server";

import { createClient } from "@/lib/supabase/server";

export async function criarPedido({ itens, observacoes }) {
  if (!itens || itens.length === 0) {
    return { erro: "O carrinho está vazio." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Sua sessão expirou. Atualize a página e faça login de novo." };
  }

  const hoje = new Date().toISOString().slice(0, 10);

  // Número da senha do dia = quantos pedidos já foram abertos hoje + 1.
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("data_referencia", hoje);

  const numeroSenha = (count ?? 0) + 1;
  const subtotal = itens.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0
  );

  const { data: pedido, error: erroPedido } = await supabase
    .from("pedidos")
    .insert({
      numero_senha: numeroSenha,
      data_referencia: hoje,
      funcionario_id: user.id,
      subtotal,
      total: subtotal,
      observacoes: observacoes || null,
    })
    .select("id, numero_senha")
    .single();

  if (erroPedido) {
    return {
      erro:
        erroPedido.code === "42501"
          ? "Você não tem permissão para abrir pedidos."
          : erroPedido.message,
    };
  }

  const itensParaInserir = itens.map((item) => ({
    pedido_id: pedido.id,
    produto_id: item.produtoId,
    nome_snapshot: item.nome,
    quantidade: item.quantidade,
    preco_unitario: item.preco,
    subtotal: item.preco * item.quantidade,
  }));

  const { error: erroItens } = await supabase
    .from("itens_pedido")
    .insert(itensParaInserir);

  if (erroItens) {
    return {
      erro:
        "O pedido foi aberto, mas houve um erro ao salvar os itens: " +
        erroItens.message,
    };
  }

  return { sucesso: true, numeroSenha: pedido.numero_senha };
}
