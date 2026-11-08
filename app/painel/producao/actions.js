"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

function comErro(mensagem) {
  redirect("/painel/producao?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/producao?sucesso=" + encodeURIComponent(mensagem));
}

export async function registrarProducao(formData) {
  const produtoId = formData.get("produto_id")?.toString();
  const quantidadeTexto = formData
    .get("quantidade")
    ?.toString()
    .replace(",", ".");
  const quantidade = Number(quantidadeTexto);

  if (!produtoId) comErro("Escolha o produto.");
  if (!quantidadeTexto || Number.isNaN(quantidade) || quantidade <= 0) {
    comErro("Digite uma quantidade válida.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) comErro("Sua sessão expirou. Faça login de novo.");

  const { data: produto } = await supabase
    .from("produtos")
    .select("nome")
    .eq("id", produtoId)
    .maybeSingle();
  const nomeProduto = produto?.nome ?? `#${produtoId}`;

  const { data: producao, error } = await supabase
    .from("producao_cozinha")
    .insert({
      produto_id: Number(produtoId),
      quantidade,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (error) {
    comErro(
      error.code === "42501"
        ? "Você não tem permissão para registrar produção."
        : error.message
    );
  }

  // Baixa automática dos ingredientes da ficha técnica deste produto —
  // igual ao que já acontece numa venda, só que disparado pela produção
  // na cozinha em vez de pelo pedido. Best-effort: se faltar ficha
  // técnica cadastrada, a produção já ficou registrada mesmo assim.
  try {
    const { data: fichaTecnica } = await supabase
      .from("produto_ingredientes")
      .select("ingrediente_id, quantidade_por_unidade")
      .eq("produto_id", produtoId);

    for (const f of fichaTecnica ?? []) {
      await supabase.from("movimentacoes_estoque").insert({
        ingrediente_id: f.ingrediente_id,
        tipo: "saida",
        quantidade: f.quantidade_por_unidade * quantidade,
        motivo: `Produção na cozinha de ${quantidade}x "${nomeProduto}" (registro #${producao.id})`,
        criado_por: user.id,
      });
    }
  } catch (err) {
    console.error("Erro ao dar baixa no estoque pela produção:", err);
  }

  await registrarAuditoria(
    "producao.registrar",
    `Registrou produção de ${quantidade}x "${nomeProduto}".`
  );

  comSucesso(`Produção de ${quantidade}x "${nomeProduto}" registrada.`);
}
