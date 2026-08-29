const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/motoboys', (req, res) => {
  res.json(db.prepare('SELECT * FROM motoboys ORDER BY nome').all());
});

router.post('/motoboys', permitir('admin', 'gerente'), (req, res) => {
  const { nome, telefone, veiculo } = req.body;
  const info = db.prepare('INSERT INTO motoboys (nome, telefone, veiculo) VALUES (?, ?, ?)').run(nome, telefone || null, veiculo || null);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/bairros', (req, res) => {
  res.json(db.prepare('SELECT * FROM bairros_taxa ORDER BY bairro').all());
});

router.post('/bairros', permitir('admin', 'gerente'), (req, res) => {
  const { bairro, taxaEntrega } = req.body;
  const info = db.prepare('INSERT INTO bairros_taxa (bairro, taxa_entrega) VALUES (?, ?)').run(bairro, taxaEntrega || 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

// Pedidos de delivery em andamento (para a tela de entregador)
router.get('/em-andamento', permitir('admin', 'gerente', 'entregador', 'caixa'), (req, res) => {
  const pedidos = db.prepare(`
    SELECT * FROM pedidos WHERE tipo = 'delivery' AND status IN ('pago','em_preparo','pronto')
    ORDER BY criado_em ASC
  `).all();
  res.json(pedidos);
});

module.exports = router;
