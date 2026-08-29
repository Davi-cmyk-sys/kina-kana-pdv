const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
router.use(permitir('admin', 'gerente'));

// Relatório de resumo diário — usado na tela de Relatórios e no fechamento de caixa
router.get('/diario', (req, res) => {
  const data = req.query.data || new Date().toISOString().slice(0, 10);

  const pedidosDia = db.prepare(`SELECT * FROM pedidos WHERE data_referencia = ?`).all(data);
  const pagos = pedidosDia.filter((p) => ['pago', 'em_preparo', 'pronto', 'entregue'].includes(p.status));
  const cancelados = pedidosDia.filter((p) => p.status === 'cancelado');
  const reembolsados = pedidosDia.filter((p) => p.status === 'reembolsado');

  const totalVendido = pagos.reduce((s, p) => s + p.total, 0);
  const totalDescontos = pagos.reduce((s, p) => s + p.desconto, 0);
  const ticketMedio = pagos.length ? totalVendido / pagos.length : 0;

  const formaPagamentoStmt = db.prepare(`
    SELECT forma, SUM(valor) AS total FROM pagamentos
    WHERE status = 'confirmado' AND pedido_id IN (SELECT id FROM pedidos WHERE data_referencia = ?)
    GROUP BY forma
  `);
  const porFormaPagamento = formaPagamentoStmt.all(data);

  const produtosMaisVendidos = db.prepare(`
    SELECT nome_snapshot AS nome, SUM(quantidade) AS quantidade, SUM(subtotal) AS total
    FROM itens_pedido
    WHERE pedido_id IN (SELECT id FROM pedidos WHERE data_referencia = ? AND status != 'cancelado')
    GROUP BY nome_snapshot
    ORDER BY quantidade DESC
    LIMIT 10
  `).all(data);

  const vendasPorFuncionario = db.prepare(`
    SELECT u.nome AS funcionario, COUNT(*) AS pedidos, SUM(p.total) AS total
    FROM pedidos p JOIN usuarios u ON u.id = p.funcionario_id
    WHERE p.data_referencia = ? AND p.status != 'cancelado' AND p.status != 'aguardando_pagamento'
    GROUP BY u.id ORDER BY total DESC
  `).all(data);

  const horarios = db.prepare(`
    SELECT strftime('%H:00', criado_em) AS hora, COUNT(*) AS pedidos
    FROM pedidos WHERE data_referencia = ?
    GROUP BY hora ORDER BY hora
  `).all(data);

  res.json({
    data,
    totalVendido,
    quantidadePedidos: pagos.length,
    ticketMedio,
    totalDescontos,
    totalCancelamentos: cancelados.length,
    valorCancelamentos: cancelados.reduce((s, p) => s + p.total, 0),
    totalReembolsos: reembolsados.length,
    valorReembolsos: reembolsados.reduce((s, p) => s + p.total, 0),
    porFormaPagamento,
    produtosMaisVendidos,
    vendasPorFuncionario,
    horarios,
  });
});

// CSV pronto para abrir no Excel (exportação simples, sem dependências pesadas)
router.get('/diario/csv', (req, res) => {
  const data = req.query.data || new Date().toISOString().slice(0, 10);
  const produtos = db.prepare(`
    SELECT nome_snapshot AS nome, SUM(quantidade) AS quantidade, SUM(subtotal) AS total
    FROM itens_pedido
    WHERE pedido_id IN (SELECT id FROM pedidos WHERE data_referencia = ? AND status != 'cancelado')
    GROUP BY nome_snapshot ORDER BY quantidade DESC
  `).all(data);

  let csv = 'Produto;Quantidade;Total (R$)\n';
  for (const p of produtos) {
    csv += `${p.nome};${p.quantidade};${p.total.toFixed(2).replace('.', ',')}\n`;
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="relatorio-${data}.csv"`);
  res.send('﻿' + csv); // BOM para acentuação correta no Excel
});

module.exports = router;
