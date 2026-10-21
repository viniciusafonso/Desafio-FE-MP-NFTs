import { selectCheckoutWallet, fillCheckoutCollector } from './support'
import { expect, test, type Page } from '@playwright/test'
import { addEmeraldToCart, connectPrimaryWallet, login, resetSimulation, setScenario } from './support'

async function prepareCheckout(page: Page) {
  await login(page)
  await addEmeraldToCart(page)
  await page.goto('/checkout')
  await expect(page.locator('[data-checkout-status="ready"]:visible')).toBeVisible()
  await fillCheckoutCollector(page)
}

test.beforeEach(async ({ page }) => {
  await resetSimulation(page)
})

test.describe('07 · validação e conexão no pagamento', () => {
  test('Confirmar compra conecta antes de enviar e impede cliques repetidos', async ({ page }) => {
    await prepareCheckout(page)
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && /\/api\/(wallets\/[^/]+\/connection|orders)$/.test(new URL(request.url()).pathname)) requests.push(new URL(request.url()).pathname)
    })
    await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toHaveCount(0)
    const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true }).filter({ visible: true })
    await expect(confirm).toBeEnabled()
    await confirm.evaluate((element) => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click() })
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
    expect(requests).toHaveLength(2)
    expect(requests[0]).toMatch(/\/connection$/)
    expect(requests[1]).toBe('/api/orders')
  })

  test('exige revisão se a rede mudar durante a conexão', async ({ page }) => {
    await prepareCheckout(page)
    let orders = 0
    page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') orders += 1 })
    await setScenario(page, 'slow')
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('button', { name: 'Conectando…', exact: true })).toBeDisabled()
    await page.getByRole('combobox', { name: 'Rede', exact: true }).filter({ visible: true }).selectOption('musgo')
    await expect(page.getByRole('alert')).toContainText('Os dados mudaram durante a conexão')
    expect(orders).toBe(0)
    await expect(page).toHaveURL('/checkout')
  })

  test('trata recusa de conexão sem fingir sucesso', async ({ page }) => {
    await prepareCheckout(page)
    let orders = 0
    page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') orders += 1 })
    await setScenario(page, 'wallet-refused')
    await selectCheckoutWallet(page, 'Principal')
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).filter({ visible: true }).click()
    await expect(page.getByRole('alert')).toContainText(/recus/i)
    await expect(page.locator('[data-wallet-status="disconnected"]')).toBeVisible()
    expect(orders).toBe(0)
    await setScenario(page, null)
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).filter({ visible: true }).click()
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
    expect(orders).toBe(1)
  })
})

test.describe('08 · cotação obsoleta e idempotência', () => {
  test('exige nova confirmação quando o preço muda', async ({ page }) => {
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    await setScenario(page, 'price-changed')
    await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/checkout')
    await expect(page.getByText(/cotação mudou/i).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aceitar a cotação atual' }).filter({ visible: true })).toBeVisible()
  })

  test('recupera a mesma tentativa após timeout sem criar outra compra', async ({ page }) => {
    test.slow()
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    await setScenario(page, 'payment-timeout')
    await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
    await expect(page.getByRole('button', { name: 'Recuperar o mesmo pedido' })).toBeVisible({ timeout: 10_000 })
    await setScenario(page, null)
    await page.getByRole('button', { name: 'Recuperar o mesmo pedido' }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.locator('[data-order-id]')).toHaveCount(1)
  })

  test('repete a mesma chave e recusa a chave reutilizada com outro corpo', async ({ page }) => {
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('greenmint.session-token')
      const headers = {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'idempotency-key': '11111111-1111-4111-8111-111111111111',
        'x-mock-scenario': 'payment-hold',
      }
      const [cart, quote, wallets] = await Promise.all([
        fetch('/api/cart', { headers }).then((response) => response.json()),
        fetch('/api/quote', { method: 'POST', headers }).then((response) => response.json()),
        fetch('/api/wallets', { headers }).then((response) => response.json()),
      ])
      const wallet = wallets.wallets.find((item: { role: string }) => item.role === 'primary')
      const body = {
        buyerName: 'Marina Costa',
        walletId: wallet.id,
        network: 'verde',
        quote: {
          subtotalEth: quote.subtotalEth,
          discountEth: quote.discountEth,
          networkFeeEth: quote.networkFeeEth,
          totalEth: quote.totalEth,
          couponCode: quote.coupon?.code ?? null,
          items: cart.items.map((item: {
            id: string
            nftId: string
            editionId: string
            unitPriceEth: string
            quantity: number
          }) => ({
            lineId: item.id,
            nftId: item.nftId,
            editionId: item.editionId,
            unitPriceEth: item.unitPriceEth,
            quantity: item.quantity,
          })),
        },
      }
      const first = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const firstOrder = await first.json()
      const repeated = await fetch('/api/orders', { method: 'POST', headers, body: JSON.stringify(body) })
      const repeatedOrder = await repeated.json()
      const conflict = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, buyerName: 'Outro nome' }),
      })
      const conflictBody = await conflict.json()
      return {
        firstStatus: first.status,
        repeatedStatus: repeated.status,
        sameOrder: firstOrder.id === repeatedOrder.id,
        conflictStatus: conflict.status,
        conflictCode: conflictBody.error?.code,
      }
    })

    expect(result).toEqual({
      firstStatus: 201,
      repeatedStatus: 200,
      sameOrder: true,
      conflictStatus: 409,
      conflictCode: 'idempotency_conflict',
    })
  })
})

test.describe('09 · estados do pedido e recibo', () => {
  test('só mostra confirmação depois do estado confirmed', async ({ page }) => {
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expect(page.locator('[data-transaction-ref]')).toBeVisible()
  })

  test('preserva nome, identidade e preço do card até o recibo', async ({ page }, testInfo) => {
    await login(page)
    const card = page.locator('[data-nft-id="nft_folha_de_vidro"]:visible')
    await card.getByRole('link').click()
    await expect(page).toHaveURL('/nfts/golden-signal-160')
    await expect(page.getByRole('heading', { name: 'Golden Signal #160', exact: true })).toBeVisible()
    await page.getByRole('button', { name: /comprar/i }).filter({ visible: true }).click()
    await expect(page.getByText('Obra adicionada ao carrinho.')).toBeVisible()
    await page.goto('/cart')
    await expect(page.locator('[data-cart-line]:visible')).toContainText('Golden Signal #160')
    await page.goto('/checkout')
    await expect(page.locator('[data-checkout-status="ready"]')).toBeVisible()
    if (!testInfo.project.name.includes('mobile')) {
      await expect(page.getByRole('heading', { name: 'Golden Signal #160', exact: true })).toBeVisible()
    }
    await connectPrimaryWallet(page)
    const created = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
    const response = await created
    const request = response.request().postDataJSON()
    expect(request.quote.items).toEqual([expect.objectContaining({ nftId: 'nft_folha_de_vidro', unitPriceEth: '0.39', quantity: 1 })])
    expect((await response.json()).items).toEqual([expect.objectContaining({ nftId: 'nft_folha_de_vidro', title: 'Golden Signal #160', unitPriceEth: '0.39' })])
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Golden Signal #160', exact: true })).toBeVisible()
    await page.evaluate(async () => {
      const response = await fetch('/api/simulation/nft-shift', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft_folha_de_vidro', editionId: 'nft_folha_de_vidro_aberta', priceEth: '9.99' }),
      })
      if (!response.ok) throw new Error('Não foi possível alterar o catálogo na simulação.')
    })
    await page.reload()
    const receipt = page.locator('[data-order-status="confirmed"]')
    await expect(receipt).toContainText('Golden Signal #160')
    await expect(receipt).toContainText('0.39 ETH')
    await expect(receipt).not.toContainText('9.99 ETH')
  })

  test('mantém o carrinho quando o pagamento é recusado', async ({ page }) => {
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    await setScenario(page, 'payment-refused')
    await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.locator('[data-order-status="refused"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.locator('[data-cart-status="ready"]:visible')).toBeVisible()
  })

  test('mantém pending sem exibir confirmação ou referência', async ({ page }) => {
    await prepareCheckout(page)
    await connectPrimaryWallet(page)
    await setScenario(page, 'payment-hold')
    await page.getByRole('button', { name: 'Confirmar compra' }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.locator('[data-order-status="pending"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pagamento em processamento' })).toBeVisible()
    await expect(page.locator('[data-transaction-ref]')).toHaveCount(0)
  })
})

test('recibo mantém divisórias e textos separados com apelido longo da carteira', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Verificação das quatro colunas desktop.')
  await prepareCheckout(page)
  await page.evaluate(async () => {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('greenmint.session-token')}` }
    const list = await fetch('/api/wallets', { headers }).then((response) => response.json())
    const wallet = list.wallets.find((item: { role: string }) => item.role === 'primary')
    const response = await fetch(`/api/wallets/${wallet.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...wallet, label: 'apelidocarteiraA-com-nome-muito-comprido' }) })
    if (!response.ok) throw new Error('Falha ao preparar carteira com nome longo')
  })
  await page.reload()
  await fillCheckoutCollector(page)
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).filter({ visible: true }).click()
  await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
  const metadata = page.locator('[data-receipt-metadata]')
  const columns = await metadata.locator(':scope > div').evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect()
    const heading = element.querySelector('dt')!.getBoundingClientRect()
    const value = element.querySelector('dd')!.getBoundingClientRect()
    return { left: box.left, right: box.right, headingRight: heading.right, valueRight: value.right, overflow: getComputedStyle(element.querySelector('dd')!).overflow }
  }))
  expect(columns).toHaveLength(4)
  columns.forEach((column, index) => {
    expect(column.headingRight).toBeLessThanOrEqual(column.right)
    expect(column.valueRight).toBeLessThanOrEqual(column.right)
    if (index < columns.length - 1) expect(column.right).toBeLessThanOrEqual(columns[index + 1].left)
    expect(column.overflow).toBe('hidden')
  })
  await page.screenshot({ path: 'audits/visual/current/desktop/receipt-long-wallet.png' })
})


test('checkout exige os campos com asterisco antes de conectar e a API recusa dados incompletos', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'O frame mobile não possui o formulário de colecionador.')
  await prepareCheckout(page)
  for (const id of ['username', 'profile-name', 'referral', 'ens']) await page.locator(`#checkout-${id}`).fill('')
  let connections = 0
  page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/connection')) connections += 1 })
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  for (const message of ['Informe o nome de usuário.', 'Informe o nome do perfil.', 'Informe o código de indicação.', 'Informe o nome ENS.']) await expect(page.getByRole('alert').filter({ hasText: message })).toBeVisible()
  expect(connections).toBe(0)
  await expect(page.locator('#checkout-username')).toBeFocused()
  await fillCheckoutCollector(page)
  await page.locator('#checkout-ens').fill('inválido!')
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Informe um nome ENS válido')
  expect(connections).toBe(0)
  await fillCheckoutCollector(page)
  await connectPrimaryWallet(page)
  const result = await page.evaluate(async () => {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('greenmint.session-token')}` }
    const cart = await fetch('/api/cart', { headers }).then((response) => response.json())
    const quote = await fetch('/api/quote', { method: 'POST', headers }).then((response) => response.json())
    const list = await fetch('/api/wallets', { headers }).then((response) => response.json())
    const wallet = list.wallets.find((item: { role: string }) => item.role === 'primary')
    const response = await fetch('/api/orders', { method: 'POST', headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ buyerName: 'Marina Costa', walletId: wallet.id, network: 'verde', collector: {}, quote: { ...quote, couponCode: quote.coupon?.code ?? null, items: cart.items.map((item: { id: string; nftId: string; editionId: string; unitPriceEth: string; quantity: number }) => ({ lineId: item.id, nftId: item.nftId, editionId: item.editionId, unitPriceEth: item.unitPriceEth, quantity: item.quantity })) } }) })
    return { status: response.status, body: await response.json() }
  })
  expect(result.status).toBe(422)
  expect(result.body.error.fields).toMatchObject({ username: expect.any(String), profileName: expect.any(String), referral: expect.any(String), ens: expect.any(String), email: expect.any(String), provider: expect.any(String) })
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
})
