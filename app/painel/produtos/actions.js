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

// Todo produto tem código. Código só com números ganha zeros à esquerda até
// 4 dígitos ("7" vira "0007"), para ficar no padrão 0001, 0002, ...
function normalizarCodigo(texto) {
  const codigo = (texto ?? "").toString().trim().toUpperCase();
  if (/^[0-9]{1,3}$/.test(codigo)) {
    return codigo.padStart(4, "0");
  }
  return codigo;
}

function mensagemErroProduto(error, codigo, acao) {
  if (error.code === "42501") {
    return `Só uma conta master pode ${acao} produtos.`;
  }
  if (error.code === "23505") {
    return `Já existe outro produto com o código ${codigo}. Use outro código.`;
  }
  return error.message;
}

// Extensão a partir do tipo do arquivo (mais confiável que o nome, que o
// navegador às vezes manda sem extensão em fotos tiradas pelo celular).
function extensaoDaImagem(arquivo) {
  const porTipo = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  if (arquivo?.type && porTipo[arquivo.type]) {
    return porTipo[arquivo.type];
  }
  const nome = arquivo?.name ?? "";
  const partes = nome.split(".");
  return partes.length > 1 ? partes.pop().toLowerCase() : "jpg";
}

// Envia a foto de um produto para o bucket "produtos" e devolve a URL
// pública. Se o envio falhar, devolve null (o produto continua salvo, só
// sem foto) em vez de travar o cadastro inteiro por causa da imagem.
async function enviarImagemProduto(supabase, produtoId, arquivo) {
  if (!arquivo || typeof arquivo === "string" || !arquivo.size) {
    return null;
  }

  const caminho = `produto-${produtoId}-${Date.now()}.${extensaoDaImagem(arquivo)}`;

  const { error } = await supabase.storage
    .from("produtos")
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });

  if (error) {
    return null;
  }

  const { data } = supabase.storage.from("produtos").getPublicUrl(caminho);
  return data?.publicUrl ?? null;
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
  const codigo = normalizarCodigo(formData.get("codigo"));
  const precoTexto = formData.get("preco")?.toString().replace(",", ".");
  const custoTexto = formData.get("custo")?.toString().replace(",", ".");
  const arquivoImagem = formData.get("imagem_arquivo");

  const preco = Number(precoTexto);
  const custo = custoTexto ? Number(custoTexto) : 0;

  if (!categoriaId || !nome || !precoTexto || Number.isNaN(preco)) {
    comErro("Preencha categoria, nome e preço corretamente.");
  }

  if (!codigo) {
    comErro("Todo produto precisa de um código (ex: 0001).");
  }

  if (Number.isNaN(custo)) {
    comErro("O custo precisa ser um número.");
  }

  const supabase = await createClient();

  const { data: produtoCriado, error } = await supabase
    .from("produtos")
    .insert({
      categoria_id: Number(categoriaId),
      nome,
      descricao,
      codigo,
      preco,
      custo,
    })
    .select("id")
    .single();

  if (error) {
    comErro(mensagemErroProduto(error, codigo, "cadastrar"));
  }

  // Se veio uma foto, envia agora que já temos o id do produto. Se a foto
  // falhar por algum motivo, o produto já está salvo mesmo assim.
  const urlImagem = await enviarImagemProduto(
    supabase,
    produtoCriado.id,
    arquivoImagem
  );
  if (urlImagem) {
    await supabase
      .from("produtos")
      .update({ imagem: urlImagem })
      .eq("id", produtoCriado.id);
  }

  comSucesso(`Produto "${nome}" cadastrado.`);
}

export async function editarProduto(formData) {
  const id = formData.get("id")?.toString();
  const categoriaId = formData.get("categoria_id")?.toString();
  const nomeNovo = formData.get("nome")?.toString().trim();
  const nome = nomeNovo || formData.get("nome_atual")?.toString() || `#${id}`;
  const descricao = formData.get("descricao")?.toString().trim() || null;
  const codigo = normalizarCodigo(formData.get("codigo"));
  const precoTexto = formData.get("preco")?.toString().replace(",", ".");
  const custoTexto = formData.get("custo")?.toString().replace(",", ".");
  const arquivoImagem = formData.get("imagem_arquivo");
  const removerImagem = formData.get("remover_imagem") === "on";

  if (!id) {
    comErro("Produto inválido.");
  }

  if (!categoriaId || !nomeNovo || !precoTexto) {
    comErro("Preencha categoria, nome e preço corretamente.");
  }

  if (!codigo) {
    comErro("Todo produto precisa de um código (ex: 0001).");
  }

  const preco = Number(precoTexto);
  const custo = custoTexto ? Number(custoTexto) : 0;

  if (Number.isNaN(preco)) {
    comErro("O preço precisa ser um número.");
  }

  if (Number.isNaN(custo)) {
    comErro("O custo precisa ser um número.");
  }

  const supabase = await createClient();

  const atualizacao = {
    categoria_id: Number(categoriaId),
    nome: nomeNovo,
    descricao,
    codigo,
    preco,
    custo,
  };

  if (removerImagem) {
    atualizacao.imagem = null;
  } else {
    const urlImagem = await enviarImagemProduto(supabase, id, arquivoImagem);
    if (urlImagem) {
      atualizacao.imagem = urlImagem;
    }
  }

  const { error } = await supabase
    .from("produtos")
    .update(atualizacao)
    .eq("id", id);

  if (error) {
    comErro(mensagemErroProduto(error, codigo, "editar"));
  }

  await registrarAuditoria("produto.editar", `Editou o produto "${nome}".`);
  comSucesso(`Produto "${nome}" atualizado.`);
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
