import { expect, test } from '@playwright/test'
import { addEmeraldToCart, collectors, login, resetSimulation } from './support'

test.beforeEach(async ({ page }) => {
  await resetSimulation(page)
})

test.describe('10 · sessão, perfil privado e troca de usuário', () => {
  test('limpa dados privados no logout antes de entrar com outra conta', async ({ page }) => {
    await login(page, collectors.marina)
    await page.goto('/profile')
    await expect(page.locator('#profile-email:visible')).toHaveValue(collectors.marina.email)
    await page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/')

    await login(page, collectors.rafael)
    await page.goto('/profile')
    await expect(page.locator('#profile-email:visible')).toHaveValue(collectors.rafael.email)
    await expect(page.getByText(collectors.marina.email)).toHaveCount(0)
  })

  test('expiração remove o acesso privado e preserva o destino', async ({ page }) => {
    await login(page)
    await page.evaluate(() => localStorage.setItem('greenmint.mock-scenario', 'session-expired'))
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
    await expect(page).toHaveURL(/redirect=.*profile/)
  })
})

test.describe('11 · persistência de perfil e carteiras', () => {
  test('salva perfil e senha com validação do mock', async ({ page }) => {
    await login(page)
    await page.goto('/profile')
    await page.locator('#profile-name:visible').fill('Marina Kurio')
    await page.locator('#profile-username:visible').fill('marina.kurio')
    await page.locator('#profile-ens:visible').fill('marina.eth')
    await page.getByLabel('Enviar avatar PNG').setInputFiles('public/catalog/emerald-ape-042.png')
    await page.getByRole('button', { name: 'Salvar', exact: true }).filter({ visible: true }).click()
    await expect(page.locator('[data-profile-message]')).toContainText('Perfil atualizado')
    await page.reload()
    await expect(page.locator('#profile-name:visible')).toHaveValue('Marina Kurio')
    await expect(page.locator('#profile-username:visible')).toHaveValue('marina.kurio')
    await expect(page.locator('#profile-ens:visible')).toHaveValue('marina.eth')
    await expect(page.getByAltText('Avatar do colecionador')).toBeVisible()

    await page.evaluate(() => localStorage.setItem('greenmint.mock-scenario', 'password-rejected'))
    await page.locator('#profile-current-password:visible').fill('marina-coleciona')
    await page.locator('#profile-new-password:visible').fill('senha-nova-123')
    await page.locator('#profile-confirm-password:visible').fill('senha-nova-123')
    await page.getByRole('button', { name: 'Salvar', exact: true }).filter({ visible: true }).click()
    await expect(page.locator('[data-password-message]')).toContainText(/recus|incorret/i)
  })

  test('mostra e oculta cada senha e salva sem ação duplicada', async ({ page }) => {
    await login(page)
    await page.goto('/profile')
    const current = page.locator('#profile-current-password:visible')
    const next = page.locator('#profile-new-password:visible')
    const confirmation = page.locator('#profile-confirm-password:visible')
    const save = page.getByRole('button', { name: 'Salvar', exact: true }).filter({ visible: true })
    await expect(save).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Alterar senha', exact: true })).toHaveCount(0)
    await expect(page.getByText('Informe a senha atual.', { exact: true })).toHaveCount(0)
    await expect(page.getByText('A nova senha precisa ter pelo menos 8 caracteres.', { exact: true })).toHaveCount(0)
    for (const [field, label] of [[current, 'senha atual'], [next, 'nova senha'], [confirmation, 'confirmar nova senha']] as const) {
      await expect(field).toHaveAttribute('type', 'password')
      await page.getByRole('button', { name: `Mostrar ${label}`, exact: true }).click()
      await expect(field).toHaveAttribute('type', 'text')
      await expect(page.getByRole('button', { name: `Ocultar ${label}`, exact: true })).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: `Ocultar ${label}`, exact: true }).click()
      await expect(field).toHaveAttribute('type', 'password')
    }
    await next.fill('curta')
    await confirmation.fill('curta')
    await save.click()
    await expect(page.getByText('Informe a senha atual.', { exact: true })).toHaveCount(1)
    await expect(page.getByText('A nova senha precisa ter pelo menos 8 caracteres.', { exact: true })).toHaveCount(1)
    await expect(current).toBeFocused()
    await expect(current).toHaveAttribute('aria-describedby', 'profile-current-password-error')
    await current.fill(collectors.marina.password)
    await next.fill('nova-senha-kurio-123')
    await confirmation.fill('nova-senha-kurio-123')
    await save.click()
    await expect(page.locator('[data-password-message]')).toHaveText('Senha alterada.')
    await expect(current).toHaveValue('')
    await expect(next).toHaveValue('')
    await expect(confirmation).toHaveValue('')
    await page.getByRole('button', { name: 'Sair', exact: true }).filter({ visible: true }).click()
    await expect(page).toHaveURL('/')
    await page.goto('/login')
    await page.locator('#login-email').fill(collectors.marina.email)
    await page.locator('#login-password').fill('nova-senha-kurio-123')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/')
  })

  test('cadastra carteira com os campos e seletores da referência', async ({ page }) => {
    await page.goto('/register')
    await page.locator('#register-name').fill('Colecionador Kurio')
    await page.locator('#register-email').fill('carteiras@kurio.test')
    await page.locator('#register-password').fill('carteira-kurio-123')
    await page.locator('#register-confirm-password').fill('carteira-kurio-123')
    await page.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
    await expect(page).toHaveURL('/')
    await page.goto('/wallets')
    const primary = page.locator('[data-wallet-role="primary"]')
    await expect(page.getByText('Nenhuma carteira cadastrada.', { exact: true })).toHaveCount(0)
    await expect(primary.getByRole('textbox', { name: 'Apelido da carteira', exact: true })).toHaveValue('')
    await expect(primary.getByPlaceholder('Endereço 0x da carteira')).toBeVisible()
    await expect(primary.getByLabel('Sufixo ENS', { exact: true })).toHaveValue('.eth')
    await primary.getByRole('textbox', { name: 'Nome de exibição', exact: true }).fill('Colecionador Kurio')
    await primary.getByRole('textbox', { name: 'Apelido da carteira', exact: true }).fill('Principal Kurio')
    await primary.getByRole('textbox', { name: 'Endereço da carteira', exact: true }).fill('0xC0030000000000000000000000000000000033C3')
    await primary.getByRole('textbox', { name: 'Nome do perfil', exact: true }).fill('colecionador.kurio')
    await primary.getByRole('textbox', { name: 'Código de indicação', exact: true }).fill('KURIO')
    await primary.getByRole('textbox', { name: 'E-mail', exact: true }).fill('carteiras@kurio.test')
    await primary.getByRole('textbox', { name: 'Nome ENS', exact: true }).fill('colecionador')
    await primary.getByRole('combobox', { name: 'Rede', exact: true }).click()
    await page.getByRole('option', { name: 'Ethereum', exact: true }).click()
    await primary.getByRole('combobox', { name: 'Tipo de carteira', exact: true }).click()
    await page.getByRole('option', { name: 'MetaMask', exact: true }).click()
    await primary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(page.locator('[data-wallet-count]')).toHaveAttribute('data-wallet-count', '1')
    await expect(primary.getByRole('textbox', { name: 'Nome ENS', exact: true })).toHaveValue('colecionador')
    await expect(primary.getByRole('combobox', { name: 'Tipo de carteira', exact: true })).toHaveText('MetaMask')
    await page.reload()
    await expect(primary.getByRole('textbox', { name: 'Nome ENS', exact: true })).toHaveValue('colecionador')
    await expect(primary.getByRole('textbox', { name: 'Apelido da carteira', exact: true })).toHaveValue('Principal Kurio')
    await expect(primary.getByRole('combobox', { name: 'Rede', exact: true })).toHaveText('Ethereum')
  })

  test('reutiliza a própria carteira principal ao marcar Igual e preserva o vínculo', async ({ page }) => {
    await login(page, collectors.rafael)
    await page.goto('/wallets')
    const primary = page.locator('[data-wallet-role="primary"]')
    const secondaryRegion = page.getByRole('region', { name: 'Carteira secundária', exact: true })
    const same = secondaryRegion.getByRole('checkbox', { name: 'Igual à carteira principal', exact: true })
    const originalAddress = await primary.getByRole('textbox', { name: 'Endereço da carteira', exact: true }).inputValue()
    await same.check()
    await secondaryRegion.getByRole('button', { name: 'Adicionar', exact: true }).click()
    const secondary = page.locator('[data-wallet-role="secondary"]')
    await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira', exact: true })).toHaveValue(originalAddress)
    await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira', exact: true })).toBeDisabled()
    await secondary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(page.locator('[data-wallet-count]')).toHaveAttribute('data-wallet-count', '2')
    await page.reload()
    await expect(same).toBeChecked()
    await secondaryRegion.getByRole('button', { name: 'Alterar', exact: true }).click()
    await expect(secondary.getByRole('textbox', { name: 'Endereço da carteira', exact: true })).toHaveValue(originalAddress)
    await primary.getByRole('textbox', { name: 'Apelido da carteira', exact: true }).fill('Principal compartilhada')
    await primary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(secondary.getByRole('textbox', { name: 'Apelido da carteira', exact: true })).toHaveValue('Principal compartilhada')
    await same.uncheck()
    await secondary.getByRole('textbox', { name: 'Endereço da carteira', exact: true }).fill('0xA91F00000000000000000000000000000000E82C')
    await secondary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(secondary.locator('[data-wallet-message]')).toContainText(/uso|cadastrad|endereço/i)
  })

  test('edita carteira e recusa endereço duplicado', async ({ page }) => {
    await login(page)
    await page.goto('/wallets')
    const primary = page.locator('[data-wallet-role="primary"]')
    await primary.getByLabel('Apelido da carteira').fill('Principal Kurio')
    await primary.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'MetaMask', exact: true }).click()
    await primary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(primary.locator('[data-wallet-message]')).toContainText(/atualizada/i)
    await page.reload()
    await expect(page.locator('[data-wallet-role="primary"]').getByLabel('Apelido da carteira')).toHaveValue('Principal Kurio')
    await expect(page.locator('[data-wallet-role="primary"]').getByRole('combobox', { name: 'Tipo de carteira' })).toHaveText('MetaMask')

    await page.getByRole('region', { name: 'Carteira secundária', exact: true }).getByRole('button', { name: 'Alterar', exact: true }).click()
    const secondary = page.locator('[data-wallet-role="secondary"]')
    await secondary.getByLabel('Endereço').fill('0xA91F00000000000000000000000000000000E82C')
    await secondary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    await expect(secondary.locator('[data-wallet-message]')).toContainText(/uso|cadastrad|endereço/i)
  })
})

test.describe('12 · tempo real e regressão visual', () => {
  test('aplica evento novo e ignora duplicata e versão antiga', async ({ page }) => {
    await addEmeraldToCart(page)
    await page.goto('/cart')
    await expect(page.locator('[data-quote-subtotal]:visible')).toHaveAttribute('data-quote-subtotal', '1.19')
    await page.waitForTimeout(1_000)

    await page.evaluate(async () => {
      await fetch('/api/simulation/nft-shift', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nftId: 'nft_beija_flor',
          editionId: 'nft_beija_flor_50',
          priceEth: '1.29',
          duplicate: true,
          stalePriceEth: '0.01',
        }),
      })
    })

    await expect(page.locator('[data-quote-subtotal]:visible')).toHaveAttribute('data-quote-subtotal', '1.29')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-quote-subtotal]:visible')).not.toHaveAttribute('data-quote-subtotal', '0.01')
  })

  test('atualiza o detalhe acessado por slug com o evento da identidade estável', async ({ page }) => {
    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    await page.evaluate(async () => {
      const response = await fetch('/api/simulation/nft-shift', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft_beija_flor', editionId: 'nft_beija_flor_50', priceEth: '1.29' }),
      })
      if (!response.ok) throw new Error('Não foi possível atualizar a obra.')
    })
    await expect(page.getByText('1.29 ETH', { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page).toHaveURL('/nfts/emerald-ape-042')
  })

  test('mantém snapshots de início, detalhe, carrinho e pagamento', async ({ page }) => {
    test.slow()
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })

    await page.goto('/nfts/nft_beija_flor')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })

    await addEmeraldToCart(page)
    await page.goto('/cart')
    await expect(page.locator('[data-cart-status="ready"]:visible')).toBeVisible()
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })

    await page.goto('/login?redirect=/checkout')
    await page.locator('#login-email').fill(collectors.marina.email)
    await page.locator('#login-password').fill(collectors.marina.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/checkout')
    await expect(page.locator('[data-checkout-status="ready"]')).toBeVisible()
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
