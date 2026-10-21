# Arquitetura da Kurio

## Escopo

A Kurio é uma SPA de marketplace de NFTs. Blockchain, carteira, pagamento e backend são simulados no navegador; nenhuma tela afirma executar uma transação real. O objetivo da simulação é conservar os mesmos limites de uma integração remota: contratos HTTP tipados, latência, falhas, persistência, autenticação, idempotência e eventos assíncronos.

## Camadas

1. `src/routes` declara as nove rotas com TanStack Router e protege as rotas privadas antes de renderizá-las.
2. `src/features` contém apresentação e coordenação de cada fluxo. Componentes não importam fixtures nem o banco simulado.
3. `src/api/contracts` é a fonte compartilhada de tipos, validações e regras puras, inclusive dinheiro decimal.
4. `src/api` encapsula Axios e os endpoints REST.
5. TanStack Query controla cache, invalidação, estados assíncronos e mutations otimistas.
6. `src/realtime` recebe eventos Socket.IO, descarta versões repetidas/antigas e reconcilia via REST.
7. `src/mocks` implementa os mesmos contratos na fronteira de rede com MSW e persiste o estado no IndexedDB.

O fluxo normal é:

```text
rota → feature → query/mutation → módulo API → Axios → MSW → IndexedDB
                                       ↑                    │
                                       └── Socket.IO ←──────┘
```

## Rotas e responsabilidades

- `/`: catálogo, busca, ordenação, paginação e recortes persistidos na URL.
- `/nfts/$nftId`: acesso direto ao NFT, edição, quantidade e favorito.
- `/cart`: carrinho público e cotação calculada pelo servidor simulado.
- `/checkout`: dados, carteira, rede, revisão e criação idempotente.
- `/orders/$orderId`: estado do pedido e recibo somente após confirmação.
- `/login`: sessão e adoção do carrinho visitante.
- `/register`: criação de conta e adoção do carrinho visitante.
- `/profile`: dados, avatar e alteração de senha.
- `/wallets`: cadastro e edição de carteira principal/secundária.

## Estado e persistência

- O IndexedDB `greenmint-simulation` mantém usuários, sessões, catálogo, favoritos, carrinhos, carteiras e pedidos.
- `POST /api/simulation/reset` recria uma base determinística para testes.
- O token fica em `localStorage` porque o mock está no navegador; uma API real usaria cookie seguro e `HttpOnly`.
- O carrinho visitante usa um identificador separado. Login e cadastro o adotam pelo endpoint `/api/cart/adopt`.
- A tentativa de pedido fica em `sessionStorage` para que um timeout reutilize a mesma chave.
- Estado privado do TanStack Query usa `meta.scope = 'private'` e é removido no logout ou na expiração.

## Carteira secundária igual à principal

`WalletDraft.sameAsPrimary` é uma opção explícita para a função secundária. O MSW resolve a principal pelo usuário autenticado, copia os campos no servidor e permite reutilizar o endereço somente nessa relação da própria conta. A flag persiste no IndexedDB e na resposta REST. Atualizar a principal sincroniza as secundárias vinculadas; o cliente reconcilia a lista após salvar. Endereços de outra conta e duplicatas independentes continuam recusados. Desmarcar a opção libera o formulário para cadastrar um endereço próprio.

## Dinheiro

Valores em ETH atravessam todos os contratos como strings decimais. `src/api/contracts/money.ts` converte para inteiros em escala de oito casas usando `bigint`; cálculos monetários não usam ponto flutuante. A interface nunca recalcula o resumo: subtotal, desconto, taxa e total vêm exclusivamente de `POST /api/quote`.

## Compra e idempotência

1. O carrinho não reserva estoque.
2. O checkout obtém uma cotação e exige aceitação da versão corrente. “Confirmar compra” valida os dados, conecta a carteira à rede se necessário e envia o pedido apenas após sucesso. Uma trava síncrona evita clique duplo antes do próximo render; alterações nos dados ou saída da tela durante a conexão cancelam o envio automático e exigem revisão. Falhas de conexão não criam pedidos.
3. `POST /api/orders` recebe `Idempotency-Key`, dados do comprador, carteira, rede e o snapshot da cotação.
4. O mock recalcula tudo. Divergência retorna `409 quote_stale`.
5. Mesma chave e mesmo corpo devolvem o pedido já criado; mesma chave com corpo diferente retorna `409 idempotency_conflict`.
6. O pedido nasce `pending` e reserva o estoque.
7. `confirmed` remove as quantidades do carrinho; `refused` devolve o estoque e conserva o carrinho.
8. Estados terminais não mudam. O recibo é um snapshot imutável.

Um timeout do cliente não significa falha da criação. A ação “Recuperar o mesmo pedido” repete a chave armazenada, evitando uma segunda compra.

## Tempo real

O cliente usa `socket.io-client` sobre WebSocket. O MSW fornece o outro lado com `@mswjs/socket.io-binding`.

- `nft.updated` carrega `eventId`, `resourceId`, `version`, preços e saldos.
- `order.updated` carrega os mesmos metadados e o recibo.
- `order.updated` é enviado apenas ao socket associado ao token em `session.bind`.
- O cliente registra a maior versão de cada recurso e ignora evento duplicado ou antigo.
- Após reconectar, a aplicação refaz catálogo, destaques, detalhe, carrinho, cotação e pedido aberto pela API. O evento é um sinal; REST continua sendo a fonte de verdade.
- Logout limpa tentativas, versões de pedido, cache privado e a identidade do socket.

## Falhas selecionáveis

A chave `greenmint.mock-scenario` ativa lentidão, indisponibilidade, falha de transporte, sessão expirada, conflito de cadastro, respostas fora de ordem, rollback de favorito, recusa de carteira, rejeição de senha, cotação obsoleta, pagamento recusado, timeout e pedido pendente. Esses cenários atravessam MSW; componentes e Axios não contêm respostas falsas.

## Catálogo, identidade e paginação

Os nove registros originais têm os nomes identificados no Figma. Para oferecer as quatro páginas desktop desenhadas, há 27 variantes simuladas das mesmas famílias, com tokens distintos e arte local reutilizada. Os originais pertencem a Arte digital; nove variantes pertencem a Colecionáveis. Todos usam Ethereum. As demais coleções e redes desenhadas são filtros válidos, com resultado vazio quando não há fixtures. O contrato mantém os identificadores internos para conservar carrinhos, favoritos e pedidos já salvos. A hidratação do IndexedDB sincroniza as categorias antigas sem apagar sessões ou transações.

As rotas públicas usam slugs legíveis derivados dos títulos. O endpoint de detalhe aceita slug ou ID; mutations e Socket.IO continuam usando o ID estável. Eventos atualizam caches de detalhe pelo ID do recurso armazenado, inclusive quando a chave da consulta é um slug. A troca entre obras remonta os seletores de edição para não carregar a seleção da obra anterior.

O checkout envia identidade e cotação, e o servidor simulado resolve o nome e salva o snapshot. Não se usa um nome fornecido pelo cliente como identidade da compra. Testes clicam nos nove cards e verificam nome, imagem, URL e refresh; uma compra de Golden Signal #160 verifica os IDs e o título da resposta, o recibo visível e sua conservação após mudança de preço no catálogo.

REST combina filtros antes de ordenar e paginar. Coleções são uma união; busca, faixa de preço, disponibilidade e rede são interseções. Os filtros usam a sidebar desktop desenhada e, no mobile, um diálogo acionado pelo botão de filtro existente. As contagens globais vêm de facetas REST. Não há seletor de quantidade por página ou barra de paginação no mobile.

O tamanho padrão de página é nove para manter a vitrine. As variantes têm datas anteriores aos originais e formam as páginas 2 a 4, sem alterar os primeiros nove cards. Os links desktop preservam os filtros; a última página não avança além dos dados. Empates de preço priorizam o registro mais recente. `pageSize=6` permanece aceito na URL/API. No mobile, a rolagem incrementa a página na URL e acumula consultas anteriores; um controle acessível por teclado permite o mesmo avanço. A ordem de cada página permanece estável durante a inclusão e o carregamento automático só navega enquanto o roteador estiver ocioso no catálogo.

## Interface

Roboto Mono, cores, raios e superfícies repetidas são variáveis CSS. Cabeçalho, rodapé, casca desktop, moldura mobile, controles de autenticação e navegação da conta são componentes compartilhados. Tailwind é usado para composição e medidas específicas de cada frame. Imagens do catálogo são referenciadas pelos contratos REST, não duplicadas nos componentes.

As ações editoriais ainda sem destino funcional informam explicitamente que não concluem uma ação. Google, Facebook e links externos simulados também não apresentam sucesso falso.

## Testes

`playwright.config.ts` executa Chromium em 1440×1000 e 390×844. Os testes são divididos em 12 grupos:

1. catálogo, URL e breakpoints;
2. vazio, erro e respostas fora de ordem;
3. detalhe, 404 e limites;
4. favoritos e rollback;
5. carrinho visitante e adoção;
6. cotação, cupom e dinheiro;
7. validação e conexão no checkout;
8. cotação obsoleta, timeout e idempotência;
9. estados do pedido e recibo;
10. sessão e troca de usuário;
11. perfil e carteiras;
12. tempo real e regressão visual.

Cada teste abre um contexto isolado e restaura a simulação. Casos exclusivos de uma composição são executados no projeto correspondente e marcados como não aplicáveis no outro formato; isso não representa um fluxo sem teste. Falhas preservam trace, screenshot e vídeo; o relatório HTML fica em `playwright-report`.

## Produção

`VITE_ENABLE_MOCKS=false` permite substituir a simulação por uma API real sem mudar componentes. `VITE_API_BASE_URL` altera a origem do Axios. `vercel.json` redireciona rotas desconhecidas para `index.html`, permitindo refresh direto da SPA. O deploy público está em https://desafio-fe-mp-nfts.vercel.app/.

## Verificação de reconexão

O endpoint de simulação `realtime-outage` fecha sockets ativos e recusa novas conexões por um intervalo limitado. Os testes alteram o recurso durante esse intervalo e verificam a recuperação REST na reconexão. O cliente de socket e os handlers do binding são carregados sob demanda, depois da configuração dos mocks HTTP.

## Carregamento e transições de sessão

O catálogo mobile reserva as dimensões dos cards com skeletons e shimmer, compartilhando a regra de movimento reduzido. Detalhe e resumo do carrinho também têm skeletons. O catálogo e o detalhe carregam suas composições desktop sob demanda; o diálogo de filtros mobile só é importado quando solicitado. Assim a versão mobile não monta componentes desktop ocultos nem dispara suas consultas de itens relacionados e destaques. Fontes, imagens, MSW e eventos continuam ativos em ambos os formatos.

Antes de substituir a identidade autenticada, login, cadastro e logout cancelam consultas privadas em andamento e removem seu cache. Isso impede que uma resposta anônima iniciada no fundo do diálogo repovoe o carrinho após login. A suíte verifica expiração e retomada no checkout, incluindo a presença do item retornado pela API.

As baselines são referências da implementação revisada; detectam regressões e não constituem uma medição automática de igualdade com o Figma. Capturas integrais do arquivo de design e auditorias intermediárias não fazem parte dos assets publicados.

O teste de zoom usa uma extensão mínima somente no perfil Chromium descartável para chamar `chrome.tabs.setZoom(2)`. Confirma a redução real da viewport CSS e o aumento de `devicePixelRatio`, exercita navegação, filtros, perfil, carteiras e compra até o recibo. A extensão não é incluída no build da aplicação.
