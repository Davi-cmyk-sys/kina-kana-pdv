"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FORMAS_PAGAMENTO } from "@/lib/formasPagamento";
import { registrarAuditoria } from "@/lib/auditoria";
import { notificarMaster } from "@/lib/notificacoes";

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

  await registrarAuditoria(
    "caixa.abrir",
    `Abriu o caixa com R$ ${valorAbertura.toFixed(2).replace(".", ",")}.`
  );
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

  await registrarAuditoria(
    tipo === "sangria" ? "caixa.sangria" : "caixa.suprimento",
    `Registrou ${tipo} de R$ ${valor.toFixed(2).replace(".", ",")}${
      motivo ? ` — ${motivo}` : ""
    }.`
  );
  comSucesso(
    tipo === "sangria" ? "Sangria registrada." : "Suprimento registrado."
  );
}

// Lê os valores informados no fechamento, um por forma de pagamento (na
// sequência oficial). Devolve null se algum estiver inválido.
function lerValoresFechamento(formData) {
  const valores = {};
  for (const forma of FORMAS_PAGAMENTO) {
    const n = numeroOuZero(formData.get(forma.coluna));
    if (n === null || n < 0) return null;
    valores[forma.coluna] = n;
  }
  return valores;
}

function somar(valores) {
  return Object.values(valores).reduce((s, v) => s + v, 0);
}

function resumoDasFormas(valores) {
  return FORMAS_PAGAMENTO.map(
    (f) =>
      `${f.rotulo}: R$ ${valores[f.coluna].toFixed(2).replace(".", ",")}`
  ).join(" · ");
}

export async function editarCaixa(formData) {
  const caixaId = formData.get("caixa_id")?.toString();
  const valorAberturaTexto = formData
    .get("valor_abertura")
    ?.toString()
    .replace(",", ".");
  const observacoes = formData.get("observacoes")?.toString().trim() || null;

  const valorAbertura = Number(valorAberturaTexto);
  const valores = lerValoresFechamento(formData);

  if (!caixaId) comErro("Caixa inválido.");
  if (!valorAberturaTexto || Number.isNaN(valorAbertura) || valorAbertura < 0) {
    comErro("Digite um valor de abertura válido.");
  }
  if (!valores) {
    comErro("Preencha os 5 valores de fechamento corretamente.");
  }

  const supabase = await createClient();

  // Caixas antigos podem ter valores nas formas que não existem mais
  // (Stone, PagSeguro, Depósito). Eles continuam somando no total contado.
  const { data: caixaAtual } = await supabase
    .from("caixas")
    .select("valor_maquineta_stone, valor_maquineta_pagseguro, valor_deposito")
    .eq("id", caixaId)
    .maybeSingle();
  const valoresAntigos =
    Number(caixaAtual?.valor_maquineta_stone ?? 0) +
    Number(caixaAtual?.valor_maquineta_pagseguro ?? 0) +
    Number(caixaAtual?.valor_deposito ?? 0);

  const valorContado = somar(valores) + valoresAntigos;

  const { error } = await supabase
    .from("caixas")
    .update({
      valor_abertura: valorAbertura,
      valor_contado: valorContado,
      ...valores,
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

  await registrarAuditoria(
    "caixa.editar",
    `Corrigiu o caixa #${caixaId} (abertura: R$ ${valorAbertura
      .toFixed(2)
      .replace(".", ",")}, contado: R$ ${valorContado.toFixed(2).replace(".", ",")}).`
  );
  comSucesso("Caixa atualizado.");
}

function numeroOuZero(texto) {
  const n = Number((texto ?? "").toString().replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export async function fecharCaixa(formData) {
  const caixaId = formData.get("caixa_id")?.toString();
  const observacoes = formData.get("observacoes")?.toString().trim() || null;
  const valores = lerValoresFechamento(formData);

  if (!caixaId) comErro("Caixa inválido.");
  if (!valores) {
    comErro("Preencha os 5 valores de fechamento corretamente.");
  }

  const valorContado = somar(valores);

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
      ...valores,
      status_aprovacao: "pendente",
      aprovado_por: null,
      aprovado_em: null,
      observacao_aprovacao: null,
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

  const resumoFormas = resumoDasFormas(valores);

  await registrarAuditoria(
    "caixa.fechar",
    `Fechou o caixa #${caixaId} com R$ ${valorContado
      .toFixed(2)
      .replace(".", ",")} no total (${resumoFormas}).`
  );

  await notificarMaster({
    tipo: "caixa_fechado",
    titulo: "Caixa fechado — aguardando aprovação",
    mensagem: `Total apurado: R$ ${valorContado
      .toFixed(2)
      .replace(".", ",")}. ${resumoFormas}.${
      observacoes ? ` Observações: ${observacoes}` : ""
    }`,
    relacionadoTipo: "caixa",
    relacionadoId: Number(caixaId),
  });

  comSucesso("Caixa fechado. Aguardando aprovação do master.");
}
