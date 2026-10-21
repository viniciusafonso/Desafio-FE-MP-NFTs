# Acompanhamento da revisão — 21/10/2026

A revisão original é histórica. As observações de validação, ordenação e retorno do cadastro foram convertidas em verificações do comportamento corrigido.

## Correções implementadas

- Perfil e carteiras: interface e REST validam os campos obrigatórios marcados, e-mail e ENS; erros associados aos controles e foco no campo inválido.
- Catálogo: contagens fornecidas pela API; seleção coerente com a URL; aba desktop de lançamentos altera a ordenação; Golden Frequency usa a arte dourada correspondente.
- Mobile: o botão de filtros existente abre coleção, preço e rede; a rolagem carrega próximas páginas sem barra de paginação. Refresh restaura os itens acumulados. A abertura do detalhe não pode ser cancelada por uma navegação automática de página.
- Tempo real: eventos invalidam listagens para recompor filtros, ordenação e paginação. Reconexão refaz catálogo, detalhe e dados privados. Testes interrompem o socket enquanto o pedido ou NFT muda e verificam recuperação pela API.
- Falha de transporte: cenário sem resposta HTTP e recuperação por nova tentativa.
- Cadastro: preserva o retorno ao checkout. O diálogo desktop contém o foco e fecha por Escape; no mobile a autenticação é uma página.
- Performance: mocks de socket carregados sob demanda; bundle oficial de navegador de tldts evita tabelas duplicadas; fontes locais com preload; composição desktop não é montada no mobile.
- Lighthouse: perfil desktop oficial, três execuções por combinação e relatórios HTML/JSON.

## Validação

Build, TypeScript e lint passaram. Suíte completa Chromium desktop/mobile: 100 testes aprovados, 12 não aplicáveis ao formato e nenhuma falha. A captura de início mobile foi inspecionada e sua referência atualizada para a fonte e a arte corrigidas.

## Limites e pendências

- Performance mobile continua abaixo da meta 90: medianas finais 80 no início e 82 no detalhe. Desktop: 97 em ambas. Acessibilidade 97/100 desktop e 100 mobile; Boas práticas e SEO 100 nas quatro combinações. Consulte os relatórios completos na pasta `audits`.
- A regressão visual verifica estabilidade; não comprova igualdade de todos os pixels com o Figma. Há diferenças de composição e textos nas fixtures secundárias que não foram inventados para preencher conteúdo ausente.
- Navegadores exercitados: Chromium. Zoom nativo de 200%, Safari e Firefox ainda não foram comprovados.
- Repositório público criado: https://github.com/viniciusafonso/Desafio-FE-MP-NFTs. Estado de envio e publicação descrito no README principal.
