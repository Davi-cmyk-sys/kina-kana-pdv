const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const { categoriaId } = req.query;
  let produtos;
  if (categoriaId) {
    produtos = db.prepare('SELECT * FROM produtos WHERE categoria_id = ? ORDER BY nome').all(categoriaId);
  } else {
    produtos = db.prepare('SELECT * FROM produtos ORDER BY categoria_id, nome').all();
  }
  res.json(produtos);
});

router.post('/', permitir('admin', 'gerente'), (req, res) => {
  const { categoriaId, nome, descricao, preco, custo, imagem, cor } = req.body;
  if (!categoriaId || !nome || preco == null) {
    return res.status(400).json({ erro: 'categoriaId, nome e preco são obrigatórios.' });
  }
  const info = db.prepare(`
    INSERT INTO produtos (categoria_id, nome, descricao, preco, custo, imagem, cor)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(categoriaId, nome, descricao || null, preco, custo || 0, imagem || '🍽️', cor || 'amber');
  res.status(201).json({ id: info.lastInsertRowid });
});

// Marcar disponível / esgotado rapidamente (usado no balcão quando acaba um item)
router.patch('/:id/disponibilidade', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { esgotado } = req.body;
  db.prepare('UPDATE produtos SET esgotado = ? WHERE id = ?').run(esgotado ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.put('/:id', permitir('admin', 'gerente'), (req, res) => {
  const { nome, descricao, preco, custo, imagem, cor, disponivel } = req.body;
  db.prepare(`
    UPDATE produtos SET nome = ?, descricao = ?, preco = ?, custo = ?, imagem = ?, cor = ?, disponivel = ?
    WHERE id = ?
  `).run(nome, descricao, preco, custo, imagem, cor, disponivel ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
