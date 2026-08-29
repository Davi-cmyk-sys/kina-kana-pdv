const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/loja', (req, res) => {
  res.json(db.prepare('SELECT * FROM config_loja WHERE id = 1').get());
});

router.put('/loja', permitir('admin', 'gerente'), (req, res) => {
  const { nome, endereco, telefone, logoUrl } = req.body;
  db.prepare('UPDATE config_loja SET nome = ?, endereco = ?, telefone = ?, logo_url = ? WHERE id = 1')
    .run(nome, endereco, telefone, logoUrl);
  res.json({ ok: true });
});

// Lista de funcionários ativos — usado nos filtros de pedidos e relatórios
router.get('/usuarios', permitir('admin', 'gerente'), (req, res) => {
  res.json(db.prepare('SELECT id, nome, papel, codigo FROM usuarios WHERE ativo = 1 ORDER BY nome').all());
});

module.exports = router;
