const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { autenticar, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email.toLowerCase().trim());
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }
  const payload = { id: usuario.id, nome: usuario.nome, papel: usuario.papel, codigo: usuario.codigo };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
  res.json({ token, usuario: payload });
});

router.get('/me', autenticar, (req, res) => {
  res.json({ usuario: req.usuario });
});

// Verifica um PIN/senha de gerente para autorizar desconto/cancelamento/reimpressão.
// Em produção real, o ideal é pedir o login completo do gerente em vez de um PIN fixo.
router.post('/autorizar-gerente', autenticar, (req, res) => {
  const { pin, senhaGerenteEmail, senhaGerenteSenha } = req.body;

  // Opção A: login completo de um usuário gerente/admin (mais seguro)
  if (senhaGerenteEmail && senhaGerenteSenha) {
    const gerente = db.prepare("SELECT * FROM usuarios WHERE email = ? AND ativo = 1 AND papel IN ('gerente','admin')").get(senhaGerenteEmail.toLowerCase().trim());
    if (gerente && bcrypt.compareSync(senhaGerenteSenha, gerente.senha_hash)) {
      return res.json({ autorizado: true, autorizadoPorId: gerente.id, autorizadoPorNome: gerente.nome });
    }
    return res.status(401).json({ autorizado: false, erro: 'Credenciais de gerente inválidas.' });
  }

  // Opção B: PIN rápido de balcão (definido em .env)
  const pinValido = process.env.MANAGER_PIN || '0000';
  if (pin === pinValido) {
    return res.json({ autorizado: true, autorizadoPorId: null, autorizadoPorNome: 'Gerente (PIN)' });
  }
  return res.status(401).json({ autorizado: false, erro: 'PIN de gerente inválido.' });
});

module.exports = router;
