import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { resetSimulation, login, addEmeraldToCart, connectPrimaryWallet, setScenario } from './support'

const directory = resolve('audits/readme-review')

test.beforeEach(async ({ page }) => {
  await mkdir(directory, { recursive: true })
  await resetSimulation(page)
})

test('auditoria observa campos marcados no perfil e nas carteiras', async ({ page }, info) => {
  await login(page)
  await page.goto('/profile')
  await page.locator('#profile-username').fill('')
  await page.locator('#profile-ens').fill('')
  await page.locator('#profile-wallet-label').fill('')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(3)
  const profileSaved = false
  await page.goto('/wallets')
  const form = page.locator('form[data-wallet-role="primary"]')
  await form.locator('input[id$="-display-name"]').fill('')
  await form.locator('input[id$="-profile-name"]').fill('')
  await form.locator('input[id$="-referral"]').fill('')
  await form.locator('input[type="email"]').fill('')
  await form.locator('input[id$="-ens"]').fill('')
  await form.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
  await expect(form.getByRole('alert')).toHaveCount(5)
  await writeFile(resolve(directory, `required-fields-${info.project.name}.json`), JSON.stringify({ profileAcceptedEmpty: [], profileSaved, walletAcceptedEmpty: [] }, null, 2))
  await page.screenshot({ path: resolve(directory, `wallet-required-fields-${info.project.name}.png`), fullPage: true })
})

test('auditoria compara catálogo ordenado após evento com a resposta REST', async ({ page }, info) => {
  await page.goto('/?sort=price-asc')
  await expect(page.locator('[data-nft-id="nft_folha_de_vidro"]:visible')).toBeVisible()
  const before = await page.locator('[data-nft-id]:visible').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-nft-id')))
  await page.waitForTimeout(1000)
  const shift = await page.evaluate(async () => {
    return (await fetch('/api/simulation/nft-shift', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nftId: 'nft_folha_de_vidro', editionId: 'nft_folha_de_vidro_aberta', priceEth: '9.99' }) })).status
  })
  expect(shift).toBe(204)
  await expect(page.locator('[data-nft-id="nft_folha_de_vidro"]:visible')).toHaveCount(0)
  const after = await page.locator('[data-nft-id]:visible').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-nft-id')))
  const rest = await page.evaluate(async () => { const response = await fetch('/api/nfts?sort=price-asc'); const body = await response.json(); return body.items.map((item: { id: string }) => item.id) })
  expect(after).toEqual(rest)
  await writeFile(resolve(directory, `realtime-sorting-${info.project.name}.json`), JSON.stringify({ before, after, rest, matchesREST: JSON.stringify(after) === JSON.stringify(rest) }, null, 2))
  await page.screenshot({ path: resolve(directory, `realtime-sorting-${info.project.name}.png`), fullPage: true })
})

test('auditoria inspeciona rotas privadas em 390, 768 e 1440 e rota inexistente', async ({ page }, info) => {
  test.setTimeout(60_000)
  test.skip(info.project.name.includes('mobile'), 'A execução desktop percorre as três larguras explicitamente.')
  await login(page)
  const measurements = []
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const path of ['/profile', '/wallets', '/checkout']) {
      await page.goto(path)
      const ready = path === '/profile' ? '[data-profile-status="ready"]' : path === '/wallets' ? '[data-wallets-status="ready"]' : '[data-checkout-status]'
      await expect(page.locator(ready)).toBeVisible()
      await expect(page.locator('.skeleton:visible')).toHaveCount(0)
      const measurement = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, inputs: [...document.querySelectorAll('input')].filter((element) => element.getBoundingClientRect().width > 0).length, headings: [...document.querySelectorAll('h1')].map((element) => element.textContent) }))
      measurements.push({ path, ...measurement })
      await page.screenshot({ path: resolve(directory, `${path.slice(1)}-${width}.png`), fullPage: true })
    }
  }
  await page.goto('/endereco-inexistente-auditoria')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await writeFile(resolve(directory, 'private-routes-breakpoints.json'), JSON.stringify(measurements, null, 2))
})


test('auditoria confirma recuperação do pedido pendente após refresh', async ({ page }, info) => {
  await login(page)
  await addEmeraldToCart(page)
  await page.goto('/checkout')
  await connectPrimaryWallet(page)
  await setScenario(page, 'payment-hold')
  let orderRequests = 0
  page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') orderRequests += 1 })
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.locator('[data-order-status="pending"]')).toBeVisible()
  const orderUrl = page.url()
  await page.reload()
  await expect(page.locator('[data-order-status="pending"]')).toBeVisible()
  await expect(page.locator('[data-transaction-ref]')).toHaveCount(0)
  await page.evaluate(async () => {
    const id = location.pathname.split('/').pop()
    const response = await fetch(`/api/simulation/orders/${id}/settle`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) })
    if (!response.ok) throw new Error('Falha ao concluir pedido pendente')
  })
  await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
  await expect(page).toHaveURL(orderUrl)
  expect(orderRequests).toBe(1)
  await writeFile(resolve(directory, `pending-refresh-${info.project.name}.json`), JSON.stringify({ recoveredPending: true, settledThroughSocket: true, orderRequests }, null, 2))
  await page.screenshot({ path: resolve(directory, `confirmed-${info.project.name}.png`), fullPage: true })
})

test('auditoria observa retorno ao cadastro iniciado pelo checkout', async ({ page }, info) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/login.*redirect/)
  const loginUrl = page.url()
  const desktop = info.project.name.includes('desktop')
  const signup = page.getByRole('link', { name: desktop ? 'Criar conta' : 'Crie uma conta', exact: true })
  await signup.click()
  await page.locator('#register-name').fill('Auditoria Kurio')
  await page.locator('#register-email').fill(`auditoria-${info.project.name}@kurio.test`)
  await page.locator('#register-password').fill('auditoria-kurio-123')
  await page.locator('#register-confirm-password').fill('auditoria-kurio-123')
  await page.getByRole('button', { name: desktop ? 'Criar conta' : 'Criar perfil', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  await writeFile(resolve(directory, `signup-return-${info.project.name}.json`), JSON.stringify({ loginUrl: new URL(loginUrl).pathname + new URL(loginUrl).search, returnedTo: new URL(page.url()).pathname, preservedCheckout: true }, null, 2))
})
