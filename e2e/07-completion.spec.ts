import { expect, test } from '@playwright/test'
import { resetSimulation, login, addEmeraldToCart, connectPrimaryWallet, setScenario } from './support'

test.beforeEach(async ({page}) => { await resetSimulation(page) })

test('mobile abre filtros existentes e carrega próximas páginas por rolagem', async ({page},info) => {
  test.skip(!info.project.name.includes('mobile'))
  await page.getByRole('button',{name:'Filtros do catálogo',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button',{name:'Colecionáveis (9)',exact:true}).click()
  await expect(page).toHaveURL(/category/)
  await dialog.getByRole('button',{name:'Fechar filtros'}).click()
  await expect(page.locator('[data-nft-id]:visible')).toHaveCount(9)
  await page.goto('/')
  await expect(page.locator('[data-nft-id]:visible')).toHaveCount(9)
  await page.locator('[data-nft-id]:visible').last().scrollIntoViewIfNeeded()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('[data-nft-id]:visible')).toHaveCount(18)
  await page.reload()
  await expect(page.locator('[data-nft-id]:visible')).toHaveCount(18)
})

test('falha de transporte mostra erro e permite recuperar catálogo',async ({page})=>{
  await setScenario(page,'network-failure')
  await page.goto('/?q=Emerald')
  await expect(page.getByRole('alert').filter({visible:true})).toContainText('Não foi possível falar com a simulação')
  await setScenario(page,null)
  await page.getByRole('button',{name:'Tentar de novo'}).filter({visible:true}).click()
  await expect(page.locator('[data-nft-id]:visible')).toHaveCount(4)
})

test('reconexão recupera pedido concluído enquanto socket estava indisponível',async({page})=>{
  await login(page)
  await addEmeraldToCart(page)
  await page.goto('/checkout')
  await connectPrimaryWallet(page)
  await setScenario(page,'payment-hold')
  await page.getByRole('button',{name:'Confirmar compra',exact:true}).click()
  await expect(page.locator('[data-order-status="pending"]')).toBeVisible()
  const before=page.url()
  const result=await page.evaluate(async()=>{
    const outage=await fetch('/api/simulation/realtime-outage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({durationMs:1500})}).then(r=>r.json())
    const id=location.pathname.split('/').pop()
    await fetch(`/api/simulation/orders/${id}/settle`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status:'confirmed'})})
    return outage
  })
  expect(result.disconnectedClients).toBeGreaterThan(0)
  await expect(page.locator('[data-order-status="confirmed"]')).toBeVisible({timeout:12_000})
  await expect(page).toHaveURL(before)
})

test('reconexão refaz detalhe que perdeu evento durante interrupção',async({page})=>{
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByRole('heading',{name:'Emerald Ape #042',exact:true})).toBeVisible()
  await page.waitForTimeout(500)
  const outage=await page.evaluate(async()=>{
    const result=await fetch('/api/simulation/realtime-outage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({durationMs:1500})}).then(r=>r.json())
    await fetch('/api/simulation/nft-shift',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({nftId:'nft_beija_flor',editionId:'nft_beija_flor_50',priceEth:'1.29'})})
    return result
  })
  expect(outage.disconnectedClients).toBeGreaterThan(0)
  await expect(page.getByText('1.29 ETH',{exact:true}).filter({visible:true}).first()).toBeVisible({timeout:12_000})
})

test('autenticação mantém foco no diálogo e fecha por Escape', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'O frame mobile usa uma página, não um diálogo.')
  await page.goto('/login?redirect=/checkout')
  await expect(page.locator('#login-email')).toBeFocused()
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/')
})
