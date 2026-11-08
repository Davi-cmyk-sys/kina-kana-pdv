import { createClient } from "@/lib/supabase/server";

// Cria uma notificação. Por padrão (sem destinatarioId) ela é um "aviso
// pra direção": qualquer pessoa marcada como master consegue vê-la e
// respondê-la em /painel/notificacoes. Passe destinatarioId quando a
// notificação for pra uma pessoa específica (ex: avisar quem fechou o
// caixa que ele foi aprovado/reprovado).
//
// É best-effort, igual à auditoria: se der erro (sem sessão, RLS, etc.)
// só loga no console do servidor e segue — notificação não pode travar a
// ação principal (uma venda, um fechamento de caixa).
export async function notificarMaster({
  tipo,
  titulo,
  mensagem,
  destinatarioId = null,
  relacionadoTipo = null,
  relacionadoId = null,
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("notificacoes").insert({
      tipo,
      titulo,
      mensagem,
      destinatario_id: destinatarioId,
      criado_por: user?.id ?? null,
      relacionado_tipo: relacionadoTipo,
      relacionado_id: relacionadoId,
    });
  } catch (err) {
    console.error("Erro ao criar notificação:", err);
  }
}
