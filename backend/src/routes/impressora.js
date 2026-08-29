const express = require('express');
const { db } = require('../db');
const { autenticar, permitir } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// A conexão Bluetooth em si acontece no NAVEGADOR (Web Bluetooth API), pois é o
// dispositivo do atendente (tablet/PC) que fica fisicamente perto da impressora.
// O backend guarda apenas as preferências (nome do último dispositivo, largura da
// bobina) e o histórico de tentativas de impressão (tabela `impressoes`).
router.get('/config', (req, res) => {
  res.json(db.prepare('SELECT * FROM config_impressora ORDER BY id DESC LIMIT 1').get());
});

router.put('/config', permitir('admin', 'gerente', 'caixa'), (req, res) => {
  const { nomeDispositivo, larguraMm } = req.body;
  const atual = db.prepare('SELECT * FROM config_impressora ORDER BY id DESC LIMIT 1').get();
  if (atual) {
    db.prepare(`
      UPDATE config_impressora SET nome_dispositivo = ?, largura_mm = ?, ultima_conexao = datetime('now') WHERE id = ?
    `).run(nomeDispositivo || atual.nome_dispositivo, larguraMm || atual.largura_mm, atual.id);
  } else {
    db.prepare('INSERT INTO config_impressora (nome_dispositivo, largura_mm, padrao) VALUES (?, ?, 1)').run(nomeDispositivo, larguraMm || 80);
  }
  res.json({ ok: true });
});

router.get('/erros', permitir('admin', 'gerente'), (req, res) => {
  res.json(db.prepare(`
    SELECT i.*, p.numero_senha, u.nome AS funcionario_nome FROM impressoes i
    LEFT JOIN pedidos p ON p.id = i.pedido_id
    LEFT JOIN usuarios u ON u.id = i.funcionario_id
    WHERE i.sucesso = 0 ORDER BY i.criado_em DESC LIMIT 100
  `).all());
});

// Pedidos pagos que ainda não foram impressos com sucesso (fila de reimpressão)
router.get('/pendentes', (req, res) => {
  res.json(db.prepare(`
    SELECT id, numero_senha, total, criado_em FROM pedidos
    WHERE status_impressao != 'impresso' AND status != 'aguardando_pagamento' AND status != 'cancelado'
    ORDER BY criado_em DESC LIMIT 50
  `).all());
});

module.exports = router;
