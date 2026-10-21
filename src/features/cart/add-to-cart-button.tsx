import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { addCartItem } from '@/api/cart'
import { isApiRequestError } from '@/api/errors'
import { ensureGuestCartId, readSessionToken } from '@/api/session-storage'
import { Button } from '@/components/ui/button'
import { KurioButton } from '@/features/home/kurio-ui'
import { storeCart } from '@/features/cart/cart-state'

type AddToCartButtonProps = {
  nftId: string
  editionId: string
  quantity: number
  disabled: boolean
  label?: string
  appearance?: 'default' | 'kurio'
  className?: string
  feedback?: 'inline' | 'accessible'
}

export function AddToCartButton({
  nftId,
  editionId,
  quantity,
  disabled,
  label = 'Adicionar ao carrinho',
  appearance = 'default',
  className,
  feedback = 'inline',
}: AddToCartButtonProps) {
  const queryClient = useQueryClient()
  const [added, setAdded] = useState(false)
  const mutation = useMutation({
    mutationKey: ['cart', 'add'],
    mutationFn: () => {
      if (!readSessionToken()) {
        ensureGuestCartId()
      }
      return addCartItem({ nftId, editionId, quantity })
    },
    onSuccess: (cart) => {
      storeCart(queryClient, cart)
      setAdded(true)
    },
  })

  const errorMessage = mutation.isError
    ? isApiRequestError(mutation.error)
      ? mutation.error.message
      : 'Não foi possível adicionar ao carrinho.'
    : null

  return (
    <div className={feedback === 'accessible' ? 'relative flex w-[196px] shrink-0 flex-col items-start gap-2' : 'relative flex shrink-0 flex-col items-start gap-2'}>
      {appearance === 'kurio' ? (
        <KurioButton
          className={className ?? 'h-10 w-[130px] text-sm leading-5 font-bold disabled:opacity-50'}
          disabled={disabled || mutation.isPending}
          onClick={() => {
            setAdded(false)
            mutation.mutate()
          }}
        >
          {mutation.isPending ? 'Adicionando…' : label}
        </KurioButton>
      ) : (
        <Button
          type="button"
          className="w-fit"
          disabled={disabled || mutation.isPending}
          onClick={() => {
            setAdded(false)
            mutation.mutate()
          }}
        >
          {mutation.isPending ? 'Adicionando…' : label}
        </Button>
      )}
      {added ? (
        <p role="status" className={feedback === 'accessible' ? 'sr-only' : appearance === 'kurio' ? 'absolute top-full right-0 mt-1 w-max text-xs leading-4' : 'text-sm'}>
          Obra adicionada ao carrinho.{' '}
          {feedback === 'inline' ? <Link
            to="/cart"
            className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ver carrinho
          </Link> : null}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
