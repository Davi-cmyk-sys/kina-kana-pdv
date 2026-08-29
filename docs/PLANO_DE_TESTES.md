# Plano de testes

Este plano cobre os fluxos críticos do sistema. Os itens marcados **[✔ verificado]** já foram testados manualmente (via API com `curl` e via navegador com Playwright) durante o desenvolvimento desta versão; os demais são o roteiro recomendado para a equipe validar antes de ir para produção.

## 1. Pedidos

- [✔ verificado] Criar pedido de balcão com item simples, observação e adicional — subtotal e total calculados corretamente.
- [✔ verificado] Adicionar/remover itens do carrinho, alterar quantidade.
- [ ] Criar pedido de combo com escolha de sabores (ex.: "2 Pastéis + Refrigerante") e conferir que o preço usado é o do combo, não a soma dos itens escolhidos.
- [ ] Tentar adicionar um produto marcado como "esgotado" — deve ser bloqueado tanto na interface (card desabilitado) quanto na API (erro 400 caso a chamada seja forçada).
- [ ] Criar pedido tipo "mesa" e tipo "delivery" e conferir os campos específicos (número da mesa / endereço).
- [✔ verificado] Aplicar desconto abaixo do limite (sem autorização) e acima do limite (deve exigir PIN de gerente).
- [ ] Tentar aplicar desconto maior que o subtotal — deve ser rejeitado ou limitado ao subtotal.

## 2. Pagamentos

- [✔ verificado] Pagamento único em dinheiro com valor recebido maior que o total — troco calculado corretamente.
- [✔ verificado] Pagamento gera senha sequencial e muda status do pedido para "pago".
- [ ] Pagamento dividido (ex.: metade dinheiro, metade Pix) — soma das linhas precisa bater com o total antes de habilitar a confirmação.
- [ ] Pagamento via Pix: pedido deve permanecer "aguardando_pagamento" até confirmar o QR; depois de confirmado, senha é gerada e status vira "pago".
- [ ] Tentar pagar um valor diferente do total do pedido — deve ser rejeitado com mensagem clara.
- [ ] Confirmar que a venda aparece automaticamente nas movimentações do caixa aberto.

## 3. Impressão

- [✔ verificado] Ficha é gerada com todos os campos obrigatórios (nome/endereço/telefone da loja, data/hora, senha grande, itens, observações, forma de pagamento, troco, atendente, "via original"/"reimpressão", mensagem de retirada).
- [ ] Conectar uma impressora térmica Bluetooth real (Chrome/Android ou Chrome/Windows) via tela de Configuração da Impressora e confirmar impressão física.
- [ ] Simular falha de impressão (ex.: desconectar a impressora no meio do processo) — o pedido deve continuar salvo como "pago" e aparecer na fila de "Fichas pendentes de impressão".
- [ ] Reimprimir uma ficha já impressa a partir da tela "Pedidos" — deve exibir "REIMPRESSÃO" em vez de "VIA ORIGINAL".
- [ ] Testar impressão em bobina de 58mm e 80mm.

## 4. Cozinha e TV

- [✔ verificado] Pedido pago aparece na fila da cozinha em ordem de chegada com itens e observações visíveis.
- [✔ verificado] Marcar "em preparo" e depois "pronto" atualiza o status e os horários (`preparo_iniciado_em`, `pronto_em`).
- [✔ verificado] Tela de TV mostra a senha em destaque com a mensagem "Senha XXX — Pedido pronto para retirada." assim que o pedido fica pronto.
- [ ] Confirmar que a tela de TV funciona sem login (acesso público, sem dados sensíveis expostos).

## 5. Caixa

- [ ] Abrir caixa com valor inicial e confirmar que aparece para todos os terminais (mesmo banco).
- [ ] Registrar sangria e suprimento e conferir que entram no cálculo do valor esperado.
- [✔ verificado] Fechar caixa sem diferença — não deve pedir justificativa.
- [ ] Fechar caixa com diferença sem justificativa — deve ser bloqueado.
- [ ] Fechar caixa com diferença e justificativa, mas sem autorização de gerente (login `caixa`) — deve ser bloqueado até informar o PIN/login de gerente.

## 6. Estoque

- [ ] Cadastrar ingrediente e verificar alerta de "estoque baixo" quando quantidade ≤ mínimo.
- [ ] Ajustar estoque manualmente (entrada/saída) e conferir o novo saldo.

## 7. Permissões

- [ ] Logar como `caixa` e confirmar que não vê os menus de Estoque, Relatórios e Auditoria.
- [ ] Logar como `cozinha` e confirmar acesso apenas à tela de Cozinha.
- [ ] Logar como `entregador` e confirmar acesso apenas à tela de Delivery.
- [ ] Tentar chamar uma rota da API restrita (ex.: `POST /api/caixa/fechar`) autenticado como `caixa` sem autorização de gerente — deve retornar 403.
- [ ] Confirmar que toda ação sensível (desconto, cancelamento, reembolso, reimpressão, abertura/fechamento de caixa) gera um registro em Auditoria com usuário, data/hora e motivo.

## 8. Offline

- [ ] Desligar a rede/Wi-Fi do dispositivo com o app aberto — o indicador "⚠ Offline" deve aparecer no cabeçalho.
- [ ] Criar um pedido enquanto offline — deve ser salvo localmente (IndexedDB) e avisar o atendente para combinar o pagamento manualmente.
- [ ] Reconectar a rede — o pedido salvo localmente deve ser enviado automaticamente para a API (verificar na tela de Pedidos que ele aparece).

## Como rodar os testes automatizados de fumaça (smoke test) usados no desenvolvimento

O projeto não inclui uma suíte de testes automatizados por padrão (fora do escopo desta etapa), mas o roteiro acima foi validado manualmente com:

- **Backend**: chamadas via `curl` cobrindo login → criar pedido → pagar → avançar status → gerar ficha → fechar caixa (ver histórico de comandos usado durante o desenvolvimento).
- **Frontend**: um script Playwright que abre o app, loga, navega por todas as telas e executa o fluxo completo de pedido + pagamento, verificando ausência de erros de JavaScript no console.

Recomenda-se formalizar esses roteiros como testes automatizados (ex.: Vitest + Testing Library no frontend, Jest/Supertest no backend) como próximo passo de maturidade do projeto.
