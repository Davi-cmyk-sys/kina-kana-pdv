const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar, permitir('admin', 'gerente'));

router.get('/', (req, res) => {
  const registros = db.prepare(`
    SELECT a.*, u.nome AS usuario_nome FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.criado_em DESC LIMIT 300
  `).all();
  res.json(registros);
});

module.exports = router;
