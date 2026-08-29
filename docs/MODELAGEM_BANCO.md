# Modelagem do banco de dados

O schema completo (SQL comentado) está em [`backend/src/db/schema.sql`](../backend/src/db/schema.sql). Este documento explica as relações entre as tabelas. Tabelas marcadas **[CORE]** têm toda a lógica de negócio implementada nesta etapa; tabelas **[ESTRUTURA]** já existem no banco e têm CRUD básico funcionando, mas regras de negócio mais avançadas (ex.: motor de promoções automáticas, baixa de estoque por receita em cada venda) ficam para uma próxima etapa, conforme o escopo combinado.

## Diagrama lógico (simplificado)

```
usuarios ──┬── pedidos ──┬── itens_pedido ── item_adicionais
           │             ├── pagamentos
           │             └── impressoes
           ├── movimentacoes_caixa
           └── auditoria

caixas ── movimentacoes_caixa

categorias ── produtos ── produto_ingredientes ── ingredientes ── fornecedores
combos ── combo_itens (aponta para produto OU categoria, para permitir "escolha o sabor")

clientes ──┬── pedidos
           ├── pontos_fidelidade
           └── cupons

delivery: motoboys, bairros_taxa (ligados a pedidos via motoboy_id / endereco_entrega)
```

## Tabelas principais

### usuarios / permissoes [CORE]
Um usuário tem um `papel` único (`admin`, `gerente`, `caixa`, `cozinha`, `entregador`). A tabela `permissoes` documenta quais ações cada papel pode fazer — hoje aplicada via `middleware/auth.js` (`permitir(...)`), e pode futuramente virar uma tela de administração de permissões customizadas.

### produtos / categorias / combos / combo_itens / adicionais [CORE]
- `produtos` pertence a uma `categoria`.
- `combos` tem preço próprio e uma lista de `combo_itens`. Cada item do combo pode ser:
  - **fixo**: `produto_id` preenchido (ex.: "X-Salada" sempre incluso).
  - **à escolha**: `categoria_id` preenchido + `quantidade` (ex.: "escolha 2 sabores de pastel") — a API monta as opções disponíveis dinamicamente a partir dos produtos daquela categoria.
- `adicionais` (queijo extra, bacon, molho...) podem ser anexados a um item do pedido (`item_adicionais`) **ou** vendidos avulsos (ver `itens_pedido.produto_id/combo_id` ambos nulos — usado quando o adicional é vendido sozinho pela aba "Adicionais").

### pedidos / itens_pedido / item_adicionais / pagamentos [CORE]
- `pedidos.numero_senha` é sequencial **por dia** (reinicia todo dia), atribuído somente quando o pagamento é confirmado — antes disso o pedido fica com `numero_senha = 0` e status `aguardando_pagamento`.
- `pedidos.data_referencia` (formato `YYYY-MM-DD`) é o que ancora a sequência diária e os relatórios/filtros por dia.
- Preços em `itens_pedido`/`item_adicionais` são **snapshots** (nome e preço no momento da venda) — assim, se o preço de um produto mudar no cadastro, pedidos antigos continuam mostrando o valor pago originalmente.
- `pagamentos` suporta múltiplas linhas por pedido (pagamento dividido). Pix nasce com `status='aguardando'` e é promovido a `confirmado` quando o QR é pago; as demais formas já nascem `confirmado`.
- `pedidos.status_impressao` (`pendente`/`impresso`/`falha`) garante que nenhuma ficha "se perca" — mesmo que a impressão falhe, o pedido continua com status de venda normal (`pago`, `em_preparo`, etc.) e some da fila assim que for impressa com sucesso.

### caixas / movimentacoes_caixa [CORE]
Um único `caixas` fica com `status='aberto'` por vez. Toda venda confirmada gera uma `movimentacoes_caixa` do tipo `venda`; sangrias/suprimentos são lançados manualmente; cancelamentos/reembolsos de pedidos já pagos geram lançamentos negativos automaticamente. O fechamento calcula o valor esperado em dinheiro (`fundo inicial + vendas em dinheiro + suprimentos - sangrias`) e compara com o valor contado.

### clientes / pontos_fidelidade / cupons [CORE simplificado]
Regra de fidelidade ativa: 1 ponto por R$ 1,00 gasto, creditado automaticamente quando o pedido é pago e está vinculado a um `cliente_id`. A tabela `cupons` já existe para desconto por código vinculado a um cliente (CRUD básico pronto, aplicação automática no carrinho fica para a próxima etapa).

### ingredientes / produto_ingredientes / fornecedores [ESTRUTURA]
CRUD completo de ingredientes com alerta de estoque baixo (`quantidade_estoque <= quantidade_minima`). A baixa **automática** por venda (decrementar ingredientes conforme a receita de cada produto) está modelada via `produto_ingredientes`, mas não é executada automaticamente a cada venda nesta etapa — pode ser plugada em `pedidos.js` (`finalizarPagamentoPedido`) quando o cadastro de receitas estiver completo.

### auditoria [CORE]
Toda ação sensível grava uma linha: `desconto`, `cancelamento`, `reembolso`, `reimpressao`, `falha_impressao`, `abertura_caixa`, `fechamento_caixa`, `sangria`, `suprimento`. Sempre inclui quem fez (`usuario_id`), quando, o pedido relacionado (se houver) e o motivo/detalhes.

### motoboys / bairros_taxa [ESTRUTURA]
CRUD pronto para cadastro. A vinculação de motoboy a um pedido de delivery e a aplicação automática da taxa por bairro no carrinho ficam para a próxima etapa (hoje a taxa é um campo livre `taxaEntrega` no pedido).

### promocoes [ESTRUTURA]
Tabela pronta para regras de promoção configuráveis (`regra_json` livre) — horário, combo da tarde, aniversário, fidelidade, produto grátis. O motor que aplica essas regras automaticamente no carrinho é o próximo passo natural de evolução.
