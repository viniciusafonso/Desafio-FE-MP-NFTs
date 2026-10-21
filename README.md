# Kurio

Marketplace de NFTs do desafio de Frontend da Jungle Gaming. A sessão, o catálogo, o carrinho, o pagamento simulado, o tempo real, o perfil e as carteiras funcionam sobre contratos REST tipados e uma simulação MSW persistente. As nove rotas usam a identidade visual Kurio e possuem composições desktop e mobile.

## Requisitos

- Node.js 24 ou superior
- npm 11

## Revisão dos 15 layouts

As capturas e relatórios de auditoria permanecem locais e não são enviados ao repositório público. Os resultados e limites estão em [docs/DELIVERY.md](docs/DELIVERY.md). Gere as capturas com `npx playwright test e2e/05-layout-review.spec.ts`.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
npm run test:e2e:report
npm run audit:lighthouse
```

O servidor de desenvolvimento sobe em `http://localhost:5173`.

A variável `VITE_API_BASE_URL` aponta o Axios para a API simulada. O padrão é `/api`. `VITE_ENABLE_MOCKS=false` desliga o MSW. No build de demonstração os mocks permanecem ligados.

## Credenciais fictícias

| Nome | E-mail | Senha |
| --- | --- | --- |
| Marina Costa | marina.costa@greenmint.test | marina-coleciona |
| Rafael Nunes | rafael.nunes@greenmint.test | rafael-coleciona |

A senha não é gravada em texto puro. A simulação guarda apenas o hash SHA-256. O token da sessão fica no `localStorage`, porque o mock roda no navegador e não há cookie `HttpOnly`.

## Simulação

Cenários, gravados em `localStorage` na chave `greenmint.mock-scenario`:

- `slow`: espera 1,2s antes da resposta
- `unavailable`: responde 503
- `network-failure`: falha de transporte sem resposta HTTP
- `session-expired`: a consulta da sessão e as rotas privadas respondem 401
- `register-conflict`: o cadastro responde 409
- `out-of-order`: a página 1 do catálogo demora 1,4s e as demais, 80ms
- `favorite-failure`: incluir ou remover favorito responde 500
- `wallet-refused`: conectar uma carteira responde 422
- `password-rejected`: a troca de senha recusa a senha atual, mesmo quando ela está correta
- `price-changed`: o primeiro envio do pedido altera o preço da primeira obra e pede nova confirmação
- `payment-refused`: o pedido nasce pendente e a simulação o recusa
- `payment-timeout`: a resposta do pedido demora 8s; a interface desiste em 2,5s e recupera a mesma tentativa
- `payment-hold`: o pedido permanece pendente até `POST /api/simulation/orders/:orderId/settle`

Para voltar ao comportamento normal, remova a chave. Para restaurar os colecionadores, o catálogo, os favoritos iniciais, as carteiras e esvaziar carrinhos e pedidos:

```js
await fetch('/api/simulation/reset', { method: 'POST' })
localStorage.removeItem('greenmint.session-token')
localStorage.removeItem('greenmint.mock-scenario')
location.reload()
```

## Sessão

Consultas privadas usam `meta.scope = 'private'`. Logout e sessão expirada removem essas consultas do cache, o token local e a tentativa de pedido. Perfil, carteiras, pagamento, pedido e favoritos exigem sessão. O carrinho do visitante continua público. O retorno depois do login preserva o endereço anterior.

## Catálogo

A listagem usa `GET /api/nfts` com `q`, `category` repetido, `minPrice`, `maxPrice`, `network`, `availability`, `sort`, `page`, `pageSize` e `favorites=1`. Esses parâmetros ficam na URL e são enviados pelo Axios. Os preços são strings decimais; filtros de preço usam comparação decimal exata na simulação.

As coleções usam os nomes do Figma: Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas e Utilidade. Categorias selecionadas compõem uma união; busca, preço, rede e disponibilidade restringem esse conjunto. A sidebar desktop combina coleções, faixa de preço e rede sem acrescentar um painel ao layout. Mudanças de filtro, busca ou ordenação reiniciam a página. A busca acompanha o termo da URL ao voltar e avançar no histórico.

O catálogo contém 36 registros: nove obras identificadas no Figma e 27 variantes adicionais de simulação, autorizadas para exercitar a paginação. As variantes conservam o nome da família, usam números de token distintos e reutilizam os arquivos de arte existentes. Têm datas anteriores às nove obras originais para manter a primeira página padrão. O grupo adicional mais recente pertence a Colecionáveis; os demais registros pertencem a Arte digital. Todos usam Ethereum. Coleções ou redes sem registros produzem o estado vazio. Os números entre parênteses vêm das facetas da API e representam a contagem global da base simulada. Nenhuma coleção aparece selecionada sem estar no filtro da URL.

A composição padrão tem nove itens por página e quatro páginas reais no desktop, com números 1 a 4, página corrente e seta para a próxima página. A última não oferece avanço para uma página inexistente. Filtros e busca recalculam o total de páginas e reiniciam a página corrente. O parâmetro opcional `pageSize=6` continua aceito pela URL/API, sem seletor adicional. O mobile mantém a busca e as abas desenhadas. O botão de filtro existente abre um diálogo com coleção, preço e rede. A rolagem carrega as páginas seguintes sem barra de paginação; o avanço também é acessível por teclado. O parâmetro page permite restaurar os itens acumulados após refresh.

Destaques vêm de `GET /api/highlights` e não seguem o filtro. Imagens usam os arquivos locais de `public/catalog`. `GET /api/nfts/:identificador` aceita tanto o ID estável quanto o slug do nome, por exemplo `emerald-ape-042`. Cards, miniaturas, coleção relacionada e links do carrinho usam o slug nas rotas. IDs antigos continuam válidos para URLs salvas e permanecem nos contratos de carrinho, favoritos, cotação, eventos e pedidos.

O detalhe devolve quatro entradas de galeria do mesmo NFT, reproduzindo as miniaturas repetidas do Figma com a arte exportada. Cada miniatura seleciona a imagem central sem trocar a rota ou a obra. A imagem central e a lupa abrem a ampliação em diálogo com Escape, foco contido e retorno ao controle acionado. Não há vistas alternativas exportadas; a mesma arte é reutilizada nos quatro slots.

O nome exibido é o `title` da API. A criação do pedido usa os IDs dos itens, não um título enviado pelo cliente: o MSW resolve cada obra e grava o nome, a imagem e os preços no snapshot do recibo. A confirmação preserva esse snapshot após alterações no catálogo. A revisão desktop de pagamento lista os nomes; o frame mobile de pagamento permanece com a composição original de carteiras e total, sem uma nova lista de itens.

Preços trafegam como string decimal em ETH. A quantidade é inteira e não passa do saldo da edição. Adicionar ao carrinho grava a seleção na simulação; a reserva do saldo acontece só ao criar o pedido.

## Carrinho e cotação

`GET /api/cart` devolve os itens e o cupom gravado. `POST /api/quote` devolve subtotal, desconto, taxa de rede e total. A interface mostra esses valores, sem recalcular o total no navegador.

`POST /api/cart/items` inclui uma edição. A mesma edição soma a quantidade, sem passar do saldo. `PATCH /api/cart/items/:lineId` altera a quantidade e `DELETE` remove o item. Acima do saldo, a resposta é 409.

O visitante usa o cabeçalho `x-guest-cart`. O identificador fica em `localStorage` na chave `greenmint.guest-cart-id`. No login ou no cadastro, `POST /api/cart/adopt` leva esses itens para a conta. Sair apaga o carrinho da conta no cache. Outro colecionador não vê esses itens.

Cupons, em maiúsculas:

- `ORVALHO`: 10% até 1º de janeiro de 2027
- `SECA`: expirado
- qualquer outro código: inválido

A taxa de rede da cotação é `0.002` ETH quando há itens. O carrinho vazio não cobra taxa. Remover o cupom é `DELETE /api/cart/coupon`. O botão do resumo usa “Conectar e finalizar” para visitantes e “Finalizar compra” para contas autenticadas. Isso leva à revisão do pagamento; entrar na conta não conecta uma carteira automaticamente. O avanço fica bloqueado durante atualizações ou falhas de cotação, e não é oferecido para carrinho vazio ou com problemas de disponibilidade. O checkout recupera a carteira e a rede já conectadas, inclusive após refresh. “Confirmar compra” valida os dados, simula a conexão quando necessária e só envia o pedido se ela funcionar. Recusa de conexão impede o envio e permite nova tentativa pelo mesmo botão. Cliques repetidos são bloqueados durante conexão e envio; alterações nos dados durante a conexão exigem nova confirmação. A cotação aceita e as validações continuam obrigatórias.

Enquanto o carrinho está aberto, o evento `nft.updated` atualiza preço e disponibilidade e a cotação é pedida de novo.

## Perfil

`GET /api/profile` devolve o nome, o e-mail, a marca e a data de entrada da conta autenticada. `PATCH /api/profile` grava nome, e-mail e marca. O e-mail de outra conta responde 409. O perfil aceita avatar PNG de até 2 MB e permite removê-lo. Nome de usuário, ENS e apelido da carteira também persistem via PATCH /api/profile. Os identificadores antigos de marca continuam aceitos por compatibilidade, mas não aparecem como escolhas na tela.

Os três campos de senha incluem controles independentes para mostrar/ocultar. O único botão “Salvar” grava o perfil e, quando algum campo de senha está preenchido, valida e envia também a alteração de senha. Campos de senha vazios não exigem alteração nem exibem erros. As mensagens de validação aparecem uma vez sob o campo correspondente.

A alteração do perfil aparece na hora no nome da sessão e volta atrás se a simulação recusar. Favoritos também atualizam na hora e desfazem a mudança quando a inclusão falha.

`POST /api/profile/password` troca a senha. A senha atual errada responde 422, assim como o cenário `password-rejected`. A nova senha tem no mínimo 8 caracteres e não repete a atual. A simulação substitui o hash e mantém a sessão aberta.

## Carteiras

Cada conta tem no máximo uma carteira principal e uma secundária. `POST /api/wallets` cadastra e `PATCH /api/wallets/:walletId` edita nome, endereço e função. O endereço é único entre contas e entre carteiras independentes. A opção “Igual à carteira principal” envia `sameAsPrimary: true` para a secundária: o MSW copia os dados da principal da própria conta, inclusive o endereço, e mantém o vínculo após refresh. Alterações da principal sincronizam a secundária vinculada. Enquanto marcada, os campos copiados ficam desabilitados; desmarcar permite preencher uma carteira independente. O checkbox e “Adicionar” ficam na mesma linha do título da secundária, conforme o Figma. O endereço aceita Ethereum 0x com 40 dígitos hexadecimais ou um nome .eth. Endereços gm1 antigos permanecem aceitos por compatibilidade. A rede exibida usa os nomes Ethereum e Polygon. Função já ocupada responde 409 `wallet_role_taken`. Endereço repetido sem o vínculo explícito responde 409 `address_taken`; a exceção nunca permite usar uma carteira de outra conta. A carteira de outra conta responde 404.

Marina Costa começa com Principal (`0xA91F00000000000000000000000000000000E82C`) e Reserva (`nova.kurio.eth`). Rafael Nunes começa com Principal (`0xB0020000000000000000000000000000000044B2`). Nenhuma começa conectada.

## Pagamento e pedido

`POST /api/wallets/:walletId/connection` com `{ "action": "connect", "network": "verde" }` ou `"musgo"` simula a conexão. `disconnect` solta a rede. Só uma carteira da conta fica conectada. Sem carteira, o pagamento aponta para o cadastro.

As redes são Ethereum e Polygon. A taxa continua a da cotação, independente da rede escolhida.

`POST /api/orders` exige sessão e o cabeçalho `Idempotency-Key` com um UUID. O corpo traz o nome do colecionador, a carteira, a rede e a cotação que o colecionador acabou de ver. A simulação recalcula preço, disponibilidade, cupom e taxas. Se algo divergir, a resposta é 409 `quote_stale` e nenhum pedido é criado. A mesma chave com o mesmo conteúdo devolve o pedido existente. A mesma chave com outro conteúdo responde 409 `idempotency_conflict`.

O pedido nasce `pending` e reserva o saldo. A confirmação remove do carrinho só as quantidades compradas. A recusa devolve o saldo e mantém o carrinho. Confirmado e recusado não mudam mais. O recibo guarda o snapshot: itens, preços, taxas, carteira, rede e, quando confirmado, a referência `gm_tx_…`. Não há explorador externo.

`GET /api/orders/:orderId` devolve o pedido do colecionador autenticado. O pedido de outra conta responde 404. Um pedido pendente da mesma conta impede um segundo envio até a conclusão.

Há um pedido em processamento por conta. `POST /api/simulation/nft-shift` altera preço ou saldo de uma edição e publica `nft.updated`. O corpo pode repetir o mesmo evento (`duplicate: true`) ou enviar em seguida uma versão mais antiga (`stalePriceEth`), que o cliente ignora. `POST /api/simulation/orders/:orderId/settle` conclui um pedido que ficou parado no cenário `payment-hold`.

A criação do pedido desiste em 2,5s. No cenário `payment-timeout` a simulação só responde depois de 8s, mas o pedido já existe: o botão “Recuperar o mesmo pedido” reenvia a chave gravada em `sessionStorage`.

## Tempo real

O cliente usa `socket.io-client` no namespace padrão, só com transporte WebSocket. O MSW intercepta a conexão com `@mswjs/socket.io-binding` 0.2.0 (`toSocketIo`). Limitações desse binding: namespace padrão, eventos em texto, sem acknowledgement, sem salas e sem broadcast nativo. O mock envia cada evento aos clientes ligados e responde ao ping do Engine.IO para a sessão não cair.

| Evento | Conteúdo |
| --- | --- |
| `nft.updated` | `eventId`, `resourceId`, `version` e as edições com preço e saldo |
| `order.updated` | `eventId`, `resourceId`, `version` e o recibo |

`order.updated` só é entregue ao socket que anunciou o token daquela conta, no evento `session.bind`. O cliente descarta evento repetido ou com versão menor ou igual à já aplicada. Ao reconectar, catálogo, destaques, detalhe, carrinho, cotação e pedido aberto são pedidos de novo à API. Mudanças de NFT invalidam a listagem para recalcular ordenação, filtros e páginas. Logout limpa a tentativa, as versões de pedido e as consultas privadas.

No checkout, uma cotação nova precisa ser aceita de novo antes de confirmar a compra. A confirmação visual do pedido só aparece quando o status é `confirmed`.

Favoritos: `GET /api/favorites`, `POST /api/favorites` com `{ nftId }` e `DELETE /api/favorites/:nftId`. A inclusão some na hora e volta atrás se a simulação falhar. Marina Costa começa com Golden Signal #160 e Golden Beat #207. Rafael Nunes começa com Violet Nomad #314.

Cada card do início usa o PNG de `public/catalog` com o id da obra. As nove obras da primeira vitrine do frame usam o nome e o preço do Figma, e o retrato correspondente gravado nesse arquivo. O hero, as chamadas e o diário usam os retratos de `public/figma`. Os ícones são os SVG de `public/icons`.

Consultas em geral ficam frescas por 30 segundos, tentam de novo uma vez e não refazem a busca ao focar a janela. A consulta da sessão não tenta de novo. Mutations não são repetidas.

## Organização

- `src/app`: providers, cache do TanStack Query e casca temporária das rotas
- `src/routes`: rotas do TanStack Router
- `src/features`: catálogo, conta, perfil, carteiras, carrinho e checkout
- `src/components/ui`: componentes do shadcn/ui
- `src/api`: Axios, contratos e chamadas de sessão, perfil, catálogo, carrinho, carteiras e pedidos
- `src/realtime`: cliente Socket.IO, versões dos eventos e avisos
- `src/mocks`: handlers, fixtures, pedidos e estado do MSW
- `e2e`: Playwright
- `audits`: Lighthouse

Decisões, fronteiras das camadas, estado, idempotência, tempo real e estratégia de testes estão em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Qualidade

A última execução Playwright terminou com 100 testes aprovados e 12 não aplicáveis ao formato de tela, sem falhas. A suíte cobre 12 grupos e verificações adicionais em Chromium, nos projetos desktop (1440×1000) e mobile (390×844). Cada teste recebe um contexto isolado e restaura a base simulada. O relatório HTML, traces, vídeos e screenshots de falha ficam fora do código-fonte. A regressão visual cobre início, detalhe, carrinho e pagamento. As imagens de referência permanecem locais: numa instalação nova, gere-as com `npm run test:e2e:update` antes da comparação. Os testes funcionais não dependem dessas capturas.

`npm run audit:lighthouse` executa início e detalhe, desktop e mobile, três vezes por combinação. Os relatórios completos HTML e JSON e as medianas de Performance, Acessibilidade, Boas práticas, SEO, LCP, CLS e TBT são gravados em `audits`. Os números são produzidos pela execução local e não são preenchidos manualmente.

## Publicação

`vercel.json` reescreve rotas desconhecidas para `index.html`, para o refresh direto funcionar na Vercel. O repositório público é [viniciusafonso/Desafio-FE-MP-NFTs](https://github.com/viniciusafonso/Desafio-FE-MP-NFTs). A publicação do site ainda está em preparação.

### Campos do pagamento

O formulário desktop valida os campos com asterisco: nome de exibição, nome de usuário, rede, perfil, carteira cadastrada, tipo de carteira, indicação, e-mail da sessão e ENS. Usuário, perfil e indicação não podem ficar vazios; ENS deve conter um nome válido terminado em `.eth`. Carteira secundária e observação permanecem opcionais. A API usa o mesmo validador para o objeto `collector`, quando enviado, e devolve erros 422 por campo. O frame mobile não possui esse formulário e envia a compra com a identidade da sessão e a carteira selecionada, sem `collector`; não foram adicionados campos ao layout mobile.

### Validação e interrupções

Perfil exige nome, e-mail, usuário, ENS e apelido da carteira. Carteiras independentes exigem os campos marcados no Figma, incluindo perfil, indicação, e-mail e ENS. Interface e handlers REST compartilham as validações e associam erros aos campos.

`POST /api/simulation/realtime-outage` com `{ "durationMs": 1500 }` interrompe os sockets existentes e recusa reconexões durante esse intervalo. Os testes concluem um pedido ou alteram um NFT durante a interrupção e verificam a recuperação via REST depois da reconexão.

O Lighthouse usa o perfil desktop oficial e o perfil mobile padrão, mantendo as metas do desafio. A meta de Performance mobile ainda não foi atingida; consulte os relatórios em `audits` antes de considerar a entrega concluída.
