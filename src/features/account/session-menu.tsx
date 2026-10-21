import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { AvatarMark } from '@/features/profile/avatar-mark'
import { signOut } from '@/features/account/session'
import { useSession } from '@/features/account/use-session'

export function SessionMenu() {
  const session = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logoutMutation = useMutation({
    mutationFn: () => signOut(queryClient),
    onSuccess: async () => {
      await navigate({ to: '/' })
    },
  })

  if (session.status === 'loading') {
    return <p className="text-sm text-muted-foreground">Verificando sessão…</p>
  }

  if (session.status !== 'authenticated') {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-session-email={session.user.email}>
      <AvatarMark avatarId={session.user.avatarId} name={session.user.name} />
      <p className="text-sm">{session.user.name}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        Sair
      </Button>
    </div>
  )
}
