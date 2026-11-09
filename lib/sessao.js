import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Quem está logado + o perfil dele, buscados UMA vez por carregamento de
// página. O layout do painel e a página pedem a mesma coisa; com o cache do
// React a segunda chamada reaproveita a primeira em vez de ir de novo ao
// Supabase (cada ida ao banco custa tempo a cada clique).
export const obterSessao = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, perfil: null };
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("id, nome, papel, ativo, master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, perfil: perfil ?? null };
});
