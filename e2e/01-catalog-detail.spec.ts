import { expect, test } from '@playwright/test'
import { resetSimulation, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetSimulation(page)
})

test.describe('01 · catálogo, URL e breakpoints', () => {
  test('mantém busca, ordenação e página na URL após recarregar', async ({ page }) => {
    await page.goto('/?q=Golden&sort=price-asc&page=2')
    await expect(page).toHaveURL(/q=Golden/)
    await page.reload()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page).toHaveURL(/page=2/)

    await page.goto('/?page=3')
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.getByLabel('Ordenar por', { exact: true }).filter({ visible: true }).selectOption('title')
      await expect(page).toHaveURL(/sort=title/)
      await expect(page).not.toHaveURL(/page=3/)
    }
  })

  test('pagina no desktop e restaura itens pelo histórico e refresh', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'O frame mobile não possui paginação.')
    const cards = page.locator('[data-nft-id]:visible')
    const pagination = page.getByRole('navigation', { name: 'Paginação do catálogo' }).filter({ visible: true })
    await expect(cards).toHaveCount(9)
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('1')
    await expect(pagination.getByRole('link', { name: '4', exact: true })).toBeVisible()
    await pagination.getByRole('link', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(cards).toHaveCount(9)
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_golden_frequency_1071')
    await page.reload()
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_golden_frequency_1071')
    await page.goBack()
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_beija_flor')
    await page.goForward()
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_golden_frequency_1071')
    await pagination.getByRole('link', { name: '4', exact: true }).click()
    await expect(page).toHaveURL(/page=4/)
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_golden_frequency_3071')
    await expect(pagination.getByRole('link', { name: 'Próxima página' })).toHaveCount(0)
    await cards.nth(0).getByRole('link').click()
    await expect(page).toHaveURL('/nfts/golden-frequency-3071')
    await expect(page.getByRole('heading', { name: 'Golden Frequency #3071', exact: true })).toBeVisible()
  })

  test('combina os filtros desenhados de coleção, preço, rede e busca', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'A sidebar de filtros pertence ao desktop.')
    await page.goto('/?pageSize=6&page=2')
    await page.getByRole('button', { name: 'Buscar', exact: true }).filter({ visible: true }).click()
    const search = page.getByRole('textbox', { name: 'Buscar', exact: true }).filter({ visible: true })
    await search.fill('Golden')
    await search.press('Enter')
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.locator('[data-nft-id]:visible')).toHaveCount(6)
    await page.getByRole('button', { name: 'Arte digital (27)', exact: true }).click()
    await page.getByRole('button', { name: 'Colecionáveis (9)', exact: true }).click()
    await page.getByRole('button', { name: 'Ethereum (36)', exact: true }).click()
    const minimum = page.getByRole('slider', { name: 'Preço mínimo', exact: true })
    await minimum.focus()
    await minimum.press('Home')
    for (let index = 0; index < 4; index += 1) await minimum.press('ArrowRight')
    const filteredResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname === '/api/nfts' && url.searchParams.get('minPrice') === '0.06'
    })
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
    const response = await filteredResponse
    const params = new URL(response.url()).searchParams
    expect(params.get('q')).toBe('Golden')
    expect(params.getAll('category').sort()).toEqual(['arte-digital', 'colecionaveis'])
    expect(params.get('network')).toBe('ethereum')
    expect((await response.json()).items).toHaveLength(6)
    await page.getByLabel('Ordenar por', { exact: true }).filter({ visible: true }).selectOption('price-asc')
    const cards = page.locator('[data-nft-id]:visible')
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_folha_de_vidro')
    await page.reload()
    await expect(search).toHaveValue('Golden')
    await expect(page.getByRole('button', { name: 'Arte digital (27)', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(minimum).toHaveValue('0.06')
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price-asc/)
    await page.goForward()
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_folha_de_vidro')
    await page.getByRole('button', { name: 'Polygon (0)', exact: true }).click()
    await expect(page.getByText('Nenhuma obra corresponde a essa busca.').filter({ visible: true })).toBeVisible()
    await page.getByRole('button', { name: 'Polygon (0)', exact: true }).click()
    await expect(cards).toHaveCount(6)
  })

  test('restaura busca e ordenação pela URL sem adicionar controles mobile', async ({ page }, testInfo) => {
    await page.goto('/?q=Golden&sort=price-desc')
    const cards = page.locator('[data-nft-id]:visible')
    await expect(cards).toHaveCount(9)
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_rio_sem_margem')
    await expect(cards.nth(8)).toHaveAttribute('data-nft-id', 'nft_folha_de_vidro')
    await page.goto('/?q=Emerald')
    await expect(cards).toHaveCount(4)
    await page.goBack()
    await expect(page.getByRole('textbox', { name: 'Buscar', exact: true }).filter({ visible: true })).toHaveValue('Golden')
    await expect(cards.nth(0)).toHaveAttribute('data-nft-id', 'nft_rio_sem_margem')
    if (testInfo.project.name.includes('mobile')) {
      await expect(page.getByLabel('Ordenar por').filter({ visible: true })).toHaveCount(0)
      await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' }).filter({ visible: true })).toHaveCount(0)
      await expect(page.locator('summary').filter({ hasText: 'Filtros' }).filter({ visible: true })).toHaveCount(0)
    }
  })

  test('cada card abre a própria obra por uma URL com o nome do Figma', async ({ page }) => {
    const works = [
      ['nft_beija_flor', 'Emerald Ape #042', 'emerald-ape-042'],
      ['nft_eco_laranja', 'Sage Nomad #009', 'sage-nomad-009'],
      ['nft_cipo_lento', 'Neon Vessel #552', 'neon-vessel-552'],
      ['nft_raiz_aberta', 'Cosmic Bloom #118', 'cosmic-bloom-118'],
      ['nft_dossel_noturno', 'Violet Nomad #314', 'violet-nomad-314'],
      ['nft_garca_parada', 'Ivory Baron #088', 'ivory-baron-088'],
      ['nft_rio_sem_margem', 'Golden Beat #207', 'golden-beat-207'],
      ['nft_folha_de_vidro', 'Golden Signal #160', 'golden-signal-160'],
      ['nft_golden_frequency_071', 'Golden Frequency #071', 'golden-frequency-071'],
    ]
    for (const [id, title, slug] of works) {
      await page.goto('/')
      const card = page.locator(`[data-nft-id="${id}"]:visible`)
      const artwork = await card.locator('img').getAttribute('src')
      await card.getByRole('link').click()
      await expect(page).toHaveURL(`/nfts/${slug}`)
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      await expect(page.getByAltText(title, { exact: false }).filter({ visible: true }).first()).toHaveAttribute('src', artwork!)
      await page.reload()
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    }
  })

  test('renderiza sem estouro horizontal em 390, 768 e 1440', async ({ page }) => {
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await expect(page.locator('[data-nft-id="nft_beija_flor"]:visible').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
    }
  })
})

test.describe('02 · estados vazio, erro e respostas fora de ordem', () => {
  test('exibe vazio sem criar obras fictícias', async ({ page }) => {
    await page.goto('/?q=obra-que-nao-existe')
    await expect(page.getByText('Nenhuma obra corresponde a essa busca.').filter({ visible: true })).toBeVisible()
  })

  test('expõe o erro 503 e permite tentar novamente', async ({ page }) => {
    await setScenario(page, 'unavailable')
    await page.reload()
    await expect(page.getByRole('alert')).toContainText(/indisponível|carregar/i)
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  })

  test('a última navegação vence respostas fora de ordem', async ({ page }) => {
    await setScenario(page, 'out-of-order')
    await page.goto('/?pageSize=6&page=1')
    await page.goto('/?pageSize=6&page=2')
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('[data-nft-id="nft_folha_de_vidro"]:visible')).toBeVisible()
    await expect(page.locator('[data-nft-id="nft_beija_flor"]:visible')).toHaveCount(0)
  })
})

test.describe('03 · detalhe, acesso direto e limites', () => {
  test('abre diretamente, seleciona edição real e limita a quantidade', async ({ page }) => {
    await page.goto('/nfts/nft_beija_flor')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.locator('[data-selected-edition="nft_beija_flor_50"]:visible')).toBeVisible()
    const increase = page.getByRole('button', { name: 'Aumentar quantidade' }).filter({ visible: true })
    for (let index = 1; index < 50; index += 1) {
      await increase.click()
    }
    await expect(increase).toBeDisabled()
  })

  test('seleciona imagens do mesmo NFT e amplia por imagem ou lupa com foco correto', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), 'A galeria lateral e a lupa são do frame desktop.')
    await page.goto('/nfts/emerald-ape-042')
    const gallery = page.getByRole('group', { name: 'Imagens deste NFT' })
    const main = page.getByRole('button', { name: 'Ampliar imagem de Emerald Ape #042', exact: true })
    const thumbnails = gallery.getByRole('button')
    await expect(thumbnails).toHaveCount(4)
    for (let index = 0; index < 4; index += 1) {
      await thumbnails.nth(index).click()
      await expect(thumbnails.nth(index)).toHaveAttribute('aria-pressed', 'true')
      await expect(main).toHaveAttribute('data-gallery-main', `nft_beija_flor-vista-${index + 1}`)
      await expect(main.locator('img')).toHaveAttribute('src', '/catalog/emerald-ape-042.png')
      await expect(gallery.locator('img').nth(index)).toHaveAttribute('src', '/catalog/emerald-ape-042.png')
      await expect(page).toHaveURL('/nfts/emerald-ape-042')
    }
    await main.click()
    const dialog = page.getByRole('dialog', { name: 'Ampliação de Emerald Ape #042', exact: true })
    const close = dialog.getByRole('button', { name: 'Fechar a ampliação' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('img')).toHaveAttribute('src', '/catalog/emerald-ape-042.png')
    await expect(close).toBeFocused()
    await close.press('Tab')
    await expect(close).toBeFocused()
    await close.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(main).toBeFocused()
    const magnifier = page.getByRole('button', { name: 'Ampliar a obra', exact: true })
    await magnifier.click()
    await expect(dialog).toBeVisible()
    await close.click()
    await expect(dialog).toHaveCount(0)
    await expect(magnifier).toBeFocused()
  })

  test('informa 404 sem substituir por outra obra', async ({ page }) => {
    await page.goto('/nfts/inexistente')
    await expect(page.getByText(/não encontrad/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toHaveCount(0)
  })
})
