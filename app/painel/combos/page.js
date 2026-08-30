import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  criarAdicional,
  criarCombo,
  adicionarItemCombo,
  apagarAdicional,
  apagarCombo,
  apagarItemCombo,
} from "./actions";
import BotaoApagar from "@/components/BotaoApagar";

const campoClasse =
  "mt-1 w-full rounded-lg border border-[#dcdfd2] px-3 py-2 text-sm text-[#1c2a1f] outline-none focus:border-[#1f6f3e] focus:ring-1 focus:ring-[#1f6f3e]";

export default async function CombosPage({ searchParams }) {
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
    .select("id, nome, icone")
    .order("ordem", { ascending: true });

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, categoria_id")
    .order("nome", { ascending: true });

  const { data: adicionais } = await supabase
    .from("adicionais")
    .select("id, nome, preco, ativo")
    .order("nome", { ascending: true });

  const { data: combos } = await supabase
    .from("combos")
    .select("id, nome, descricao, preco, custo, imagem, ativo")
    .order("nome", { ascending: true });

  const { data: itens } = await supabase
    .from("combo_itens")
    .select(
      "id, combo_id, quantidade, rotulo, produtos(nome), categorias(nome, icone)"
    )
    .order("id", { ascending: true });

  const formatoMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[#dcdfd2] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1c2a1f]">
          Combos e adicionais
        </h1>
        <p className="mt-1 text-sm text-[#5b6b5c]">
          Adicionais são itens extras (ex: queijo a mais). Combos são
          produtos vendidos em conjunto, podendo ter um item fixo ou "escolha
          um desta categoria" (ex: escolha o sabor do pastel).
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

        {/* ===================== ADICIONAIS ===================== */}
        <h2 className="mt-8 text-lg font-bold text-[#1c2a1f]">Adicionais</h2>

        <details className="mt-3 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
            Novo adicional
          </summary>
          <form
            action={criarAdicional}
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Nome
              </label>
              <input
                type="text"
                name="nome"
                required
                className={campoClasse}
                placeholder="Ex: Queijo extra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1c2a1f]">
                Preço (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                name="preco"
                required
                className={campoClasse}
                placeholder="2,00"
              />
            </div>
            <button
              type="submit"
              className="self-end w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Cadastrar
            </button>
          </form>
        </details>

        <div className="mt-3 divide-y divide-[#eceae0] overflow-hidden rounded-xl border border-[#dcdfd2]">
          {!adicionais?.length ? (
            <p className="p-3 text-sm text-[#8b968a]">
              Nenhum adicional cadastrado ainda.
            </p>
          ) : (
            adicionais.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 bg-white p-3"
              >
                <p className="text-sm font-semibold text-[#1c2a1f]">
                  {a.nome}
                </p>
                <div className="text-right">
                  <p className="text-sm text-[#1c2a1f]">
                    {formatoMoeda.format(a.preco)}
                  </p>
                  <BotaoApagar
                    acao={apagarAdicional}
                    campos={{ id: a.id, nome: a.nome }}
                    confirmacao={`Apagar o adicional "${a.nome}"?`}
                    className="text-xs font-medium text-[#b3432f] hover:underline"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===================== COMBOS ===================== */}
        <h2 className="mt-10 text-lg font-bold text-[#1c2a1f]">Combos</h2>

        <details
          className="mt-3 rounded-xl border border-[#dcdfd2] bg-[#f6f4ee] p-4"
          open={!combos?.length}
        >
          <summary className="cursor-pointer text-sm font-semibold text-[#1c2a1f]">
            Novo combo
          </summary>
          <form action={criarCombo} className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#1c2a1f]">
                  Nome do combo
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  className={campoClasse}
                  placeholder="Ex: Combo 2 pastéis + refri"
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
                  placeholder="18,00"
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
                  placeholder="9,00"
                />
              </div>
              <div>
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1c2a1f]">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  name="descricao"
                  className={campoClasse}
                  placeholder="Ex: 2 pastéis à sua escolha + refrigerante lata"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#1f6f3e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195c33] sm:w-auto"
            >
              Cadastrar combo
            </button>
          </form>
        </details>

        <div className="mt-4 space-y-4">
          {!combos?.length ? (
            <p className="text-sm text-[#8b968a]">
              Nenhum combo cadastrado ainda.
            </p>
          ) : (
            combos.map((combo) => {
              const itensDoCombo = itens?.filter(
                (i) => i.combo_id === combo.id
              );
              return (
                <div
                  key={combo.id}
                  className="rounded-xl border border-[#dcdfd2] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1c2a1f]">
                        {combo.imagem ? `${combo.imagem} ` : ""}
                        {combo.nome}
                      </p>
                      {combo.descricao && (
                        <p className="text-xs text-[#8b968a]">
                          {combo.descricao}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-[#1c2a1f]">
                        {formatoMoeda.format(combo.preco)}
                      </p>
                      <p className="text-xs text-[#8b968a]">
                        custo {formatoMoeda.format(combo.custo)}
                      </p>
                      <BotaoApagar
                        acao={apagarCombo}
                        campos={{ id: combo.id, nome: combo.nome }}
                        confirmacao={`Apagar o combo "${combo.nome}" e todos os itens dele?`}
                        className="text-xs font-medium text-[#b3432f] hover:underline"
                      />
                    </div>
                  </div>

                  {/* Itens do combo */}
                  <div className="mt-3 space-y-1">
                    {!itensDoCombo?.length ? (
                      <p className="text-xs text-[#8b968a]">
                        Nenhum item adicionado ainda.
                      </p>
                    ) : (
                      itensDoCombo.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <p className="text-xs text-[#5b6b5c]">
                            {item.quantidade}x{" "}
                            {item.produtos
                              ? item.produtos.nome
                              : `escolha em "${item.categorias?.icone ? item.categorias.icone + " " : ""}${item.categorias?.nome}"`}
                            {item.rotulo ? ` — ${item.rotulo}` : ""}
                          </p>
                          <BotaoApagar
                            acao={apagarItemCombo}
                            campos={{ id: item.id }}
                            confirmacao="Remover este item do combo?"
                            className="text-xs font-medium text-[#b3432f] hover:underline"
                            texto="remover"
                          />
                        </div>
                      ))
                    )}
                  </div>

                  {/* Adicionar item */}
                  {(categorias?.length || produtos?.length) && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[#1f6f3e]">
                        + adicionar item a este combo
                      </summary>
                      <form
                        action={adicionarItemCombo}
                        className="mt-2 grid gap-2 sm:grid-cols-2"
                      >
                        <input type="hidden" name="combo_id" value={combo.id} />
                        <div>
                          <label className="block text-xs font-medium text-[#1c2a1f]">
                            Tipo de item
                          </label>
                          <select name="tipo" className={campoClasse}>
                            <option value="produto">
                              Produto específico
                            </option>
                            <option value="categoria">
                              Escolha dentro de uma categoria
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#1c2a1f]">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            name="quantidade"
                            min="1"
                            defaultValue="1"
                            className={campoClasse}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#1c2a1f]">
                            Produto (se "Produto específico")
                          </label>
                          <select name="produto_id" className={campoClasse}>
                            <option value="">—</option>
                            {produtos?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#1c2a1f]">
                            Categoria (se "Escolha dentro de uma categoria")
                          </label>
                          <select name="categoria_id" className={campoClasse}>
                            <option value="">—</option>
                            {categorias?.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icone ? `${c.icone} ` : ""}
                                {c.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-[#1c2a1f]">
                            Rótulo mostrado ao caixa (opcional)
                          </label>
                          <input
                            type="text"
                            name="rotulo"
                            className={campoClasse}
                            placeholder='Ex: "Escolha o sabor do pastel"'
                          />
                        </div>
                        <button
                          type="submit"
                          className="sm:col-span-2 rounded-lg border border-[#1f6f3e] px-3 py-1.5 text-xs font-semibold text-[#1f6f3e] transition hover:bg-[#f6f4ee]"
                        >
                          Adicionar item
                        </button>
                      </form>
                    </details>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
  );
}
