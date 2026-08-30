import { createClient } from "@/lib/supabase/server";

// Registra uma ação no histórico de auditoria. Feito pra nunca travar a
// ação principal: se der erro (ex: sem sessão), só loga no console do
// servidor e segue a vida — auditoria é um "bônus" de rastreabilidade,
// não pode ser o motivo de uma venda ou exclusão falhar.
export async function registrarAuditoria(acao, descricao) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("auditoria").insert({
      usuario_id: user.id,
      acao,
      descricao,
    });
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
  }
}
