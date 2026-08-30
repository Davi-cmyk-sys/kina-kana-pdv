"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

function comErro(mensagem) {
  redirect("/painel/produtos?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/produtos?sucesso=" + encodeURIComponent(mensagem));
}

export async function criarCategoria(formData) {
  const nome = formData.get("nome")?.toString().trim();
  const icone = formData.get("icone")?.toString().trim() || null;

  if (!nome) {
    comErro("Digite o nome da categoria.");
  }

  const supabase = await createClient();

  // Nova categoria entra no fim da lista (maior ordem + 1).
  const { data: ultima } = await supabase
    .from("categorias")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categorias").insert({
    nome,
    icone,
    ordem: (ultima?.ordem ?? -1) + 1,
  });

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só admin ou gerente podem cadastrar categorias."
        : error.message
    );
  }

  comSucesso(`Categoria "${nome}" cadastrada.`);
}

export async function criarProduto(formData) {
  const categoriaId = formData.get("categoria_id")?.toString();
  const nome = formData.get("nome")?.toString().trim();
  const descricao = formData.get("descricao")?.toString().trim() || null;
  const precoTexto = formData.get("preco")?.toString().replace(",", ".");
  const custoTexto = formData.get("custo")?.toString().replace(",", ".");
  const imagem = formData.get("imagem")?.toString().trim() || null;

  const preco = Number(precoTexto);
  const custo = custoTexto ? Number(custoTexto) : 0;

  if (!categoriaId || !nome || !precoTexto || Number.isNaN(preco)) {
    comErro("Preencha categoria, nome e preço corretamente.");
  }

  if (Number.isNaN(custo)) {
    comErro("O custo precisa ser um número.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("produtos").insert({
    categoria_id: Number(categoriaId),
    nome,
    descricao,
    preco,
    custo,
    imagem,
  });

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só admin ou gerente podem cadastrar produtos."
        : error.message
    );
  }

  comSucesso(`Produto "${nome}" cadastrado.`);
}

export async function apagarProduto(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString() || `#${id}`;
  if (!id) {
    comErro("Produto inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) {
    if (error.code === "42501") {
      comErro("Só admin ou gerente podem apagar produtos.");
    }
    if (error.code === "23503") {
      comErro(
        "Esse produto está sendo usado em um combo ou pedido, então não pode ser apagado. Marque como indisponível em vez disso, se quiser."
      );
    }
    comErro(error.message);
  }

  await registrarAuditoria("produto.apagar", `Apagou o produto "${nome}".`);
  comSucesso("Produto apagado.");
}

export async function apagarCategoria(formData) {
  const id = formData.get("id")?.toString();
  const nome = formData.get("nome")?.toString() || `#${id}`;
  if (!id) {
    comErro("Categoria inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);

  if (error) {
    if (error.code === "42501") {
      comErro("Só admin ou gerente podem apagar categorias.");
    }
    if (error.code === "23503") {
      comErro(
        "Essa categoria tem produtos cadastrados dentro dela — apague os produtos primeiro."
      );
    }
    comErro(error.message);
  }

  await registrarAuditoria("categoria.apagar", `Apagou a categoria "${nome}".`);
  comSucesso("Categoria apagada.");
}
