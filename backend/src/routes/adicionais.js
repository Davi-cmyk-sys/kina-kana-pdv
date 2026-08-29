const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM adicionais WHERE ativo = 1 ORDER BY nome').all());
});

router.post('/', permitir('admin', 'gerente'), (req, res) => {
  const { nome, preco } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  const info = db.prepare('INSERT INTO adicionais (nome, preco) VALUES (?, ?)').run(nome, preco || 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
