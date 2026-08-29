// =========================================================================
// Kina Kana PDV — dados de exemplo (seed)
// Rode com: npm run seed  (dentro da pasta backend/)
// =========================================================================
const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./index');

initSchema();

const hoje = () => new Date().toISOString();

function limparTudo() {
  const tabelas = [
    'item_adicionais', 'itens_pedido', 'pagamentos', 'movimentacoes_caixa',
    'impressoes', 'auditoria', 'pontos_fidelidade', 'pedidos', 'caixas',
    'combo_itens', 'combos', 'produto_ingredientes', 'produtos', 'categorias',
    'adicionais', 'ingredientes', 'fornecedores', 'cupons', 'promocoes',
    'clientes', 'motoboys', 'bairros_taxa', 'usuarios', 'config_loja',
    'config_impressora', 'permissoes'
  ];
  for (const t of tabelas) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
}

limparTudo();

// ---------------------------------------------------------------------
// USUÁRIOS (senha de demonstração para TODOS: "123456")
// ---------------------------------------------------------------------
const senhaPadrao = bcrypt.hashSync('123456', 10);
const inserirUsuario = db.prepare(`
  INSERT INTO usuarios (nome, email, senha_hash, papel, codigo, ativo)
  VALUES (?, ?, ?, ?, ?, 1)
`);
const usuarios = [
  ['Administrador', 'admin@kinakana.com.br', 'admin', 'AD01'],
  ['Gerente Geral', 'gerente@kinakana.com.br', 'gerente', 'GR01'],
  ['Ana Caixa', 'caixa@kinakana.com.br', 'caixa', 'CX01'],
  ['Bruno Cozinha', 'cozinha@kinakana.com.br', 'cozinha', 'CZ01'],
  ['Carlos Entregador', 'entregador@kinakana.com.br', 'entregador', 'EN01'],
];
const idsUsuarios = {};
for (const [nome, email, papel, codigo] of usuarios) {
  const info = inserirUsuario.run(nome, email, senhaPadrao, papel, codigo);
  idsUsuarios[papel] = info.lastInsertRowid;
}

// Permissões documentais por papel
const inserirPermissao = db.prepare(`INSERT INTO permissoes (papel, permissao) VALUES (?, ?)`);
const mapaPermissoes = {
  admin: ['*'],
  gerente: ['pedidos.criar','pedidos.editar','pagamentos.receber','descontos.autorizar','cancelamentos.autorizar','reembolsos.autorizar','reimpressao.autorizar','caixa.abrir','caixa.fechar','relatorios.ver','estoque.editar','clientes.editar'],
  caixa: ['pedidos.criar','pedidos.editar','pagamentos.receber','impressao.imprimir','caixa.abrir'],
  cozinha: ['pedidos.ver','pedidos.atualizar_status_preparo'],
  entregador: ['entregas.ver','entregas.atualizar_status'],
};
for (const [papel, perms] of Object.entries(mapaPermissoes)) {
  for (const p of perms) inserirPermissao.run(papel, p);
}

// ---------------------------------------------------------------------
// CONFIGURAÇÃO DA LOJA E IMPRESSORA
// ---------------------------------------------------------------------
db.prepare(`INSERT INTO config_loja (id, nome, endereco, telefone, logo_url) VALUES (1, ?, ?, ?, ?)`)
  .run('Kina Kana Pastelaria', 'Rua das Pastelarias, 456 - Centro', '(11) 4002-8922', '/logo.svg');

db.prepare(`INSERT INTO config_impressora (nome_dispositivo, largura_mm, padrao) VALUES (?, ?, 1)`)
  .run(null, 80);

// ---------------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------------
const inserirCategoria = db.prepare(`INSERT INTO categorias (nome, icone, ordem) VALUES (?, ?, ?)`);
const categorias = [
  ['Pastéis', '🥟', 1],
  ['Lanches', '🍔', 2],
  ['Bebidas', '🥤', 3],
  ['Refrigerantes', '🥫', 4],
  ['Sucos', '🍹', 5],
  ['Sobremesas', '🍮', 6],
  ['Porções', '🍟', 7],
];
const idCategoria = {};
for (const [nome, icone, ordem] of categorias) {
  const info = inserirCategoria.run(nome, icone, ordem);
  idCategoria[nome] = info.lastInsertRowid;
}

// ---------------------------------------------------------------------
// PRODUTOS
// ---------------------------------------------------------------------
const inserirProduto = db.prepare(`
  INSERT INTO produtos (categoria_id, nome, descricao, preco, custo, imagem, cor, disponivel, esgotado)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
`);
const idProduto = {};
function addProduto(categoria, nome, descricao, preco, custo, imagem, cor) {
  const info = inserirProduto.run(idCategoria[categoria], nome, descricao, preco, custo, imagem, cor);
  idProduto[nome] = info.lastInsertRowid;
  return info.lastInsertRowid;
}

// Pastéis
addProduto('Pastéis', 'Pastel de Carne', 'Recheio tradicional de carne moída temperada', 9.5, 3.2, '🥟', 'amber');
addProduto('Pastéis', 'Pastel de Queijo', 'Queijo mussarela derretido', 9.0, 2.8, '🧀', 'amber');
addProduto('Pastéis', 'Pastel de Frango com Catupiry', 'Frango desfiado com catupiry cremoso', 10.5, 3.6, '🍗', 'amber');
addProduto('Pastéis', 'Pastel de Pizza', 'Molho, mussarela, presunto e orégano', 10.0, 3.4, '🍕', 'amber');
addProduto('Pastéis', 'Pastel de Calabresa', 'Calabresa fatiada com cebola', 10.0, 3.4, '🌭', 'amber');
addProduto('Pastéis', 'Pastel de Palmito', 'Palmito refogado com temperos', 10.5, 3.8, '🌴', 'amber');
addProduto('Pastéis', 'Pastel Doce (Chocolate com Banana)', 'Massa doce recheada com chocolate e banana', 9.5, 3.0, '🍫', 'rose');

// Lanches
addProduto('Lanches', 'Hambúrguer', 'Pão, hambúrguer bovino, queijo, alface e tomate', 16.0, 6.5, '🍔', 'orange');
addProduto('Lanches', 'X-Salada', 'Pão, carne, queijo, alface, tomate e maionese', 18.0, 7.2, '🍔', 'orange');
addProduto('Lanches', 'X-Bacon', 'Pão, carne, queijo, bacon crocante', 20.0, 8.0, '🥓', 'orange');
addProduto('Lanches', 'X-Egg', 'Pão, carne, queijo e ovo', 19.0, 7.6, '🍳', 'orange');

// Bebidas (água)
addProduto('Bebidas', 'Água com Gás', 'Garrafa 500ml', 5.0, 1.8, '💧', 'sky');
addProduto('Bebidas', 'Água sem Gás', 'Garrafa 500ml', 4.5, 1.5, '💧', 'sky');

// Refrigerantes
addProduto('Refrigerantes', 'Coca-Cola', 'Lata 350ml', 7.0, 2.8, '🥤', 'red');
addProduto('Refrigerantes', 'Coca-Cola Zero', 'Lata 350ml', 7.0, 2.8, '🥤', 'red');
addProduto('Refrigerantes', 'Guaraná', 'Lata 350ml', 6.5, 2.5, '🥤', 'red');
addProduto('Refrigerantes', 'Fanta Laranja', 'Lata 350ml', 6.5, 2.5, '🥤', 'orange');

// Sucos
addProduto('Sucos', 'Suco de Laranja', 'Copo 400ml natural', 8.5, 3.0, '🍊', 'orange');
addProduto('Sucos', 'Suco de Maracujá', 'Copo 400ml natural', 8.5, 3.0, '🟡', 'amber');
addProduto('Sucos', 'Suco de Limão', 'Copo 400ml natural', 7.5, 2.6, '🍋', 'lime');
addProduto('Sucos', 'Suco de Morango', 'Copo 400ml natural', 9.0, 3.4, '🍓', 'rose');

// Sobremesas
addProduto('Sobremesas', 'Pudim de Leite', 'Fatia individual', 8.0, 2.5, '🍮', 'amber');
addProduto('Sobremesas', 'Brigadeiro Gourmet', 'Unidade', 4.0, 1.2, '🍬', 'rose');
addProduto('Sobremesas', 'Sorvete (2 bolas)', 'Casquinha ou copo', 10.0, 3.5, '🍨', 'sky');

// Porções
addProduto('Porções', 'Batata Frita', 'Porção individual crocante', 15.0, 5.0, '🍟', 'amber');
addProduto('Porções', 'Frango a Passarinho', 'Porção para compartilhar', 28.0, 11.0, '🍗', 'orange');
addProduto('Porções', 'Isca de Peixe', 'Porção com molho tártaro', 32.0, 13.0, '🐟', 'sky');

// ---------------------------------------------------------------------
// ADICIONAIS
// ---------------------------------------------------------------------
const inserirAdicional = db.prepare(`INSERT INTO adicionais (nome, preco, ativo) VALUES (?, ?, 1)`);
const idAdicional = {};
for (const [nome, preco] of [
  ['Queijo Extra', 3.0],
  ['Bacon', 4.0],
  ['Molho Especial', 2.0],
  ['Borda Recheada', 6.0],
  ['Porção Extra de Batata', 8.0],
  ['Ovo', 2.5],
  ['Catupiry Extra', 3.5],
]) {
  const info = inserirAdicional.run(nome, preco);
  idAdicional[nome] = info.lastInsertRowid;
}

// ---------------------------------------------------------------------
// COMBOS
// ---------------------------------------------------------------------
const inserirCombo = db.prepare(`INSERT INTO combos (nome, descricao, preco, imagem, cor, ativo) VALUES (?, ?, ?, ?, ?, 1)`);
const inserirComboItem = db.prepare(`
  INSERT INTO combo_itens (combo_id, produto_id, categoria_id, quantidade, rotulo)
  VALUES (?, ?, ?, ?, ?)
`);

function criarCombo(nome, descricao, preco, imagem, cor, itens) {
  const info = inserirCombo.run(nome, descricao, preco, imagem, cor);
  const comboId = info.lastInsertRowid;
  for (const item of itens) {
    inserirComboItem.run(comboId, item.produtoId || null, item.categoriaId || null, item.quantidade, item.rotulo || null);
  }
  return comboId;
}

criarCombo(
  'Combo 2 Pastéis + Refrigerante',
  '2 pastéis à sua escolha + refrigerante lata',
  22.9, '🥟', 'green',
  [
    { categoriaId: idCategoria['Pastéis'], quantidade: 2, rotulo: 'Escolha 2 sabores de pastel' },
    { categoriaId: idCategoria['Refrigerantes'], quantidade: 1, rotulo: 'Escolha o refrigerante' },
  ]
);

criarCombo(
  'Combo 1 Pastel + Suco',
  '1 pastel à sua escolha + suco natural 400ml',
  16.9, '🍹', 'green',
  [
    { categoriaId: idCategoria['Pastéis'], quantidade: 1, rotulo: 'Escolha o sabor do pastel' },
    { categoriaId: idCategoria['Sucos'], quantidade: 1, rotulo: 'Escolha o suco' },
  ]
);

criarCombo(
  'Combo X-Salada Completo',
  'X-Salada + batata frita + refrigerante lata',
  34.9, '🍔', 'green',
  [
    { produtoId: idProduto['X-Salada'], quantidade: 1, rotulo: 'X-Salada' },
    { produtoId: idProduto['Batata Frita'], quantidade: 1, rotulo: 'Batata Frita' },
    { categoriaId: idCategoria['Refrigerantes'], quantidade: 1, rotulo: 'Escolha o refrigerante' },
  ]
);

criarCombo(
  'Combo Família Kina Kana',
  '6 pastéis à escolha + 2 refrigerantes lata',
  54.9, '👨‍👩‍👧‍👦', 'green',
  [
    { categoriaId: idCategoria['Pastéis'], quantidade: 6, rotulo: 'Escolha 6 sabores de pastel' },
    { categoriaId: idCategoria['Refrigerantes'], quantidade: 2, rotulo: 'Escolha 2 refrigerantes' },
  ]
);

// ---------------------------------------------------------------------
// FORNECEDORES E INGREDIENTES (estoque básico)
// ---------------------------------------------------------------------
const idFornecedor = db.prepare(`INSERT INTO fornecedores (nome, telefone, contato) VALUES (?, ?, ?)`)
  .run('Distribuidora Sabor & Cia', '(11) 3344-5566', 'Sr. Ricardo').lastInsertRowid;

const inserirIngrediente = db.prepare(`
  INSERT INTO ingredientes (nome, unidade, quantidade_estoque, quantidade_minima, custo_unitario, fornecedor_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);
for (const [nome, unidade, qtd, min, custo] of [
  ['Massa de Pastel', 'un', 200, 50, 0.6],
  ['Carne Moída', 'kg', 15, 5, 28.0],
  ['Queijo Mussarela', 'kg', 10, 3, 32.0],
  ['Frango Desfiado', 'kg', 8, 3, 22.0],
  ['Catupiry', 'kg', 5, 2, 34.0],
  ['Pão de Hambúrguer', 'un', 60, 20, 1.2],
  ['Batata Congelada', 'kg', 20, 5, 9.0],
  ['Óleo de Fritura', 'l', 30, 8, 8.5],
]) {
  inserirIngrediente.run(nome, unidade, qtd, min, custo, idFornecedor);
}

// ---------------------------------------------------------------------
// CLIENTES DE EXEMPLO
// ---------------------------------------------------------------------
const inserirCliente = db.prepare(`
  INSERT INTO clientes (nome, telefone, data_nascimento, endereco, pontos_fidelidade, observacoes)
  VALUES (?, ?, ?, ?, ?, ?)
`);
inserirCliente.run('Maria Souza', '(11) 98888-1111', '1990-05-12', 'Rua das Flores, 100', 35, 'Gosta de pastel de frango');
inserirCliente.run('João Pereira', '(11) 97777-2222', '1985-11-02', 'Av. Central, 200', 12, 'Sem cebola em tudo');
inserirCliente.run('Fernanda Lima', '(11) 96666-3333', '1998-02-20', null, 60, 'Cliente fidelidade — aniversário este mês');

// ---------------------------------------------------------------------
// BAIRROS/TAXA DE ENTREGA (estrutura de delivery)
// ---------------------------------------------------------------------
const inserirBairro = db.prepare(`INSERT INTO bairros_taxa (bairro, taxa_entrega) VALUES (?, ?)`);
inserirBairro.run('Centro', 5.0);
inserirBairro.run('Jardim das Rosas', 7.0);
inserirBairro.run('Vila Nova', 8.5);

console.log('Seed concluído com sucesso!');
console.log('Usuários de demonstração (senha para todos: 123456):');
for (const [nome, email, papel] of usuarios) {
  console.log(`  - ${papel.padEnd(10)} ${email}`);
}
