import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { AppProviders } from '@/app/providers'
import { queryClient } from '@/app/query-client'
import { routeTree } from '@/routeTree.gen'
import '@/styles/globals.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const root = document.getElementById('root')

if (!root) {
  throw new Error('Elemento #root não encontrado.')
}

async function start(container: HTMLElement) {
  const viewReady = location.pathname === '/' ? import('@/features/catalog/catalog-page') : location.pathname.startsWith('/nfts/') ? import('@/features/catalog/nft-detail-page') : Promise.resolve()
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
  }

  await viewReady
  createRoot(container).render(
    <StrictMode>
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

void start(root)
