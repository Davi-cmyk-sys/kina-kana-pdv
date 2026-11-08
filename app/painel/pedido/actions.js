"use server";

import { createClient } from "@/lib/supabase/server";
import { registrarAuditoria } from "@/lib/auditoria";
import { notificarMaster } from "@/lib/notificacoes";

function subtotalDoItem(item) {
  const totalAdicionais = (item.adicionaisSelecionados ?? []).reduce(
    (soma, a) => soma + a.preco,
    0
  );
  return item.preco * item.quantidade + totalAdicionais;
}

const FORMAS_VALIDAS = [
  "dinheiro",
  "pix",
  "credito",
  "debito",
  "vale_refeicao",
  "vale_alimentacao",
  "outros",
];

export async function criarPedido({ itens, desconto, pagamento }) {
  if (!itens || itens.length === 0) {
    return { erro: "O carrinho está vazio." };
  }
  if (!pagamento?.forma || !FORMAS_VALIDAS.includes(pagamento.forma)) {
    return { erro: "Escolha a forma de pagamento." };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        erro: "Sua sessão expirou. Atualize a página e faça login de novo.",
      };
    }

    const hoje = new Date().toISOString().slice(0, 10);

    // Número da senha do dia = quantos pedidos já foram abertos hoje + 1.
    const { count } = await supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("data_referencia", hoje);

    const numeroSenha = (count ?? 0) + 1;

    const subtotal = itens.reduce(
      (soma, item) => soma + subtotalDoItem(item),
      0
    );

    // Desconto agora é livre: qualquer vendedor logado aplica direto, sem
    // precisar de senha de gerente/admin. Em troca, o master é avisado
    // (abaixo) sempre que um pedido sai com desconto, pra poder
    // acompanhar sem travar a operação de venda.
    const valorDesconto =
      desconto?.valor > 0 ? Math.min(Number(desconto.valor), subtotal) : 0;
    const total = Math.max(subtotal - valorDesconto, 0);

    const recebido = Number(pagamento.recebido) || 0;
    const troco =
      pagamento.forma === "dinheiro" && recebido > total
        ? recebido - total
        : 0;

    const { data: pedido, error: erroPedido } = await supabase
      .from("pedidos")
      .insert({
        numero_senha: numeroSenha,
        data_referencia: hoje,
        funcionario_id: user.id,
        subtotal,
        desconto: valorDesconto,
        desconto_motivo: valorDesconto > 0 ? desconto.motivo || null : null,
        desconto_autorizado_por: valorDesconto > 0 ? user.id : null,
        total,
        status: "pago",
        pago_em: new Date().toISOString(),
      })
      .select("id, numero_senha")
      .single();

    if (erroPedido) {
      return {
        erro:
          erroPedido.code === "42501"
            ? "Você não tem permissão para abrir pedidos."
            : erroPedido.message,
      };
    }

    // Insere item por item (em vez de tudo de uma vez) pra garantir que cada
    // id retornado corresponda certinho aos adicionais daquele item.
    for (const item of itens) {
      const { data: itemInserido, error: erroItem } = await supabase
        .from("itens_pedido")
        .insert({
          pedido_id: pedido.id,
          produto_id: item.tipo === "produto" ? item.produtoId : null,
          combo_id: item.tipo === "combo" ? item.comboId : null,
          nome_snapshot: item.nome,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          combo_escolhas: item.escolhas?.length ? item.escolhas : null,
          subtotal: subtotalDoItem(item),
        })
        .select("id")
        .single();

      if (erroItem) {
        return {
          erro:
            "O pedido foi aberto, mas houve um erro ao salvar um dos itens: " +
            erroItem.message,
        };
      }

      if (item.adicionaisSelecionados?.length) {
        const { error: erroAdicionais } = await supabase
          .from("item_adicionais")
          .insert(
            item.adicionaisSelecionados.map((a) => ({
              item_pedido_id: itemInserido.id,
              adicional_id: a.id,
              nome_snapshot: a.nome,
              quantidade: 1,
              preco_unitario: a.preco,
            }))
          );

        if (erroAdicionais) {
          return {
            erro:
              "O pedido foi aberto, mas houve um erro ao salvar um adicional: " +
              erroAdicionais.message,
          };
        }
      }
    }

    // Baixa automática de estoque, a partir da ficha técnica de cada
    // produto vendido (combos não têm baixa automática ainda). Best-effort:
    // um erro aqui não pode derrubar uma venda que já foi concluída.
    try {
      const produtoIds = itens
        .filter((i) => i.tipo === "produto")
        .map((i) => i.produtoId);

      if (produtoIds.length > 0) {
        const { data: fichaTecnica } = await supabase
          .from("produto_ingredientes")
          .select("produto_id, ingrediente_id, quantidade_por_unidade")
          .in("produto_id", produtoIds);

        for (const item of itens) {
          if (item.tipo !== "produto") continue;
          const ingredientesDoProduto = (fichaTecnica ?? []).filter(
            (f) => f.produto_id === item.produtoId
          );
          for (const f of ingredientesDoProduto) {
            await supabase.from("movimentacoes_estoque").insert({
              ingrediente_id: f.ingrediente_id,
              tipo: "saida",
              quantidade: f.quantidade_por_unidade * item.quantidade,
              motivo: `Venda do pedido nº ${pedido.numero_senha}`,
              pedido_id: pedido.id,
              criado_por: user.id,
            });
          }
        }
      }
    } catch (err) {
      console.error("Erro ao dar baixa no estoque:", err);
    }

    const { error: erroPagamento } = await supabase.from("pagamentos").insert({
      pedido_id: pedido.id,
      forma: pagamento.forma,
      valor: total,
      troco,
      registrado_por: user.id,
    });

    if (erroPagamento) {
      return {
        erro:
          "O pedido foi criado, mas houve um erro ao registrar o pagamento: " +
          erroPagamento.message,
      };
    }

    if (valorDesconto > 0) {
      const textoDesconto = `Desconto de R$ ${valorDesconto
        .toFixed(2)
        .replace(".", ",")} no pedido nº ${pedido.numero_senha}${
        desconto.motivo ? ` (motivo: ${desconto.motivo})` : ""
      }.`;

      await registrarAuditoria("desconto.aplicar", textoDesconto);

      // Ninguém mais precisa autorizar na hora — em troca, o master é
      // avisado de todo pedido com desconto.
      await notificarMaster({
        tipo: "desconto",
        titulo: "Pedido com desconto",
        mensagem: textoDesconto,
        relacionadoTipo: "pedido",
        relacionadoId: pedido.id,
      });
    }

    return { sucesso: true, numeroSenha: pedido.numero_senha, troco };
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    return {
      erro:
        "Erro inesperado ao abrir o pedido: " +
        (err instanceof Error ? err.message : String(err)),
    };
  }
}
