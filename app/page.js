import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic"; // sempre busca de novo no Supabase, nunca cacheia esta página de teste

export default async function Home() {
  const { data, error } = await supabase
    .from("teste_conexao")
    .select("mensagem, criado_em")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee] p-6">
      <main className="w-full max-w-lg rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f3e]">
          Kina Kana PDV — Fase 0
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1c2a1f]">
          Teste de conexão
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Esta página só existe para provar que Next.js, Vercel, GitHub e
          Supabase estão conversando entre si, antes de construirmos
          qualquer tela de verdade do sistema.
        </p>

        <div className="mt-6 space-y-3">
          <Item ok label="Next.js rodando" detail="Esta página foi renderizada pelo servidor." />
          <Item
            ok={!error}
            label={error ? "Falha ao ler do Supabase" : "Conectado ao Supabase"}
            detail={
              error
                ? error.message
                : data
                ? `"${data.mensagem}"`
                : "A tabela de teste está vazia."
            }
          />
        </div>

        <p className="mt-6 text-xs text-[#8b968a]">
          Próximo passo: enviar este código para o GitHub e importar o
          projeto na Vercel — quando essa página abrir na URL pública da
          Vercel mostrando a mesma mensagem acima, a Fase 0 está completa.
        </p>
      </main>
    </div>
  );
}

function Item({ ok, label, detail }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#f6f4ee] p-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          ok ? "bg-[#1f6f3e]" : "bg-[#b3432f]"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <span className="text-sm">
        <span className="block font-semibold text-[#1c2a1f]">{label}</span>
        <span className="block text-[#5b6b5c]">{detail}</span>
      </span>
    </div>
  );
}
