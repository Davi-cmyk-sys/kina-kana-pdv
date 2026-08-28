"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function entrar(formData) {
  const email = formData.get("email")?.toString().trim();
  const senha = formData.get("senha")?.toString();

  if (!email || !senha) {
    redirect("/login?erro=" + encodeURIComponent("Preencha e-mail e senha."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    redirect(
      "/login?erro=" + encodeURIComponent("E-mail ou senha incorretos.")
    );
  }

  redirect("/painel");
}
