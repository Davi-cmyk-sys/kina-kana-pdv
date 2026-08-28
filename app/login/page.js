import { entrar } from "./actions";

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f4ee] p-6">
      <main className="w-full max-w-sm rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1f6f3e]">
          Kina Kana PDV
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1c2a1f]">Entrar</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Use o e-mail e a senha cadastrados pelo administrador.
        </p>

        {erro && (
          <div className="mt-4 rounded-xl bg-[#fbeae6] p-3 text-sm text-[#8a3320]">
            {erro}
          </div>
        )}

        <form action={entrar} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#1c2a1f]"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
              placeholder="voce@kinakana.com.br"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-[#1c2a1f]"
            >
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33]"
          >
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
