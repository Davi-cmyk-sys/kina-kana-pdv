const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/', (req, res) => {
  const categorias = db.prepare('SELECT * FROM categorias ORDER BY ordem, nome').all();
  res.json(categorias);
});

router.post('/', permitir('admin', 'gerente'), (req, res) => {
  const { nome, icone, ordem } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });
  const info = db.prepare('INSERT INTO categorias (nome, icone, ordem) VALUES (?, ?, ?)').run(nome, icone || '🍽️', ordem || 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
