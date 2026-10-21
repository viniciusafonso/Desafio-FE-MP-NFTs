import { expect, type Page } from '@playwright/test'

export const collectors = {
  marina: {
    email: 'marina.costa@greenmint.test',
    password: 'marina-coleciona',
    name: 'Marina Costa',
  },
  rafael: {
    email: 'rafael.nunes@greenmint.test',
    password: 'rafael-coleciona',
    name: 'Rafael Nunes',
  },
} as const

export async function resetSimulation(page: Page) {
  await page.goto('/')
  await expect(page.locator('[data-nft-id="nft_beija_flor"]:visible').first()).toBeVisible()
  await page.evaluate(async () => {
    localStorage.removeItem('greenmint.session-token')
    localStorage.removeItem('greenmint.mock-scenario')
    localStorage.removeItem('greenmint.guest-cart-id')
    sessionStorage.clear()
    await fetch('/api/simulation/reset', { method: 'POST' })
  })
  await page.reload()
  await expect(page.locator('[data-nft-id="nft_beija_flor"]:visible').first()).toBeVisible()
}

export async function setScenario(page: Page, scenario: string | null) {
  await page.evaluate((value) => {
    if (value) {
      localStorage.setItem('greenmint.mock-scenario', value)
    } else {
      localStorage.removeItem('greenmint.mock-scenario')
    }
  }, scenario)
}

export async function login(
  page: Page,
  collector: (typeof collectors)[keyof typeof collectors] = collectors.marina,
) {
  await page.goto('/login')
  await page.locator('#login-email').fill(collector.email)
  await page.locator('#login-password').fill(collector.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('greenmint.session-token')))).toBe(true)
}

export async function addEmeraldToCart(page: Page, quantity = 1) {
  await page.goto('/nfts/nft_beija_flor')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: '1/50' }).click()
  for (let index = 1; index < quantity; index += 1) {
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  }
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('Obra adicionada ao carrinho.')).toBeVisible()
}

export async function connectPrimaryWallet(page: Page) {
  await fillCheckoutCollector(page)
  await selectCheckoutWallet(page, 'Principal')
  await connectSelectedWallet(page)
}

export async function selectCheckoutWallet(page: Page, label: string) {
  const select = page.locator('#checkout-wallet:visible')
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(select).toBeVisible()
    const value = await select.getByRole('option', { name: new RegExp(label) }).getAttribute('value')
    await select.selectOption(value!)
  } else {
    await page.getByRole('radio', { name: new RegExp(label) }).filter({ visible: true }).check()
  }
}

export async function connectSelectedWallet(page: Page) {
  await page.evaluate(async () => {
    const headers = { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('greenmint.session-token')}` }
    const selected = document.querySelector<HTMLInputElement>('input[name="wallet"]:checked, input[name="wallet-mobile"]:checked')?.value ?? document.querySelector<HTMLSelectElement>('#checkout-wallet')?.value
    const network = [...document.querySelectorAll<HTMLSelectElement>('select[aria-label="Rede"]')].find((element) => element.getBoundingClientRect().width > 0)?.value
    const response = await fetch(`/api/wallets/${selected}/connection`, { method: 'POST', headers, body: JSON.stringify({ action: 'connect', network }) })
    if (!response.ok) throw new Error('Falha ao preparar conexão da carteira')
  })
  await page.reload()
  await expect(page.locator('[data-wallet-status="connected"]:visible')).toBeVisible()
  await fillCheckoutCollector(page)
}

export async function fillCheckoutCollector(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) return
  await page.locator('#checkout-username').fill('marina.costa')
  await page.locator('#checkout-profile-name').fill('Marina Costa')
  await page.locator('#checkout-referral').fill('KURIO-MARINA')
  await page.locator('#checkout-ens').fill('marina')
}
