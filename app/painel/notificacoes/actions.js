"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { notificarMaster } from "@/lib/notificacoes";

function comErro(mensagem) {
  redirect("/painel/notificacoes?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/notificacoes?sucesso=" + encodeURIComponent(mensagem));
}

export async function marcarNotificacaoLida(formData) {
  const id = formData.get("id")?.toString();
  if (!id) comErro("Notificação inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("id", id);

  if (error) comErro(error.message);

  comSucesso("Notificação marcada como lida.");
}

export async function marcarTodasLidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("lida", false)
    .or(`destinatario_id.eq.${user?.id},destinatario_id.is.null`);

  comSucesso("Todas as notificações foram marcadas como lidas.");
}

// Aprova ou reprova o fechamento de um caixa a partir da notificação
// "caixa_fechado". Avisa de volta quem fechou o caixa com a decisão e a
// observação, e marca a notificação original como lida.
export async function responderFechamentoCaixa(formData) {
  const notificacaoId = formData.get("notificacao_id")?.toString();
  const caixaId = formData.get("caixa_id")?.toString();
  const decisao = formData.get("decisao")?.toString();
  const observacao = formData.get("observacao")?.toString().trim() || null;

  if (!caixaId || (decisao !== "aprovado" && decisao !== "reprovado")) {
    comErro("Dados inválidos.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: caixa, error } = await supabase
    .from("caixas")
    .update({
      status_aprovacao: decisao,
      aprovado_por: user?.id ?? null,
      aprovado_em: new Date().toISOString(),
      observacao_aprovacao: observacao,
    })
    .eq("id", caixaId)
    .select("id, fechado_por, valor_contado")
    .single();

  if (error) {
    comErro(
      error.code === "42501"
        ? "Só o master pode aprovar ou reprovar um caixa."
        : error.message
    );
  }

  if (notificacaoId) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", notificacaoId);
  }

  if (caixa?.fechado_por) {
    await notificarMaster({
      tipo: decisao === "aprovado" ? "caixa_aprovado" : "caixa_reprovado",
      titulo:
        decisao === "aprovado"
          ? "Seu fechamento de caixa foi aprovado"
          : "Seu fechamento de caixa foi reprovado",
      mensagem: observacao || "Sem observações.",
      destinatarioId: caixa.fechado_por,
      relacionadoTipo: "caixa",
      relacionadoId: caixa.id,
    });
  }

  await registrarAuditoria(
    "caixa.aprovar",
    `${decisao === "aprovado" ? "Aprovou" : "Reprovou"} o caixa #${caixaId}${
      observacao ? ` — ${observacao}` : ""
    }.`
  );

  comSucesso(
    decisao === "aprovado" ? "Caixa aprovado." : "Caixa reprovado."
  );
}
