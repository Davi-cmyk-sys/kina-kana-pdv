"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function comErro(mensagem) {
  redirect("/painel/pedidos?erro=" + encodeURIComponent(mensagem));
}

function comSucesso(mensagem) {
  redirect("/painel/pedidos?sucesso=" + encodeURIComponent(mensagem));
}

export async function apagarPedido(formData) {
  const id = formData.get("id")?.toString();
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

  comSucesso("Pedido apagado.");
}
