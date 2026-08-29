# Impressão térmica Bluetooth — como funciona e limitações

## Como este projeto imprime hoje

O sistema usa a **Web Bluetooth API**, um recurso do próprio navegador que permite parear e enviar dados para um dispositivo Bluetooth Low Energy (BLE) sem instalar nenhum programa. O fluxo é:

1. O atendente vai em **Impressora** (menu superior) e clica em **"Buscar e Conectar"**.
2. O navegador abre o seletor nativo de dispositivos Bluetooth do sistema operacional.
3. Depois de parear, o app guarda a conexão (em memória, na aba aberta) e monta os comandos **ESC/POS** (o "idioma" universal das impressoras térmicas) a partir dos dados do pedido.
4. Os bytes são enviados em pequenos pedaços (chunks) para a característica GATT da impressora — isso está implementado em `frontend/src/lib/bluetoothPrinter.js`.
5. Se der erro, a venda **nunca é perdida**: o pedido já está salvo como "pago" no banco antes da tentativa de impressão, e fica na fila de "Fichas pendentes de impressão" na tela de configuração da impressora, podendo ser reimpresso quantas vezes for preciso.

## Limitações importantes (leia antes de decidir a arquitetura final)

1. **Só funciona em navegadores baseados em Chromium.** Chrome, Edge e Opera funcionam em Android, Windows, macOS e Linux. **Safari e todos os navegadores no iPhone/iPad NÃO suportam Web Bluetooth** (é uma limitação da Apple, não do nosso código). Se a loja for usar iPad, a impressão Bluetooth direta do navegador não funciona — nesse caso use a opção "Imprimir pelo navegador" (impressão comum, via impressora de rede/USB compartilhada) ou migre para um app nativo.
2. **Exige clique do usuário.** Por segurança, o navegador só abre o seletor de dispositivos Bluetooth em resposta direta a um clique — não é possível conectar "sozinho" ao abrir a tela.
3. **A conexão não persiste entre recarregamentos de página.** Se o atendente atualizar a página (F5) ou fechar a aba, é preciso conectar de novo. Isso é aceitável para um turno de trabalho, mas não é "always on" como um driver de impressora tradicional.
4. **UUIDs de serviço variam por fabricante.** O código usa os UUIDs mais comuns entre impressoras térmicas ESC/POS genéricas (`000018f0-...` / `00002af1-...`). Impressoras de marcas específicas (Epson, Bixolon, Elgin, etc.) podem usar UUIDs diferentes — ajuste as constantes `SERVICE_UUID`/`CHARACTERISTIC_UUID` em `frontend/src/lib/bluetoothPrinter.js` conforme o manual do modelo real usado na loja.
5. **Sem suporte a gaveta de dinheiro ou leitura de status detalhado da impressora** (papel acabando, tampa aberta) — o protocolo BLE simples usado aqui só envia dados, não lê o estado da impressora.

## Arquitetura recomendada para produção confiável

Para uma pastelaria que depende 100% da impressão para operar (fichas de retirada o dia todo), recomendamos evoluir em uma destas direções, em ordem de robustez:

### 1. App Android nativo (recomendado a médio prazo)
Um app Android pequeno (Kotlin/Java) usando a API nativa `BluetoothAdapter`/`BluetoothSocket` tem acesso completo e estável ao Bluetooth clássico (SPP) usado pela maioria das impressoras térmicas baratas — muito mais confiável que Web Bluetooth (que usa BLE). O app pode ser só uma "casca" (WebView) around o mesmo frontend React, com uma ponte JavaScript-Kotlin para a impressão. Tablets Android são baratos e comuns em balcões — esse é o caminho mais custo-benefício.

### 2. Aplicativo desktop para Windows (Electron ou similar)
Se o balcão usa PC/notebook com Windows, um pequeno wrapper Electron do mesmo frontend React ganha acesso a bibliotecas nativas de impressão (USB, serial, ou Bluetooth clássico via bibliotecas do SO), incluindo impressoras já instaladas como impressora do Windows — o caminho mais simples se a impressora já tiver driver Windows.

### 3. PWA com Web Bluetooth (o que está implementado agora)
Bom para validar o produto rapidamente e para lojas que usam Android/Chrome no balcão. Migre para as opções acima quando a operação precisar de 100% de confiabilidade.

### 4. Impressora de rede (Wi-Fi/Ethernet) como alternativa mais simples
Muitas impressoras térmicas também aceitam impressão via rede local (porta 9100/RAW ou IPP). Isso eliminaria a dependência do Bluetooth do navegador: o backend Node poderia enviar os comandos ESC/POS diretamente por um socket TCP para o IP da impressora — sem depender do navegador do atendente. É a opção mais simples de implementar a seguir, caso o modelo de impressora usado suporte rede.

## Comandos ESC/POS gerados

O arquivo `frontend/src/lib/bluetoothPrinter.js` monta a ficha completa em ESC/POS: inicialização, alinhamento, negrito, fonte grande para a senha, corte de papel ao final. A função `montarComandosFicha()` pode ser reaproveitada em qualquer uma das arquiteturas acima — só muda o "transporte" (Bluetooth do navegador, socket Kotlin, socket TCP, etc.), a lógica de montagem do ticket continua a mesma.

## Configuração de bobina

A tela **Impressora** permite escolher entre 58mm e 80mm — isso ajusta a quantidade de colunas de texto usada ao montar a ficha (32 colunas para 58mm, 42 para 80mm, aproximadamente). Ajuste fino de fonte/margens deve ser validado no papel real da impressora usada.
