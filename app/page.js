import { redirect } from "next/navigation";

// O proxy.js já garante que só chega aqui quem está logado — então a raiz
// do site só precisa mandar a pessoa direto para o painel.
export default function Home() {
  redirect("/painel");
}
