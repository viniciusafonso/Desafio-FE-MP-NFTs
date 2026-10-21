import { chromium, expect, test } from '@playwright/test'
import { resolve } from 'node:path'
import { addEmeraldToCart, login, resetSimulation } from './support'

test('zoom nativo de 200% preserva navegação, formulários e compra', async ({ baseURL }, info) => {
  const extension = resolve('e2e/fixtures/zoom-extension')
  const width = info.project.name.includes('mobile') ? 780 : 1440
  const context = await chromium.launchPersistentContext('', {
    baseURL, channel: 'chromium', headless: true, viewport: { width, height: 1000 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  })
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
    const page = await context.newPage()
    await page.goto(baseURL!)
    await worker.evaluate(async (origin) => {
      // Chrome extension APIs não fazem parte dos tipos DOM do aplicativo.
      const browser = (globalThis as unknown as { chrome: { tabs: {
        query: (query: object) => Promise<{ id: number; url?: string }[]>
        setZoom: (id: number, factor: number) => Promise<void>
      } } }).chrome
      const tabs = await browser.tabs.query({})
      const tab = tabs.find((entry) => entry.url?.startsWith(origin))
      if (!tab) throw new Error('Aba de teste não encontrada.')
      await browser.tabs.setZoom(tab.id, 2)
    }, baseURL!)
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width / 2)
    await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(2)
    await resetSimulation(page)
    async function fits() {
      await expect(page.locator('.skeleton:visible')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    }
    await fits()
    await page.getByRole('button', { name: 'Filtros do catálogo' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Filtros do catálogo' })).toBeFocused()
    await addEmeraldToCart(page)
    await fits()
    await page.goto(`${baseURL}/cart`)
    await expect(page.locator('[data-cart-status="ready"]:visible')).toBeVisible()
    await fits()
    await login(page)
    for (const route of ['/profile', '/wallets', '/checkout']) {
      await page.goto(`${baseURL}${route}`)
      await expect(page.locator('main')).toBeVisible()
      await fits()
    }
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page).toHaveURL(/\/orders\//)
    await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible()
    await fits()
  } finally {
    await context.close()
  }
})
