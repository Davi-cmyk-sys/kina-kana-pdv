require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { initSchema } = require('./db');

initSchema();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, sistema: 'Kina Kana PDV', hora: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/produtos', require('./routes/produtos'));
app.use('/api/combos', require('./routes/combos'));
app.use('/api/adicionais', require('./routes/adicionais'));
app.use('/api/pedidos', require('./routes/pedidos'));
app.use('/api/caixa', require('./routes/caixa'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/auditoria', require('./routes/auditoria'));
app.use('/api/config', require('./routes/config'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/impressora', require('./routes/impressora'));

// Tratamento de erro genérico — nunca derruba o servidor por um erro de rota
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor.', detalhe: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🥟 Kina Kana PDV — API rodando em http://localhost:${PORT}\n`);
});
