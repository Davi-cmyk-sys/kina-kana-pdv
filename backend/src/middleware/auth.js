const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  // Aceita também ?token=... na query string, usado por links de download
  // (ex: exportação de relatório em CSV) onde não é possível enviar cabeçalhos.
  const token = (header.startsWith('Bearer ') ? header.slice(7) : null) || req.query.token || null;
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido. Faça login novamente.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload; // { id, nome, papel, codigo }
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

// Permite acesso apenas a determinados papéis. 'admin' sempre tem acesso total.
function permitir(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Não autenticado.' });
    if (req.usuario.papel === 'admin' || papeis.includes(req.usuario.papel)) {
      return next();
    }
    return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
  };
}

module.exports = { autenticar, permitir, JWT_SECRET };
