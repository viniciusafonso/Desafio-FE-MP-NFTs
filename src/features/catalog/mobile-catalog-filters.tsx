import { Dialog } from 'radix-ui'
import type { ReactNode, RefObject } from 'react'

export default function MobileCatalogFilters({ children, onClose, triggerRef }: { children: ReactNode; onClose: () => void; triggerRef: RefObject<HTMLButtonElement | null> }) {
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
    <Dialog.Content id="mobile-catalog-filters" onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus() }} className="kurio-home fixed bottom-0 left-1/2 z-50 max-h-[85svh] w-full max-w-[414px] -translate-x-1/2 overflow-y-auto rounded-t-[24px] p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between"><Dialog.Title className="text-lg font-bold">Filtros</Dialog.Title><Dialog.Close aria-label="Fechar filtros" className="flex size-9 items-center justify-center text-xl">×</Dialog.Close></div>
      <Dialog.Description className="sr-only">Filtre os NFTs por coleção, faixa de preço e rede.</Dialog.Description>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}
