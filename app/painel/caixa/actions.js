"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function comErro(mensagem) {
  redirect("/painel/caixa?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/caixa?sucesso=" + encodeURIComponent(mensagem));
}

export async function abrirCaixa(formData) {
  const valorTexto = formData.get("valor_abertura")?.toString().replace(",", ".");
  const valorAbertura = valorTexto ? Number(valorTexto) : 0;

  if (Number.isNaN(valorAbertura) || valorAbertura < 0) {
    comErro("Digite um valor de abertura válido.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    comErro("Sua sessão expirou. Faça login de novo.");
  }

  const { error } = await supabase.from("caixas").insert({
    aberto_por: user.id,
    valor_abertura: valorAbertura,
  });

  if (error) {
    if (error.code === "23505") {
      comErro("Já existe um caixa aberto. Feche o caixa atual primeiro.");
    }
    comErro(
      error.code === "42501"
        ? "Você não tem permissão para abrir o caixa."
        : error.message
    );
  }

  comSucesso("Caixa aberto.");
}

export async function registrarMovimentacao(formData) {
  const caixaId = formData.get("caixa_id")?.toString();
  const tipo = formData.get("tipo")?.toString();
  const valorTexto = formData.get("valor")?.toString().replace(",", ".");
  const motivo = formData.get("motivo")?.toString().trim() || null;

  const valor = Number(valorTexto);

  if (!caixaId) comErro("Caixa inválido.");
  if (tipo !== "sangria" && tipo !== "suprimento") {
    comErro("Escolha sangria ou suprimento.");
  }
  if (!valorTexto || Number.isNaN(valor) || valor <= 0) {
    comErro("Digite um valor válido.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("movimentacoes_caixa").insert({
    caixa_id: Number(caixaId),
    tipo,
    valor,
    motivo,
    criado_por: user?.id ?? null,
  });

  if (error) {
    comErro(
      error.code === "42501"
        ? "Você não tem permissão para registrar movimentações."
        : error.message
    );
  }

  comSucesso(
    tipo === "sangria" ? "Sangria registrada." : "Suprimento registrado."
  );
}

export async function editarCaixa(formData) {
  const caixaId = formData.get("caixa_id")?.toString();
  const valorAberturaTexto = formData
    .get("valor_abertura")
    ?.toString()
    .replace(",", ".");
  const valorContadoTexto = formData
    .get("valor_contado")
    ?.toString()
    .replace(",", ".");
  const observacoes = formData.get("observacoes")?.toString().trim() || null;

  const valorAbertura = Number(valorAberturaTexto);
  const valorContado = Number(valorContadoTexto);

  if (!caixaId) comErro("Caixa inválido.");
  if (!valorAberturaTexto || Number.isNaN(valorAbertura) || valorAbertura < 0) {
    comErro("Digite um valor de abertura válido.");
  }
  if (!valorContadoTexto || Number.isNaN(valorContado) || valorContado < 0) {
    comErro("Digite um valor contado válido.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("caixas")
    .update({
      valor_abertura: valorAbertura,
      valor_contado: valorContado,
      observacoes,
    })
    .eq("id", caixaId);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só administradores e gerentes podem editar um caixa já fechado."
        : error.message
    );
  }

  comSucesso("Caixa atualizado.");
}

export async function fecharCaixa(formData) {
  const caixaId = formData.get("caixa_id")?.toString();
  const valorContadoTexto = formData
    .get("valor_contado")
    ?.toString()
    .replace(",", ".");
  const observacoes = formData.get("observacoes")?.toString().trim() || null;

  const valorContado = Number(valorContadoTexto);

  if (!caixaId) comErro("Caixa inválido.");
  if (!valorContadoTexto || Number.isNaN(valorContado) || valorContado < 0) {
    comErro("Digite o valor contado na gaveta.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("caixas")
    .update({
      fechado_por: user?.id ?? null,
      fechado_em: new Date().toISOString(),
      valor_contado: valorContado,
      observacoes,
    })
    .eq("id", caixaId);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Você não tem permissão para fechar o caixa."
        : error.message
    );
  }

  comSucesso("Caixa fechado.");
}
