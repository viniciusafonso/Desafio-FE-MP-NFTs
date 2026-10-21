import { test, expect } from '@playwright/test'
import { resetSimulation, addEmeraldToCart, login, collectors, setScenario, fillCheckoutCollector } from './support'

test.beforeEach(async ({page}) => { await resetSimulation(page) })

test('cupom inválido preserva alinhamento do campo e botão', async ({page}) => {
  await addEmeraldToCart(page)
  await page.goto('/cart')
  const input=page.locator('#coupon-code:visible')
  const button=page.getByRole('button',{name:'Aplicar',exact:true}).filter({visible:true})
  await input.fill('OUTONO')
  const before=await button.boundingBox()
  await button.click()
  await expect(page.getByRole('alert').filter({visible:true})).toContainText(/cupom.*existe/i)
  const field=await input.boundingBox(), after=await button.boundingBox()
  expect(Math.abs(field!.y-after!.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(before!.y-after!.y)).toBeLessThanOrEqual(1)
})

test('sessão expirada no checkout retorna ao mesmo fluxo', async ({page}, info) => {
  await addEmeraldToCart(page)
  await login(page)
  await page.goto('/checkout')
  await expect(page.locator('[data-checkout-status="ready"]')).toBeVisible()
  await setScenario(page,'session-expired')
  await page.reload()
  await expect(page).toHaveURL(/login.*redirect=.*checkout/)
  await setScenario(page,null)
  await page.locator('#login-email').fill(collectors.marina.email)
  await page.locator('#login-password').fill(collectors.marina.password)
  await page.getByRole('button',{name:'Entrar',exact:true}).click()
  await expect(page).toHaveURL('/checkout')
  const serverCart = await page.evaluate(async () => {const token=localStorage.getItem('greenmint.session-token');const r=await fetch('/api/cart',{headers:{authorization:`Bearer ${token}`}});const data=await r.json();return {status:r.status,items:data.items?.length}})
  await info.attach('cart-after-login',{body:JSON.stringify(serverCart),contentType:'application/json'})
  await expect(page.locator('[data-checkout-status="ready"]')).toBeVisible()
})

test('cadastro repetido mostra conflito da API', async ({page}) => {
  await page.goto('/register')
  await page.locator('#register-name').fill('Marina repetida')
  await page.locator('#register-email').fill(collectors.marina.email)
  await page.locator('#register-password').fill('senha-ficticia-123')
  await page.locator('#register-confirm-password').fill('senha-ficticia-123')
  await page.getByRole('button',{name:/^Criar (conta|perfil)$/}).click()
  await expect(page.locator('#register-email-error')).toContainText(/e-mail.*uso/i)
  await expect(page).toHaveURL(/register/)
})

test('skeleton com shimmer respeita movimento reduzido', async ({page}) => {
  await setScenario(page,'slow')
  await page.goto('/?q=Golden')
  const skeleton=page.locator('.skeleton:visible').first()
  await expect(skeleton).toBeVisible()
  expect(await skeleton.evaluate(e=>getComputedStyle(e,'::after').animationName)).toBe('greenmint-shimmer')
  await page.emulateMedia({reducedMotion:'reduce'})
  expect(await skeleton.evaluate(e=>getComputedStyle(e,'::after').animationName)).toBe('none')
  await expect(page.getByRole('heading',{name:'Golden Signal #160',exact:true})).toBeVisible()
})


test('edição esgotada por evento bloqueia confirmação no checkout', async ({page}) => {
  await login(page)
  await addEmeraldToCart(page)
  await page.goto('/checkout')
  await expect(page.locator('[data-checkout-status="ready"]')).toBeVisible()
  await fillCheckoutCollector(page)
  await page.evaluate(async () => {
    const r=await fetch('/api/simulation/nft-shift',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nftId:'nft_beija_flor',editionId:'nft_beija_flor_50',remaining:0})})
    if(!r.ok)throw Error('Não foi possível esgotar a edição')
  })
  await expect(page.getByRole('button',{name:'Confirmar compra',exact:true}).filter({visible:true})).toBeDisabled()
  await expect(page).toHaveURL('/checkout')
})
