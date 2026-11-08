"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { notificarMaster } from "@/lib/notificacoes";

function comErro(mensagem) {
  redirect("/painel/compras?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/compras?sucesso=" + encodeURIComponent(mensagem));
}

// Chamada direto do componente cliente (como criarPedido), não por um
// <form action={...}> — por isso devolve {erro}/{sucesso} em vez de
// redirecionar, e quem chama decide o que fazer com o resultado.
export async function criarSolicitacaoCompra({ itens, observacao }) {
  const lista = (itens ?? []).filter(
    (i) => i?.nome?.trim() && Number(i.quantidade) > 0
  );

  if (!lista.length) {
    return { erro: "Adicione pelo menos um item com nome e quantidade." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { erro: "Sua sessão expirou. Atualize a página e faça login de novo." };
    }

    const itensLimpos = lista.map((i) => ({
      nome: i.nome.trim(),
      quantidade: Number(i.quantidade),
      unidade: i.unidade || "un",
    }));

    const { data: solicitacao, error } = await supabase
      .from("solicitacoes_compra")
      .insert({
        criado_por: user.id,
        itens: itensLimpos,
        observacao: observacao?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        erro:
          error.code === "42501"
            ? "Você não tem permissão para solicitar compras."
            : error.message,
      };
    }

    const resumo = itensLimpos
      .map((i) => `${i.quantidade} ${i.unidade} de ${i.nome}`)
      .join(", ");

    await notificarMaster({
      tipo: "compra_solicitada",
      titulo: "Nova solicitação de compra",
      mensagem: resumo,
      relacionadoTipo: "solicitacao_compra",
      relacionadoId: solicitacao.id,
    });

    await registrarAuditoria(
      "compra.solicitar",
      `Solicitou compra: ${resumo}.`
    );

    revalidatePath("/painel/compras");
    return { sucesso: true };
  } catch (err) {
    console.error("Erro ao criar solicitação de compra:", err);
    return {
      erro:
        "Erro inesperado ao enviar a solicitação: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}

export async function atenderSolicitacaoCompra(formData) {
  const id = formData.get("id")?.toString();
  if (!id) comErro("Solicitação inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("solicitacoes_compra")
    .update({
      status: "atendida",
      atendido_por: user?.id ?? null,
      atendido_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só o master ou a gerência podem atender solicitações."
        : error.message
    );
  }

  await registrarAuditoria("compra.atender", `Marcou a solicitação #${id} como atendida.`);
  comSucesso("Solicitação marcada como atendida.");
}

export async function cancelarSolicitacaoCompra(formData) {
  const id = formData.get("id")?.toString();
  if (!id) comErro("Solicitação inválida.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("solicitacoes_compra")
    .update({
      status: "cancelada",
      atendido_por: user?.id ?? null,
      atendido_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só o master ou a gerência podem cancelar solicitações."
        : error.message
    );
  }

  await registrarAuditoria("compra.cancelar", `Cancelou a solicitação #${id}.`);
  comSucesso("Solicitação cancelada.");
}
