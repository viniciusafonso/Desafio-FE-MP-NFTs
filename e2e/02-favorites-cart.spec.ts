import { selectCheckoutWallet, connectSelectedWallet } from './support'
import { expect, test } from '@playwright/test'
import { addEmeraldToCart, login, resetSimulation, setScenario } from './support'

test.beforeEach(async ({ page }) => {
  await resetSimulation(page)
})

test.describe('04 · favoritos otimistas e rollback', () => {
  test('exige login e retorna ao detalhe', async ({ page }) => {
    await page.goto('/nfts/nft_beija_flor')
    await page.getByRole('button', { name: 'Favoritar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await page.locator('#login-email').fill('marina.costa@greenmint.test')
    await page.locator('#login-password').fill('marina-coleciona')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/nfts/nft_beija_flor')
  })

  test('desfaz a mudança otimista quando a API falha', async ({ page }) => {
    await login(page)
    await page.goto('/nfts/nft_beija_flor')
    await setScenario(page, 'favorite-failure')
    const favorite = page.getByRole('button', { name: 'Favoritar' })
    await favorite.click()
    await expect(page.getByRole('alert')).toContainText(/favorit/i)
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('05 · carrinho visitante e adoção no login', () => {
  test('preserva quantidade no refresh e adota o carrinho do visitante', async ({ page }) => {
    await addEmeraldToCart(page, 2)
    await page.goto('/cart')
    await expect(page.locator('[data-cart-status="ready"]:visible')).toBeVisible()
    await expect(page.locator('[data-line-quantity]:visible')).toHaveText('2')
    await page.reload()
    await expect(page.locator('[data-line-quantity]:visible')).toHaveText('2')

    await page.goto('/login?redirect=/cart')
    await page.locator('#login-email').fill('marina.costa@greenmint.test')
    await page.locator('#login-password').fill('marina-coleciona')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/cart')
    await expect(page.locator('[data-line-quantity]:visible')).toHaveText('2')
  })

  test('diferencia visitante e sessão autenticada e retoma a carteira e rede conectadas', async ({ page }) => {
    await addEmeraldToCart(page)
    await page.goto('/cart')
    await expect(page.getByRole('link', { name: 'Conectar e finalizar', exact: true }).filter({ visible: true })).toBeVisible()
    await login(page)
    await page.goto('/cart')
    await expect(page.getByRole('link', { name: 'Finalizar compra', exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Conectar e finalizar', exact: true }).filter({ visible: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Finalizar compra', exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/checkout')
    await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled()
    await selectCheckoutWallet(page, 'Reserva')
    await page.getByRole('combobox', { name: 'Rede', exact: true }).filter({ visible: true }).selectOption('musgo')
    await connectSelectedWallet(page)
    await expect(page.locator('[data-wallet-status="connected"]')).toBeVisible()
    await page.goto('/cart')
    await page.getByRole('link', { name: 'Finalizar compra', exact: true }).filter({ visible: true }).click()
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await expect(page.locator('#checkout-wallet option:checked')).toContainText('Reserva')
    } else {
      await expect(page.getByRole('radio', { name: /Reserva/ }).filter({ visible: true })).toBeChecked()
    }
    await expect(page.getByRole('combobox', { name: 'Rede', exact: true }).filter({ visible: true })).toHaveValue('musgo')
    await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled()
    await page.reload()
    await expect(page.locator('[data-wallet-status="connected"]')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Rede', exact: true }).filter({ visible: true })).toHaveValue('musgo')
  })

  test('remove a linha sem deixar total residual', async ({ page }) => {
    await addEmeraldToCart(page)
    await page.goto('/cart')
    await page.locator('[data-cart-line]:visible').getByRole('button', { name: /Remover/ }).click()
    await expect(page.locator('[data-cart-status="empty"]:visible')).toBeVisible()
    await expect(page.locator('[data-quote-total]:visible')).toHaveAttribute('data-quote-total', '0')
  })
})

test.describe('06 · cotação, cupom e dinheiro decimal', () => {
  test('usa apenas os valores devolvidos pela cotação', async ({ page }) => {
    await addEmeraldToCart(page)
    await page.goto('/cart')
    await expect(page.locator('[data-quote-status="ready"]:visible')).toBeVisible()
    await expect(page.locator('[data-quote-subtotal]:visible')).toHaveAttribute('data-quote-subtotal', '1.19')
    await expect(page.locator('[data-quote-fee]:visible')).toHaveAttribute('data-quote-fee', '0.002')
    await expect(page.locator('[data-quote-total]:visible')).toHaveAttribute('data-quote-total', '1.192')

    await page.locator('#coupon-code:visible').fill('ORVALHO')
    await page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true }).click()
    await expect(page.locator('[data-quote-discount]:visible')).toHaveAttribute('data-quote-discount', '0.119')
    await expect(page.locator('[data-quote-total]:visible')).toHaveAttribute('data-quote-total', '1.073')
    await page.reload()
    await expect(page.locator('[data-quote-total]:visible')).toHaveAttribute('data-quote-total', '1.073')
  })

  test('recusa cupom expirado sem alterar o total', async ({ page }) => {
    await addEmeraldToCart(page)
    await page.goto('/cart')
    await page.locator('#coupon-code:visible').fill('SECA')
    await page.getByRole('button', { name: 'Aplicar' }).filter({ visible: true }).click()
    await expect(page.getByRole('alert')).toContainText(/expir/i)
    await expect(page.locator('[data-quote-total]:visible')).toHaveAttribute('data-quote-total', '1.192')
  })
})
