"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function comErro(mensagem) {
  redirect("/painel/combos?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/combos?sucesso=" + encodeURIComponent(mensagem));
}

function mensagemDoErro(error, mensagemPadrao) {
  return error.code === "42501"
    ? "Só admin ou gerente podem fazer isso."
    : mensagemPadrao || error.message;
}

export async function criarAdicional(formData) {
  const nome = formData.get("nome")?.toString().trim();
  const precoTexto = formData.get("preco")?.toString().replace(",", ".");
  const preco = Number(precoTexto);

  if (!nome || !precoTexto || Number.isNaN(preco)) {
    comErro("Preencha nome e preço do adicional corretamente.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("adicionais").insert({ nome, preco });

  if (error) {
    comErro(mensagemDoErro(error));
  }

  comSucesso(`Adicional "${nome}" cadastrado.`);
}

export async function criarCombo(formData) {
  const nome = formData.get("nome")?.toString().trim();
  const descricao = formData.get("descricao")?.toString().trim() || null;
  const precoTexto = formData.get("preco")?.toString().replace(",", ".");
  const custoTexto = formData.get("custo")?.toString().replace(",", ".");
  const imagem = formData.get("imagem")?.toString().trim() || null;

  const preco = Number(precoTexto);
  const custo = custoTexto ? Number(custoTexto) : 0;

  if (!nome || !precoTexto || Number.isNaN(preco)) {
    comErro("Preencha nome e preço do combo corretamente.");
  }
  if (Number.isNaN(custo)) {
    comErro("O custo precisa ser um número.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("combos")
    .insert({ nome, descricao, preco, custo, imagem });

  if (error) {
    comErro(mensagemDoErro(error));
  }

  comSucesso(`Combo "${nome}" cadastrado. Agora adicione os itens dele.`);
}

export async function adicionarItemCombo(formData) {
  const comboId = formData.get("combo_id")?.toString();
  const tipo = formData.get("tipo")?.toString(); // "produto" ou "categoria"
  const produtoId = formData.get("produto_id")?.toString();
  const categoriaId = formData.get("categoria_id")?.toString();
  const quantidadeTexto = formData.get("quantidade")?.toString();
  const rotulo = formData.get("rotulo")?.toString().trim() || null;

  const quantidade = Number(quantidadeTexto) || 1;

  if (!comboId) {
    comErro("Combo inválido.");
  }
  if (tipo !== "produto" && tipo !== "categoria") {
    comErro("Escolha se o item é um produto específico ou uma categoria.");
  }
  if (tipo === "produto" && !produtoId) {
    comErro("Escolha o produto do item.");
  }
  if (tipo === "categoria" && !categoriaId) {
    comErro("Escolha a categoria do item.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("combo_itens").insert({
    combo_id: Number(comboId),
    produto_id: tipo === "produto" ? Number(produtoId) : null,
    categoria_id: tipo === "categoria" ? Number(categoriaId) : null,
    quantidade,
    rotulo,
  });

  if (error) {
    comErro(mensagemDoErro(error));
  }

  comSucesso("Item adicionado ao combo.");
}
