const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');
const { registrarAuditoria } = require('../utils/auditoria');

const router = express.Router();
router.use(autenticar);

router.get('/atual', (req, res) => {
  const caixa = db.prepare("SELECT * FROM caixas WHERE status = 'aberto' ORDER BY id DESC LIMIT 1").get();
  if (!caixa) return res.json(null);
  const movimentacoes = db.prepare(`
    SELECT m.*, u.nome AS funcionario_nome FROM movimentacoes_caixa m
    LEFT JOIN usuarios u ON u.id = m.funcionario_id
    WHERE m.caixa_id = ? ORDER BY m.criado_em DESC
  `).all(caixa.id);
  res.json({ ...caixa, movimentacoes });
});

router.post('/abrir', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const aberto = db.prepare("SELECT * FROM caixas WHERE status = 'aberto'").get();
  if (aberto) return res.status(400).json({ erro: 'Já existe um caixa aberto.' });

  const { valorInicial } = req.body;
  const info = db.prepare(`
    INSERT INTO caixas (funcionario_abertura_id, valor_inicial, status) VALUES (?, ?, 'aberto')
  `).run(req.usuario.id, valorInicial || 0);

  registrarAuditoria(req.usuario.id, 'abertura_caixa', null, { valorInicial });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/movimentacao', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const caixa = db.prepare("SELECT * FROM caixas WHERE status = 'aberto'").get();
  if (!caixa) return res.status(400).json({ erro: 'Não há caixa aberto.' });

  const { tipo, valor, descricao } = req.body;
  if (!['sangria', 'suprimento'].includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de movimentação inválido (use sangria ou suprimento).' });
  }
  const valorFinal = tipo === 'sangria' ? -Math.abs(valor) : Math.abs(valor);

  db.prepare(`
    INSERT INTO movimentacoes_caixa (caixa_id, tipo, valor, descricao, funcionario_id) VALUES (?, ?, ?, ?, ?)
  `).run(caixa.id, tipo, valorFinal, descricao || null, req.usuario.id);

  registrarAuditoria(req.usuario.id, tipo, null, { valor: valorFinal, descricao });
  res.status(201).json({ ok: true });
});

function calcularResumoCaixa(caixaId) {
  const movs = db.prepare('SELECT * FROM movimentacoes_caixa WHERE caixa_id = ?').all(caixaId);
  const caixa = db.prepare('SELECT * FROM caixas WHERE id = ?').get(caixaId);

  const pedidosPagos = db.prepare(`
    SELECT p.id, p.total FROM pedidos p
    JOIN movimentacoes_caixa m ON m.pedido_id = p.id AND m.caixa_id = ? AND m.tipo = 'venda'
  `).all(caixaId);

  const pagamentosPorForma = {};
  let totalVendas = 0;
  for (const pedido of pedidosPagos) {
    totalVendas += pedido.total;
    const pagamentos = db.prepare("SELECT forma, valor FROM pagamentos WHERE pedido_id = ? AND status = 'confirmado'").all(pedido.id);
    for (const pg of pagamentos) {
      pagamentosPorForma[pg.forma] = (pagamentosPorForma[pg.forma] || 0) + pg.valor;
    }
  }

  const totalSangrias = movs.filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0);
  const totalSuprimentos = movs.filter((m) => m.tipo === 'suprimento').reduce((s, m) => s + m.valor, 0);
  const totalCancelamentos = movs.filter((m) => m.tipo === 'cancelamento').reduce((s, m) => s + Math.abs(m.valor), 0);
  const totalReembolsos = movs.filter((m) => m.tipo === 'reembolso').reduce((s, m) => s + Math.abs(m.valor), 0);

  const dinheiroVendas = pagamentosPorForma['dinheiro'] || 0;
  const valorEsperadoDinheiro = caixa.valor_inicial + dinheiroVendas + totalSuprimentos + totalSangrias;

  return {
    totalVendas, pagamentosPorForma, totalSangrias, totalSuprimentos,
    totalCancelamentos, totalReembolsos, valorEsperadoDinheiro,
    quantidadePedidos: pedidosPagos.length,
    ticketMedio: pedidosPagos.length ? totalVendas / pedidosPagos.length : 0,
  };
}

router.get('/:id/resumo', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  res.json(calcularResumoCaixa(req.params.id));
});

router.post('/fechar', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const caixa = db.prepare("SELECT * FROM caixas WHERE status = 'aberto'").get();
  if (!caixa) return res.status(400).json({ erro: 'Não há caixa aberto.' });

  const { valorContado, justificativa, autorizadoPorId } = req.body;
  const resumo = calcularResumoCaixa(caixa.id);
  const diferenca = Number(valorContado) - resumo.valorEsperadoDinheiro;

  if (Math.abs(diferenca) > 0.01 && !justificativa) {
    return res.status(400).json({ erro: 'Há diferença no caixa: informe uma justificativa.' });
  }
  if (!autorizadoPorId && req.usuario.papel === 'caixa') {
    return res.status(403).json({ erro: 'Fechamento de caixa exige autorização de gerente/administrador.', exigeAutorizacaoGerente: true });
  }

  if (Math.abs(diferenca) > 0.01) {
    db.prepare(`
      INSERT INTO movimentacoes_caixa (caixa_id, tipo, valor, descricao, funcionario_id) VALUES (?, 'diferenca', ?, ?, ?)
    `).run(caixa.id, diferenca, justificativa, req.usuario.id);
  }

  db.prepare(`
    UPDATE caixas SET status = 'fechado', funcionario_fechamento_id = ?, valor_esperado = ?, valor_contado = ?,
      diferenca = ?, justificativa = ?, autorizado_por = ?, fechado_em = datetime('now')
    WHERE id = ?
  `).run(req.usuario.id, resumo.valorEsperadoDinheiro, valorContado, diferenca, justificativa || null, autorizadoPorId || null, caixa.id);

  registrarAuditoria(req.usuario.id, 'fechamento_caixa', null, { ...resumo, valorContado, diferenca }, justificativa);
  res.json({ ok: true, resumo: { ...resumo, valorContado, diferenca } });
});

router.get('/historico', permitir('admin', 'gerente'), (req, res) => {
  res.json(db.prepare('SELECT * FROM caixas ORDER BY id DESC LIMIT 60').all());
});

module.exports = router;
