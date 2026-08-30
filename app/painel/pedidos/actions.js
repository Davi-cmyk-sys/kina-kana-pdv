"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";

function comErro(mensagem) {
  redirect("/painel/pedidos?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/pedidos?sucesso=" + encodeURIComponent(mensagem));
}

export async function apagarPedido(formData) {
  const id = formData.get("id")?.toString();
  const numeroSenha = formData.get("numero_senha")?.toString() || `#${id}`;
  if (!id) {
    comErro("Pedido inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pedidos").delete().eq("id", id);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só admin ou gerente podem apagar pedidos."
        : error.message
    );
  }

  await registrarAuditoria(
    "pedido.apagar",
    `Apagou o pedido nº ${numeroSenha}.`
  );
  comSucesso("Pedido apagado.");
}

export async function registrarPagamento(formData) {
  const pedidoId = formData.get("pedido_id")?.toString();
  const forma = formData.get("forma")?.toString();
  const valorTexto = formData.get("valor")?.toString().replace(",", ".");
  const recebidoTexto = formData
    .get("recebido")
    ?.toString()
    .replace(",", ".");

  const valor = Number(valorTexto);
  const recebido = recebidoTexto ? Number(recebidoTexto) : null;

  if (!pedidoId) {
    comErro("Pedido inválido.");
  }
  if (!valorTexto || Number.isNaN(valor) || valor <= 0) {
    comErro("Digite um valor de pagamento válido.");
  }

  const troco =
    forma === "dinheiro" && recebido && recebido > valor
      ? recebido - valor
      : 0;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error: erroPagamento } = await supabase.from("pagamentos").insert({
    pedido_id: Number(pedidoId),
    forma,
    valor,
    troco,
    registrado_por: user?.id ?? null,
  });

  if (erroPagamento) {
    comErro(
      erroPagamento.code === "42501"
        ? "Você não tem permissão para registrar pagamentos."
        : erroPagamento.message
    );
  }

  // Se a soma dos pagamentos já cobre o total do pedido, marca como pago.
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("total")
    .eq("id", pedidoId)
    .single();

  const { data: pagamentos } = await supabase
    .from("pagamentos")
    .select("valor")
    .eq("pedido_id", pedidoId);

  const totalPago = (pagamentos ?? []).reduce((soma, p) => soma + p.valor, 0);

  if (pedido && totalPago >= pedido.total) {
    await supabase
      .from("pedidos")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", pedidoId);
  }

  comSucesso(
    troco > 0
      ? `Pagamento registrado. Troco: R$ ${troco.toFixed(2).replace(".", ",")}`
      : "Pagamento registrado."
  );
}
