const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/ingredientes', (req, res) => {
  const ingredientes = db.prepare(`
    SELECT i.*, f.nome AS fornecedor_nome FROM ingredientes i
    LEFT JOIN fornecedores f ON f.id = i.fornecedor_id
    ORDER BY i.nome
  `).all();
  res.json(ingredientes.map((i) => ({ ...i, estoqueBaixo: i.quantidade_estoque <= i.quantidade_minima })));
});

router.post('/ingredientes', permitir('admin', 'gerente'), (req, res) => {
  const { nome, unidade, quantidadeEstoque, quantidadeMinima, custoUnitario, fornecedorId } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  const info = db.prepare(`
    INSERT INTO ingredientes (nome, unidade, quantidade_estoque, quantidade_minima, custo_unitario, fornecedor_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nome, unidade || 'un', quantidadeEstoque || 0, quantidadeMinima || 0, custoUnitario || 0, fornecedorId || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/ingredientes/:id/ajustar', permitir('admin', 'gerente'), (req, res) => {
  const { quantidade } = req.body; // pode ser negativo (baixa) ou positivo (reposição)
  db.prepare('UPDATE ingredientes SET quantidade_estoque = quantidade_estoque + ? WHERE id = ?').run(quantidade, req.params.id);
  res.json({ ok: true });
});

router.get('/fornecedores', (req, res) => {
  res.json(db.prepare('SELECT * FROM fornecedores ORDER BY nome').all());
});

router.post('/fornecedores', permitir('admin', 'gerente'), (req, res) => {
  const { nome, telefone, contato } = req.body;
  const info = db.prepare('INSERT INTO fornecedores (nome, telefone, contato) VALUES (?, ?, ?)').run(nome, telefone || null, contato || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Vincular ingrediente a um produto (para futura baixa automática detalhada por receita)
router.post('/produtos/:produtoId/ingredientes', permitir('admin', 'gerente'), (req, res) => {
  const { ingredienteId, quantidadeUsada } = req.body;
  const info = db.prepare(`
    INSERT INTO produto_ingredientes (produto_id, ingrediente_id, quantidade_usada) VALUES (?, ?, ?)
  `).run(req.params.produtoId, ingredienteId, quantidadeUsada);
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
