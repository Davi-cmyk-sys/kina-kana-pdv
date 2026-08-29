const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const { busca } = req.query;
  if (busca) {
    return res.json(db.prepare('SELECT * FROM clientes WHERE nome LIKE ? OR telefone LIKE ? ORDER BY nome').all(`%${busca}%`, `%${busca}%`));
  }
  res.json(db.prepare('SELECT * FROM clientes ORDER BY nome').all());
});

router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' });
  const pedidos = db.prepare('SELECT id, numero_senha, total, status, criado_em FROM pedidos WHERE cliente_id = ? ORDER BY criado_em DESC LIMIT 50').all(req.params.id);
  const pontos = db.prepare('SELECT * FROM pontos_fidelidade WHERE cliente_id = ? ORDER BY criado_em DESC').all(req.params.id);
  res.json({ ...cliente, pedidos, historicoPontos: pontos });
});

router.post('/', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { nome, telefone, dataNascimento, endereco, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  const info = db.prepare(`
    INSERT INTO clientes (nome, telefone, data_nascimento, endereco, observacoes) VALUES (?, ?, ?, ?, ?)
  `).run(nome, telefone || null, dataNascimento || null, endereco || null, observacoes || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { nome, telefone, dataNascimento, endereco, observacoes } = req.body;
  db.prepare(`
    UPDATE clientes SET nome = ?, telefone = ?, data_nascimento = ?, endereco = ?, observacoes = ? WHERE id = ?
  `).run(nome, telefone, dataNascimento, endereco, observacoes, req.params.id);
  res.json({ ok: true });
});

// Aniversariantes do mês — usado para promoção de aniversário
router.get('/aniversariantes/mes', permitir('admin', 'gerente'), (req, res) => {
  const mes = String(req.query.mes || new Date().getMonth() + 1).padStart(2, '0');
  const clientes = db.prepare(`SELECT * FROM clientes WHERE data_nascimento IS NOT NULL AND strftime('%m', data_nascimento) = ?`).all(mes);
  res.json(clientes);
});

module.exports = router;
