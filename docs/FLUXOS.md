# Fluxos completos do sistema

## 1. Fluxo do pedido de balcão (implementado ponta a ponta)

```
[Atendente loga]
      │
      ▼
[Novo Pedido] ── clica em categorias/produtos/combos ──> [Carrinho]
      │                                                        │
      │  (editar item: obs/adicionais, aplicar desconto)       │
      ▼                                                        │
[Finalizar Pedido] ─── POST /api/pedidos (status: aguardando_pagamento) ──┘
      │
      ▼
[Tela de Pagamento] ── escolhe forma(s), dinheiro calcula troco, pode dividir
      │
      ├─ Pix ──> mostra QR Code ── "Marcar como pago" ──┐
      │                                                  │
      └─ Dinheiro/Cartão/Vale/Outros (confirmado na hora)┤
                                                           ▼
                                        POST /api/pedidos/:id/pagamentos
                                     (quando soma confirmada = total do pedido)
                                                           │
                                                           ▼
                                     status = 'pago' + numero_senha atribuído
                                     (sequencial, reinicia todo dia)
                                                           │
                                                           ▼
                                   [Ficha de retirada gerada] ── imprime
                                   (Bluetooth ESC/POS ou navegador)
                                   Se falhar: pedido continua 'pago',
                                   ficha some para a fila de reimpressão
                                                           │
                                                           ▼
                              [Painel da Cozinha] mostra pedidos 'pago'
                              em ordem de chegada ── cozinha marca:
                                    'pago' → 'em_preparo' → 'pronto'
                                                           │
                                                           ▼
                                [TV do Balcão] mostra a senha em destaque
                                assim que o status vira 'pronto'
                                                           │
                                                           ▼
                              [Gestão de Pedidos] atendente marca 'entregue'
                              quando o cliente retira (ou via Delivery)
```

Horários registrados automaticamente em cada etapa: `criado_em`, `pago_em`, `preparo_iniciado_em`, `pronto_em`, `entregue_em` (mais `cancelado_em` se cancelado).

## 2. Cancelamento e reembolso

- **Cancelar antes de pagar**: qualquer atendente pode cancelar, só exige motivo.
- **Cancelar já pago**: exige motivo **e** autorização de gerente (PIN ou login) — gera um lançamento negativo no caixa e fica registrado na auditoria.
- **Reembolsar**: só gerente/admin, sempre com motivo — também gera lançamento negativo no caixa.

## 3. Fluxo de mesa / delivery / QR Code / autoatendimento

O campo `pedidos.tipo` já suporta `balcao`, `mesa`, `whatsapp`, `delivery`, `qrcode`, `autoatendimento`. Hoje o app de balcão cria pedidos de **balcão**, **mesa** (com número da mesa) e **delivery** (com endereço e taxa) diretamente pela tela de Novo Pedido — o mesmo atendente cria em nome do cliente.

Para os canais **QR Code de mesa** (cliente pede pelo próprio celular) e **WhatsApp/autoatendimento**, a API já aceita pedidos com esses tipos (`POST /api/pedidos` com `tipo: 'qrcode'` etc.) — falta apenas construir a interface pública (cardápio digital sem necessidade de login de atendente) que os alimenta. Como o backend já valida preços no servidor e não confia em dados do cliente, essa interface pública pode ser adicionada com segurança reaproveitando as mesmas rotas.

## 4. Delivery — fluxo de status

```
pago → em_preparo → pronto → entregue (== "entregue ao motoboy/cliente")
```

A tela **Delivery** lista pedidos do tipo `delivery` em andamento e permite avançar para "entregue" quando o motoboy sai/entrega. Cadastro de motoboys e taxa por bairro já tem CRUD pronto (`/api/delivery/motoboys`, `/api/delivery/bairros`); a atribuição automática de motoboy e roteirização ficam para a próxima etapa.

## 5. Retirada no balcão vs. entregue por delivery

O mesmo campo `status` cobre os dois casos — `'pronto'` significa "pronto para retirada" (balcão) ou "pronto para sair para entrega" (delivery); `'entregue'` significa "retirado pelo cliente" ou "entregue pelo motoboy", dependendo de `pedidos.tipo`. Isso mantém um único painel de gestão de pedidos para ambos os fluxos.

## 6. Fechamento de caixa (detalhado em `RELATORIOS_CAIXA.md`)

```
Abrir caixa (valor inicial) → vendas do dia lançadas automaticamente →
sangrias/suprimentos manuais → Fechar caixa (valor contado) →
sistema calcula esperado x contado → diferença exige justificativa +
autorização de gerente → relatório do dia disponível em Relatórios
```
