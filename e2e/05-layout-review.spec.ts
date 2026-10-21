import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { resetSimulation, login, connectPrimaryWallet } from './support'

test('revisa os 15 frames com dados REST e sem estouro horizontal', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const mobile = testInfo.project.name.includes('mobile')
  await page.setViewportSize(mobile ? { width: 414, height: 896 } : { width: 1440, height: 1080 })
  const directory = resolve('audits/visual/current', mobile ? 'mobile' : 'desktop')
  await mkdir(directory, { recursive: true })
  await resetSimulation(page)

  async function capture(name: string) {
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    const metrics = await page.evaluate(() => ({ landmarks: [...document.querySelectorAll('h1,h2,footer,header,main')].filter((element) => element.getBoundingClientRect().width > 0).map((element) => ({ tag: element.tagName, text: element.textContent?.slice(0, 60), y: element.getBoundingClientRect().y + scrollY, height: element.getBoundingClientRect().height })), height: document.documentElement.scrollHeight, width: innerWidth,
      elements: ['body', '.kurio-home', '.kurio-auth', 'h1', 'p', 'input', 'label'].map((selector) => { const element = document.querySelector(selector); if (!element) return { selector }; const style = getComputedStyle(element); return { selector, family: style.fontFamily, weight: style.fontWeight, size: style.fontSize, height: element.getBoundingClientRect().height }; }) }))
    await writeFile(resolve(directory, `${name}.json`), JSON.stringify(metrics, null, 2))
    await page.screenshot({ path: resolve(directory, `${name}.png`), fullPage: !mobile, animations: 'disabled' })
  }
  async function visit(path: string, name: string) {
    await page.goto(path)
    await expect(page.locator('.kurio-home, .kurio-auth').first()).toBeVisible()
    await expect(page.locator('h1:visible').first()).toBeVisible()
    await expect(page.locator('.skeleton:visible')).toHaveCount(0)
    await capture(name)
  }
  await capture('inicio')
  await visit('/nfts/nft_beija_flor', 'detalhe')
  await visit('/login', 'login')
  await visit('/register', 'cadastro')
  await login(page)
  if (!mobile) {
    await visit('/profile', 'perfil')
    await visit('/wallets', 'carteiras')
  }
  await page.evaluate(async (isMobile) => {
    const token = localStorage.getItem('greenmint.session-token')
    const ids = ['nft_beija_flor', 'nft_dossel_noturno', 'nft_garca_parada', ...(isMobile ? ['nft_rio_sem_margem'] : [])]
    for (const nftId of ids) {
      const nft = await fetch(`/api/nfts/${nftId}`).then((response) => response.json())
      const edition = nft.editions.find((item: { name: string }) => item.name === '1/50') ?? nft.editions[0]
      const response = await fetch('/api/cart/items', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ nftId, editionId: edition.id, quantity: 2 }),
      })
      if (!response.ok) throw new Error(`Falha ao preparar carrinho: ${response.status}`)
    }
  }, mobile)
  await visit('/cart', 'carrinho')
  await visit('/checkout', 'pagamento')
  if (!mobile) {
    await connectPrimaryWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
    await capture('confirmacao')
    const collector = await page.evaluate(async () => { const token = localStorage.getItem('greenmint.session-token'); const receipt = await fetch(`/api/orders/${location.pathname.split('/').pop()}`, { headers: { authorization: `Bearer ${token}` } }).then((response) => response.json()); return receipt.collector })
    expect(collector.provider).toBe('Coinbase Wallet')
  }
})

test('mobile mantém o carrinho ao lado da compra após adicionar', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))
  await page.setViewportSize({ width: 414, height: 896 })
  await resetSimulation(page)
  await page.goto('/nfts/nft_beija_flor')
  const buy = page.getByRole('button', { name: 'Comprar NFT', exact: true })
  const cart = page.getByRole('link', { name: 'Carrinho', exact: true })
  const response = page.waitForResponse((result) => result.url().endsWith('/api/cart/items') && result.request().method() === 'POST')
  await buy.click()
  expect((await response).ok()).toBe(true)
  await expect(page.getByRole('status')).toContainText('Obra adicionada ao carrinho.')
  const buyBox = await buy.boundingBox()
  const cartBox = await cart.boundingBox()
  expect(buyBox).not.toBeNull()
  expect(cartBox).not.toBeNull()
  expect(cartBox!.x - buyBox!.x - buyBox!.width).toBe(12)
  expect(cartBox!.y).toBe(buyBox!.y)
  await expect(page.getByRole('link', { name: 'Ver carrinho', exact: true })).toHaveCount(0)
})


test('desktop mantém Comprar e Favoritar na mesma posição após adicionar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Verificação da barra de compra desktop.')
  await resetSimulation(page)
  await page.goto('/nfts/sage-nomad-009')
  await page.getByRole('button', { name: 'Aumentar quantidade', exact: true }).filter({ visible: true }).click()
  const buy = page.getByRole('button', { name: 'COMPRAR', exact: true })
  const favorite = page.getByRole('button', { name: 'Favoritar', exact: true }).filter({ visible: true })
  const beforeBuy = await buy.boundingBox()
  const beforeFavorite = await favorite.boundingBox()
  await buy.click()
  await expect(page.getByRole('status')).toContainText('Obra adicionada ao carrinho.')
  await expect(page.getByRole('link', { name: 'Ver carrinho', exact: true })).toBeVisible()
  expect(await buy.boundingBox()).toEqual(beforeBuy)
  expect(await favorite.boundingBox()).toEqual(beforeFavorite)
})


test('Mercado abre o catálogo pelo menu do carrinho e permite repetir o clique', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await resetSimulation(page)
  await page.goto('/cart')
  await page.getByRole('link', { name: 'Mercado', exact: true }).click()
  await expect(page).toHaveURL('/#mercado')
  await expect.poll(() => page.locator('#mercado').evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('link', { name: 'Mercado', exact: true }).click()
  await expect.poll(() => page.locator('#mercado').evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(2)
})


test('lupa alterna busca e mantém formulário afastado da linha do cabeçalho', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await resetSimulation(page)
  await page.goto('/cart')
  const toggle = page.locator('button[aria-controls="catalog-search-panel"]')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  const panel = page.locator('#catalog-search-panel')
  await expect(panel).toBeVisible()
  const gap = await panel.evaluate((element) => {
    const button = element.querySelector('button')!.getBoundingClientRect()
    const input = element.querySelector('input')!.getBoundingClientRect()
    return { below: element.nextElementSibling!.getBoundingClientRect().top - button.bottom, aligned: button.top === input.top && button.height === input.height }
  })
  expect(gap.below).toBeGreaterThanOrEqual(16)
  expect(gap.aligned).toBe(true)
  await toggle.click()
  await expect(panel).toHaveCount(0)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})
