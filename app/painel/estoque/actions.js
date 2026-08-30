"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

function comErro(mensagem) {
  redirect("/painel/estoque?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/estoque?sucesso=" + encodeURIComponent(mensagem));
}

function mensagemDoErro(error, mensagemPadrao) {
  return error.code === "42501"
    ? "Só admin ou gerente podem fazer isso."
    : mensagemPadrao || error.message;
}

const UNIDADES_VALIDAS = ["kg", "g", "l", "ml", "un"];

export async function criarIngrediente(formData) {
  const nome = formData.get("nome")?.toString().trim();
  const unidade = formData.get("unidade")?.toString();
  const quantidadeTexto = formData
    .get("quantidade_atual")
    ?.toString()
    .replace(",", ".");
  const minimaTexto = formData
    .get("quantidade_minima")
    ?.toString()
    .replace(",", ".");

  const quantidadeAtual = quantidadeTexto ? Number(quantidadeTexto) : 0;
  const quantidadeMinima = minimaTexto ? Number(minimaTexto) : 0;

  if (!nome) comErro("Digite o nome do ingrediente.");
  if (!UNIDADES_VALIDAS.includes(unidade)) comErro("Escolha uma unidade válida.");
  if (Number.isNaN(quantidadeAtual) || Number.isNaN(quantidadeMinima)) {
    comErro("Quantidade inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ingredientes").insert({
    nome,
    unidade,
    quantidade_atual: quantidadeAtual,
    quantidade_minima: quantidadeMinima,
  });

  if (error) comErro(mensagemDoErro(error));

  comSucesso(`Ingrediente "${nome}" cadastrado.`);
}

export async function editarIngrediente(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString().trim();
  const unidade = formData.get("unidade")?.toString();
  const minimaTexto = formData
    .get("quantidade_minima")
    ?.toString()
    .replace(",", ".");
  const quantidadeMinima = Number(minimaTexto);

  if (!id) comErro("Ingrediente inválido.");
  if (!nome) comErro("Digite o nome do ingrediente.");
  if (!UNIDADES_VALIDAS.includes(unidade)) comErro("Escolha uma unidade válida.");
  if (Number.isNaN(quantidadeMinima)) comErro("Quantidade mínima inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("ingredientes")
    .update({ nome, unidade, quantidade_minima: quantidadeMinima })
    .eq("id", id);

  if (error) comErro(mensagemDoErro(error));

  comSucesso(`Ingrediente "${nome}" atualizado.`);
}

export async function apagarIngrediente(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString() || `#${id}`;
  if (!id) comErro("Ingrediente inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("ingredientes").delete().eq("id", id);

  if (error) {
    comErro(
      error.code === "23503"
        ? "Esse ingrediente está na ficha técnica de algum produto ou tem movimentações — remova essas ligações primeiro."
        : mensagemDoErro(error)
    );
  }

  await registrarAuditoria(
    "ingrediente.apagar",
    `Apagou o ingrediente "${nome}".`
  );
  comSucesso("Ingrediente apagado.");
}

export async function registrarMovimentacaoEstoque(formData) {
  const ingredienteId = formData.get("ingrediente_id")?.toString();
  const nomeIngrediente = formData.get("nome_ingrediente")?.toString() || "";
  const tipo = formData.get("tipo")?.toString();
  const quantidadeTexto = formData
    .get("quantidade")
    ?.toString()
    .replace(",", ".");
  const motivo = formData.get("motivo")?.toString().trim() || null;

  const quantidade = Number(quantidadeTexto);

  if (!ingredienteId) comErro("Ingrediente inválido.");
  if (tipo !== "entrada" && tipo !== "ajuste") {
    comErro("Escolha entrada ou ajuste.");
  }
  if (!quantidadeTexto || Number.isNaN(quantidade)) {
    comErro("Digite uma quantidade válida.");
  }
  if (tipo === "entrada" && quantidade <= 0) {
    comErro("A quantidade de entrada precisa ser maior que zero.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("movimentacoes_estoque").insert({
    ingrediente_id: Number(ingredienteId),
    tipo,
    quantidade,
    motivo,
    criado_por: user?.id ?? null,
  });

  if (error) comErro(mensagemDoErro(error));

  await registrarAuditoria(
    tipo === "entrada" ? "estoque.entrada" : "estoque.ajuste",
    `${tipo === "entrada" ? "Registrou entrada de" : "Fez um ajuste de"} ${quantidade} em "${nomeIngrediente}"${
      motivo ? ` — ${motivo}` : ""
    }.`
  );

  comSucesso(
    tipo === "entrada" ? "Entrada registrada." : "Ajuste registrado."
  );
}

export async function definirFichaTecnica(formData) {
  const produtoId = formData.get("produto_id")?.toString();
  const ingredienteId = formData.get("ingrediente_id")?.toString();
  const quantidadeTexto = formData
    .get("quantidade_por_unidade")
    ?.toString()
    .replace(",", ".");
  const quantidade = Number(quantidadeTexto);

  if (!produtoId || !ingredienteId) comErro("Escolha o produto e o ingrediente.");
  if (!quantidadeTexto || Number.isNaN(quantidade) || quantidade <= 0) {
    comErro("Digite quanto desse ingrediente o produto usa.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("produto_ingredientes").upsert(
    {
      produto_id: Number(produtoId),
      ingrediente_id: Number(ingredienteId),
      quantidade_por_unidade: quantidade,
    },
    { onConflict: "produto_id,ingrediente_id" }
  );

  if (error) comErro(mensagemDoErro(error));

  comSucesso("Ficha técnica atualizada.");
}

export async function removerIngredienteDoProduto(formData) {
  const id = formData.get("id")?.toString();
  if (!id) comErro("Item inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("produto_ingredientes")
    .delete()
    .eq("id", id);

  if (error) comErro(mensagemDoErro(error));

  comSucesso("Ingrediente removido da ficha técnica.");
}
