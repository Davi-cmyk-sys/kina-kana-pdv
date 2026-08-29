# Relatórios de fechamento de caixa — exemplo

## Exemplo de tela de Resumo Diário (`/relatorios`)

```
📊 Resumo Diário — 18/08/2026

┌───────────────┬───────────┬──────────────┬───────────┐
│ Total vendido │ Pedidos   │ Ticket médio │ Descontos │
│ R$ 842,50     │ 47        │ R$ 17,93     │ R$ 32,00  │
├───────────────┼───────────┴──────────────┴───────────┤
│ Cancelamentos │ 2 (R$ 45,00)                          │
│ Reembolsos    │ 0 (R$ 0,00)                           │
└───────────────┴────────────────────────────────────────┘

Formas de pagamento
  Dinheiro ............ R$ 312,00
  Pix .................. R$ 260,50
  Cartão Crédito ....... R$ 180,00
  Cartão Débito ......... R$ 60,00
  Vale-Refeição .......... R$ 30,00

🏆 Produtos mais vendidos
  1. Pastel de Carne (38x) ........ R$ 361,00
  2. Coca-Cola (29x) .............. R$ 203,00
  3. Pastel de Queijo (21x) ....... R$ 189,00

👤 Vendas por atendente
  Ana Caixa (30 pedidos) .......... R$ 540,00
  Bruno Caixa (17 pedidos) ........ R$ 302,50

🕒 Horários com mais pedidos
  12:00 — 9 pedidos   18:00 — 7 pedidos   19:00 — 11 pedidos
```

Exportações disponíveis na própria tela: **CSV/Excel** (planilha pronta para abrir no Excel/Google Sheets, com acentuação correta) e **PDF** (usa a impressão do navegador — "Salvar como PDF" no diálogo de impressão).

## Exemplo de fechamento de caixa (`/caixa`, papel gerente/admin)

```
🔒 Fechamento de Caixa

Fundo inicial ................. R$ 100,00
+ Vendas em dinheiro ........... R$ 312,00
+ Suprimentos ................... R$ 50,00
- Sangrias ...................... R$ 80,00
────────────────────────────────────────
= Valor esperado em caixa ...... R$ 382,00

Valor contado (informado pelo atendente): R$ 380,00
Diferença: -R$ 2,00  ⚠ Requer justificativa

Justificativa: "Troco arredondado para baixo em 2 vendas"
PIN do gerente: ●●●●
[Fechar Caixa]
```

Ao confirmar, o sistema:
1. Grava a diferença como uma movimentação do tipo `diferenca` no caixa.
2. Marca o caixa como `fechado`, registrando quem fechou e quem autorizou.
3. Grava um evento de auditoria `fechamento_caixa` com o resumo completo (útil para conferência posterior).

## Como os números são calculados

Toda a lógica está em `backend/src/routes/caixa.js` (`calcularResumoCaixa`) e `backend/src/routes/relatorios.js` (`GET /diario`) — ambos consultam diretamente as tabelas `pedidos`, `pagamentos` e `movimentacoes_caixa`, então os relatórios sempre refletem o estado real do banco (nada é pré-calculado/cacheado).
