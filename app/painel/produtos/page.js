import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarCategoria, criarProduto, apagarProduto, apagarCategoria } from "./actions";
import BotaoApagar from "@/components/BotaoApagar";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default async function ProdutosPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: meuPerfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  const podeGerenciar = ["admin", "gerente"].includes(meuPerfil?.papel);

  if (!podeGerenciar) {
    redirect("/painel");
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nome, icone, ordem")
    .order("ordem", { ascending: true });

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, descricao, preco, custo, imagem, disponivel, categoria_id")
    .order("nome", { ascending: true });

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="min-h-screen bg-[#f6f4ee] p-6">
      <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <Link
          href="/painel"
          className="text-sm font-medium text-[#1f6f3e] hover:underline"
        >
          ← Voltar ao painel
        </Link>

        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#1f6f3e]">
          Kina Kana PDV
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#1c2a1f]">
          Cardápio — categorias e produtos
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Cadastre aqui as categorias (ex: Pastéis, Bebidas) e os produtos
          dentro de cada uma, com preço e custo.
        </p>

        {erro && (
          <div className="mt-4 rounded-lg bg-[#fbeae6] p-3 text-sm text-[#8a3320]">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mt-4 rounded-lg bg-[#e7f2ea] p-3 text-sm text-[#1f6f3e]">
            {sucesso}
          </div>
        )}

        {/* Nova categoria */}
        <details className="mt-6 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4" open={!categorias?.length}>
          <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
            Nova categoria
          </summary>
          <form action={criarCategoria} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Nome
              </label>
              <input
                type="text"
                name="nome"
                required
                className={campoClasse}
                placeholder="Ex: Pastéis salgados"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Ícone (emoji)
              </label>
              <input
                type="text"
                name="icone"
                maxLength={4}
                className={campoClasse}
                placeholder="🥟"
              />
            </div>
            <button
              type="submit"
              className="sm:col-span-2 w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Cadastrar categoria
            </button>
          </form>
        </details>

        {/* Novo produto */}
        <details className="mt-4 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4" open={Boolean(categorias?.length)}>
          <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
            Novo produto
          </summary>

          {!categorias?.length ? (
            <p className="mt-3 text-sm text-[#8b968a]">
              Cadastre uma categoria primeiro.
            </p>
          ) : (
            <form action={criarProduto} className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Categoria
                  </label>
                  <select name="categoria_id" required className={campoClasse}>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone ? `${c.icone} ` : ""}
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Nome do produto
                  </label>
                  <input
                    type="text"
                    name="nome"
                    required
                    className={campoClasse}
                    placeholder="Ex: Pastel de carne"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Preço de venda (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="preco"
                    required
                    className={campoClasse}
                    placeholder="8,00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Custo (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="custo"
                    className={campoClasse}
                    placeholder="3,50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Descrição (opcional)
                  </label>
                  <input
                    type="text"
                    name="descricao"
                    className={campoClasse}
                    placeholder="Ex: Recheio de carne moída temperada"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Imagem (emoji, por enquanto)
                  </label>
                  <input
                    type="text"
                    name="imagem"
                    maxLength={4}
                    className={campoClasse}
                    placeholder="🥟"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
              >
                Cadastrar produto
              </button>
            </form>
          )}
        </details>

        {/* Lista */}
        <div className="mt-8 space-y-6">
          {!categorias?.length && (
            <p className="text-sm text-[#8b968a]">
              Nenhuma categoria cadastrada ainda.
            </p>
          )}

          {categorias?.map((categoria) => {
            const produtosDaCategoria = produtos?.filter(
              (p) => p.categoria_id === categoria.id
            );
            return (
              <div key={categoria.id}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-[#1c2a1f]">
                    {categoria.icone ? `${categoria.icone} ` : ""}
                    {categoria.nome}{" "}
                    <span className="font-normal text-[#8b968a]">
                      ({produtosDaCategoria?.length ?? 0})
                    </span>
                  </h2>
                  <BotaoApagar
                    acao={apagarCategoria}
                    campos={{ id: categoria.id }}
                    confirmacao={`Apagar a categoria "${categoria.nome}"? Isso só funciona se ela não tiver produtos dentro.`}
                    className="text-xs font-medium text-[#b3432f] hover:underline"
                  />
                </div>

                {!produtosDaCategoria?.length ? (
                  <p className="mt-2 text-sm text-[#8b968a]">
                    Nenhum produto nessa categoria ainda.
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-[#eceae0] overflow-hidden rounded-xl border border-[#dcdfd2]">
                    {produtosDaCategoria.map((produto) => (
                      <div
                        key={produto.id}
                        className="flex items-center justify-between gap-3 bg-white p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[#1c2a1f]">
                            {produto.imagem ? `${produto.imagem} ` : ""}
                            {produto.nome}
                          </p>
                          {produto.descricao && (
                            <p className="text-xs text-[#8b968a]">
                              {produto.descricao}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-[#1c2a1f]">
                            {formatoMoeda.format(produto.preco)}
                          </p>
                          <BotaoApagar
                            acao={apagarProduto}
                            campos={{ id: produto.id }}
                            confirmacao={`Apagar o produto "${produto.nome}"?`}
                            className="mt-1 text-xs font-medium text-[#b3432f] hover:underline"
                          />
                          <p className="text-xs text-[#8b968a]">
                            custo {formatoMoeda.format(produto.custo)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
