import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { temAcesso } from "@/lib/permissoes";
import {
  criarCategoria,
  criarProduto,
  editarProduto,
  apagarProduto,
  apagarCategoria,
} from "./actions";
import BotaoApagar from "@/components/BotaoApagar";
import CampoFoto from "@/components/CampoFoto";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default async function ProdutosPage({ searchParams }) {
  const params = await searchParams;
  const erro = typeof params?.erro === "string" ? params.erro : null;
  const sucesso = typeof params?.sucesso === "string" ? params.sucesso : null;

  const { supabase, user, perfil: meuPerfil } = await obterSessao();

  if (!user) {
    redirect("/login");
  }

  const podeGerenciar = temAcesso("/painel/produtos", {
    papel: meuPerfil?.papel,
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeGerenciar) {
    redirect("/painel");
  }

  // Consultas independentes saem todas ao mesmo tempo (uma ida ao banco
  // em vez de várias seguidas).
  const [
    { data: categorias },
    { data: produtos },
  ] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nome, icone, ordem")
      .order("ordem", { ascending: true }),
    supabase
      .from("produtos")
      .select(
        "id, codigo, nome, descricao, preco, custo, imagem, disponivel, categoria_id"
      )
      .order("codigo", { ascending: true }),
  ]);

  // Sugestão de código para o próximo produto: maior código numérico + 1,
  // com 4 dígitos (0001, 0002, ...).
  const maiorCodigo = (produtos ?? []).reduce((maior, p) => {
    const n = /^[0-9]+$/.test(p.codigo ?? "") ? Number(p.codigo) : 0;
    return Math.max(maior, n);
  }, 0);
  const proximoCodigo = String(maiorCodigo + 1).padStart(4, "0");

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">
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
            <form
              action={criarProduto}
              encType="multipart/form-data"
              className="mt-3 space-y-3"
            >
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
                <div>
                  <label className="block text-sm font-medium text-[#1c2a1f]">
                    Código
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    required
                    defaultValue={proximoCodigo}
                    autoComplete="off"
                    className={campoClasse}
                    placeholder="Ex: 0001"
                  />
                  <p className="mt-1 text-xs text-[#8b968a]">
                    Já vem com o próximo número livre. Não pode repetir.
                  </p>
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
                    Foto do produto (opcional)
                  </label>
                  <CampoFoto name="imagem_arquivo" className={campoClasse} />
                  <p className="mt-1 text-xs text-[#8b968a]">
                    Se não enviar uma foto, o produto aparece com um emoji no
                    lugar da imagem.
                  </p>
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
                    campos={{ id: categoria.id, nome: categoria.nome }}
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
                    {produtosDaCategoria.map((produto) => {
                      const temFoto =
                        typeof produto.imagem === "string" &&
                        produto.imagem.startsWith("http");
                      return (
                        <div key={produto.id} className="bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {temFoto ? (
                                <img
                                  src={produto.imagem}
                                  alt={produto.nome}
                                  className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
                                />
                              ) : (
                                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#f6f4ee] text-4xl sm:h-24 sm:w-24">
                                  {produto.imagem || "🍽️"}
                                </span>
                              )}
                              <div>
                                <p className="font-mono text-xs font-semibold text-[#5b6b5c]">
                                  Código {produto.codigo}
                                </p>
                                <p className="text-sm font-semibold text-[#1c2a1f]">
                                  {produto.nome}
                                </p>
                                {produto.descricao && (
                                  <p className="text-xs text-[#8b968a]">
                                    {produto.descricao}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-semibold text-[#1c2a1f]">
                                {formatoMoeda.format(produto.preco)}
                              </p>
                              <BotaoApagar
                                acao={apagarProduto}
                                campos={{ id: produto.id, nome: produto.nome }}
                                confirmacao={`Apagar o produto "${produto.nome}"?`}
                                className="mt-1 text-xs font-medium text-[#b3432f] hover:underline"
                              />
                              <p className="text-xs text-[#8b968a]">
                                custo {formatoMoeda.format(produto.custo)}
                              </p>
                            </div>
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-[#1f6f3e]">
                              Editar produto
                            </summary>
                            <form
                              action={editarProduto}
                              encType="multipart/form-data"
                              className="mt-2 space-y-2 rounded-lg bg-[#f6f4ee] p-3"
                            >
                              <input type="hidden" name="id" value={produto.id} />
                              <input
                                type="hidden"
                                name="nome_atual"
                                value={produto.nome}
                              />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="block text-xs font-medium text-[#1c2a1f]">
                                    Categoria
                                  </label>
                                  <select
                                    name="categoria_id"
                                    required
                                    defaultValue={produto.categoria_id}
                                    className={campoClasse}
                                  >
                                    {categorias.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.icone ? `${c.icone} ` : ""}
                                        {c.nome}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#1c2a1f]">
                                    Nome do produto
                                  </label>
                                  <input
                                    type="text"
                                    name="nome"
                                    required
                                    defaultValue={produto.nome}
                                    className={campoClasse}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#1c2a1f]">
                                    Preço de venda (R$)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    name="preco"
                                    required
                                    defaultValue={String(produto.preco).replace(
                                      ".",
                                      ","
                                    )}
                                    className={campoClasse}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#1c2a1f]">
                                    Custo (R$)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    name="custo"
                                    defaultValue={String(
                                      produto.custo ?? ""
                                    ).replace(".", ",")}
                                    className={campoClasse}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[#1c2a1f]">
                                    Código
                                  </label>
                                  <input
                                    type="text"
                                    name="codigo"
                                    required
                                    defaultValue={produto.codigo ?? ""}
                                    autoComplete="off"
                                    className={campoClasse}
                                    placeholder="Ex: 0001"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[#1c2a1f]">
                                  Descrição
                                </label>
                                <input
                                  type="text"
                                  name="descricao"
                                  defaultValue={produto.descricao ?? ""}
                                  className={campoClasse}
                                  placeholder="Ex: Recheio de carne moída temperada"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[#1c2a1f]">
                                  {temFoto ? "Trocar foto" : "Adicionar foto"}
                                </label>
                                <CampoFoto
                                  name="imagem_arquivo"
                                  fotoAtual={temFoto ? produto.imagem : null}
                                  className={campoClasse}
                                />
                              </div>
                              {temFoto && (
                                <label className="flex items-center gap-2 text-xs text-[#8b968a]">
                                  <input type="checkbox" name="remover_imagem" />
                                  Remover a foto atual (volta a mostrar o emoji)
                                </label>
                              )}
                              <button
                                type="submit"
                                className="rounded-lg bg-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#195c33]"
                              >
                                Salvar
                              </button>
                            </form>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
  );
}
