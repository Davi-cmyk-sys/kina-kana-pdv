import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temAcesso } from "@/lib/permissoes";
import {
  criarIngrediente,
  editarIngrediente,
  apagarIngrediente,
  registrarMovimentacaoEstoque,
  definirFichaTecnica,
  removerIngredienteDoProduto,
} from "./actions";
import BotaoApagar from "@/components/BotaoApagar";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

const NOMES_UNIDADE = { kg: "kg", g: "g", l: "L", ml: "ml", un: "un" };
const NOMES_TIPO_MOV = {
  entrada: "Entrada",
  saida: "Saída (venda)",
  ajuste: "Ajuste",
};

export default async function EstoquePage({ searchParams }) {
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
    .select("papel, master, secoes_bloqueadas")
    .eq("id", user.id)
    .maybeSingle();

  const podeGerenciar = temAcesso("/painel/estoque", {
    papel: meuPerfil?.papel,
    master: meuPerfil?.master,
    secoesBloqueadas: meuPerfil?.secoes_bloqueadas,
  });

  if (!podeGerenciar) {
    redirect("/painel");
  }

  const { data: ingredientes } = await supabase
    .from("ingredientes")
    .select("id, nome, unidade, quantidade_atual, quantidade_minima")
    .order("nome", { ascending: true });

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome")
    .order("nome", { ascending: true });

  const { data: fichaTecnica } = await supabase
    .from("produto_ingredientes")
    .select("id, produto_id, ingrediente_id, quantidade_por_unidade");

  const { data: movimentacoes } = await supabase
    .from("movimentacoes_estoque")
    .select("id, ingrediente_id, tipo, quantidade, motivo, criado_em")
    .order("criado_em", { ascending: false })
    .limit(20);

  const mapaIngredientes = new Map((ingredientes ?? []).map((i) => [i.id, i]));
  const formatoData = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">Estoque</h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Cadastre os ingredientes/insumos, configure quanto cada produto
          consome (ficha técnica) e a baixa acontece sozinha a cada venda.
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

        {/* Novo ingrediente */}
        <details className="mt-6 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4" open={!ingredientes?.length}>
          <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
            Novo ingrediente
          </summary>
          <form action={criarIngrediente} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Nome
              </label>
              <input
                type="text"
                name="nome"
                required
                className={campoClasse}
                placeholder="Ex: Farinha de trigo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Unidade
              </label>
              <select name="unidade" className={campoClasse}>
                <option value="kg">Quilo (kg)</option>
                <option value="g">Grama (g)</option>
                <option value="l">Litro (L)</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="un">Unidade (un)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Quantidade em estoque agora
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="quantidade_atual"
                className={campoClasse}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Estoque mínimo (alerta)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="quantidade_minima"
                className={campoClasse}
                placeholder="0"
              />
            </div>
            <button
              type="submit"
              className="sm:col-span-2 w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Cadastrar ingrediente
            </button>
          </form>
        </details>

        {/* Lista de ingredientes */}
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1c2a1f]">
            Ingredientes
          </h2>

          {!ingredientes?.length ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Nenhum ingrediente cadastrado ainda.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {ingredientes.map((ing) => {
                const estoqueBaixo = ing.quantidade_atual <= ing.quantidade_minima;
                return (
                  <details
                    key={ing.id}
                    className="rounded-xl border border-[#dcdfd2] p-3"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-[#1c2a1f]">
                        {ing.nome}
                        {estoqueBaixo && (
                          <span className="ml-2 rounded-full bg-[#fbeae6] px-2 py-0.5 text-xs font-semibold text-[#8a3320]">
                            ⚠️ estoque baixo
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-[#1c2a1f]">
                        {ing.quantidade_atual} {NOMES_UNIDADE[ing.unidade]}
                      </span>
                    </summary>

                    <div className="mt-3 space-y-3 border-t border-[#eceae0] pt-3">
                      <p className="text-xs text-[#8b968a]">
                        Estoque mínimo: {ing.quantidade_minima}{" "}
                        {NOMES_UNIDADE[ing.unidade]}
                      </p>

                      {/* Editar */}
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-[#1c2a1f]">
                          Editar
                        </summary>
                        <form action={editarIngrediente} className="mt-2 grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="id" value={ing.id} />
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Nome
                            </label>
                            <input
                              type="text"
                              name="nome"
                              defaultValue={ing.nome}
                              className={campoClasse}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Unidade
                            </label>
                            <select
                              name="unidade"
                              defaultValue={ing.unidade}
                              className={campoClasse}
                            >
                              <option value="kg">Quilo (kg)</option>
                              <option value="g">Grama (g)</option>
                              <option value="l">Litro (L)</option>
                              <option value="ml">Mililitro (ml)</option>
                              <option value="un">Unidade (un)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Estoque mínimo
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="quantidade_minima"
                              defaultValue={ing.quantidade_minima}
                              className={campoClasse}
                            />
                          </div>
                          <button
                            type="submit"
                            className="sm:col-span-2 rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] hover:bg-[#f6f4ee]"
                          >
                            Salvar
                          </button>
                        </form>
                      </details>

                      {/* Movimentação */}
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-[#1c2a1f]">
                          Registrar entrada ou ajuste
                        </summary>
                        <form
                          action={registrarMovimentacaoEstoque}
                          className="mt-2 grid gap-2 sm:grid-cols-3"
                        >
                          <input type="hidden" name="ingrediente_id" value={ing.id} />
                          <input type="hidden" name="nome_ingrediente" value={ing.nome} />
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Tipo
                            </label>
                            <select name="tipo" className={campoClasse}>
                              <option value="entrada">Entrada (compra)</option>
                              <option value="ajuste">
                                Ajuste (correção, pode ser negativo)
                              </option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Quantidade
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              name="quantidade"
                              required
                              className={campoClasse}
                              placeholder="Ex: 5 ou -2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[#1c2a1f]">
                              Motivo (opcional)
                            </label>
                            <input type="text" name="motivo" className={campoClasse} />
                          </div>
                          <button
                            type="submit"
                            className="sm:col-span-3 rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] hover:bg-[#f6f4ee]"
                          >
                            Registrar
                          </button>
                        </form>
                      </details>

                      <BotaoApagar
                        acao={apagarIngrediente}
                        campos={{ id: ing.id, nome: ing.nome }}
                        confirmacao={`Apagar o ingrediente "${ing.nome}"?`}
                        className="text-xs font-medium text-[#b3432f] hover:underline"
                      />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        {/* Ficha técnica */}
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1c2a1f]">
            Ficha técnica dos produtos
          </h2>
          <p className="mt-1 text-xs text-[#8b968a]">
            Configure quanto de cada ingrediente um produto consome. A baixa
            no estoque acontece sozinha quando o produto é vendido em "Novo
            Pedido" (combos ainda não têm baixa automática).
          </p>

          {!produtos?.length ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Cadastre produtos primeiro em "Cardápio".
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {produtos.map((produto) => {
                const itensFicha = (fichaTecnica ?? []).filter(
                  (f) => f.produto_id === produto.id
                );
                return (
                  <details
                    key={produto.id}
                    className="rounded-xl border border-[#dcdfd2] p-3"
                  >
                    <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
                      {produto.nome}{" "}
                      <span className="font-normal text-[#8b968a]">
                        ({itensFicha.length} ingrediente
                        {itensFicha.length !== 1 ? "s" : ""})
                      </span>
                    </summary>

                    <div className="mt-3 space-y-2 border-t border-[#eceae0] pt-3">
                      {itensFicha.length > 0 && (
                        <div className="space-y-1">
                          {itensFicha.map((item) => {
                            const ing = mapaIngredientes.get(item.ingrediente_id);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-xs text-[#5b6b5c]"
                              >
                                <span>
                                  {ing?.nome ?? "?"} — {item.quantidade_por_unidade}{" "}
                                  {ing ? NOMES_UNIDADE[ing.unidade] : ""} por unidade
                                </span>
                                <BotaoApagar
                                  acao={removerIngredienteDoProduto}
                                  campos={{ id: item.id }}
                                  confirmacao="Remover esse ingrediente da ficha técnica?"
                                  className="font-medium text-[#b3432f] hover:underline"
                                  texto="remover"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {ingredientes?.length > 0 ? (
                        <form
                          action={definirFichaTecnica}
                          className="grid gap-2 sm:grid-cols-3"
                        >
                          <input type="hidden" name="produto_id" value={produto.id} />
                          <select name="ingrediente_id" required className={campoClasse}>
                            <option value="">Escolha o ingrediente...</option>
                            {ingredientes.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.nome}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            inputMode="decimal"
                            name="quantidade_por_unidade"
                            required
                            className={campoClasse}
                            placeholder="Quantidade por unidade vendida"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] hover:bg-[#f6f4ee]"
                          >
                            Salvar
                          </button>
                        </form>
                      ) : (
                        <p className="text-xs text-[#8b968a]">
                          Cadastre um ingrediente primeiro.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>

        {/* Movimentações recentes */}
        <div className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#1c2a1f]">
            Movimentações recentes
          </h2>
          {!movimentacoes?.length ? (
            <p className="mt-2 text-sm text-[#8b968a]">
              Nenhuma movimentação registrada ainda.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#8b968a]">
                    <th className="pb-1">Quando</th>
                    <th className="pb-1">Tipo</th>
                    <th className="pb-1">Ingrediente</th>
                    <th className="pb-1 text-right">Qtd.</th>
                    <th className="pb-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="border-t border-[#eceae0] text-xs">
                      <td className="py-1 text-[#8b968a]">
                        {formatoData.format(new Date(m.criado_em))}
                      </td>
                      <td className="py-1 text-[#1c2a1f]">
                        {NOMES_TIPO_MOV[m.tipo] ?? m.tipo}
                      </td>
                      <td className="py-1 text-[#1c2a1f]">
                        {mapaIngredientes.get(m.ingrediente_id)?.nome ?? "?"}
                      </td>
                      <td className="py-1 text-right text-[#1c2a1f]">
                        {m.quantidade}
                      </td>
                      <td className="py-1 text-[#5b6b5c]">{m.motivo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
  );
}
