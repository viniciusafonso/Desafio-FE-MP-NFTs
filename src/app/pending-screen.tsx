import type { ReactNode } from 'react'

type PendingScreenProps = {
  title: string
  description?: string
  children?: ReactNode
}

export function PendingScreen({ title, description, children }: PendingScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xl text-muted-foreground">
        {description ?? 'Rota registrada. O fluxo desta tela entra nas próximas etapas.'}
      </p>
      {children}
    </main>
  )
}
