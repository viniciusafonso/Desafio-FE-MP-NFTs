import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { validateLogin } from '@/api/contracts/session'
import { isApiRequestError } from '@/api/errors'
import { login } from '@/api/session'
import { saveSessionToken } from '@/api/session-storage'
import { Button } from '@/components/ui/button'
import {
  AuthField,
  AuthSocialButton,
  FacebookMark,
  GoogleMark,
  PasswordField,
} from '@/features/account/auth-controls'
import { accountSessionKey, prepareSessionChange } from '@/features/account/session'
import { adoptGuestCartIfAny } from '@/features/cart/cart-state'

type LoginFormProps = {
  redirectTo?: string
  notice?: 'expired'
  surface?: 'phone' | 'dialog'
}

export function LoginForm({ redirectTo, notice, surface = 'phone' }: LoginFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [socialNotice, setSocialNotice] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      await prepareSessionChange(queryClient)
      saveSessionToken(session.token)
      queryClient.setQueryData(accountSessionKey, {
        user: session.user,
        expiresAt: session.expiresAt,
      })
      await adoptGuestCartIfAny(queryClient)
      if (redirectTo) {
        await navigate({ href: redirectTo })
        return
      }
      await navigate({ to: '/' })
    },
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = validateLogin({ email, password })
    setFieldErrors(fields)
    setFormError(null)
    setSocialNotice(null)
    if (Object.keys(fields).length > 0) {
      document.getElementById(fields.email ? 'login-email' : 'login-password')?.focus()
      return
    }

    loginMutation.mutate(
      { email, password },
      {
        onError: (error) => {
          if (!isApiRequestError(error)) {
            setFormError('Não foi possível entrar.')
            return
          }
          if (Object.keys(error.fields).length > 0) {
            setFieldErrors(error.fields)
            return
          }
          setFormError(error.message)
        },
      },
    )
  }

  const dialog = surface === 'dialog'

  return (
    <main className={dialog ? 'flex flex-col' : 'mx-auto flex min-h-[896px] w-full max-w-[414px] flex-col rounded-[40px] px-7 pt-20 pb-6'}>
      {dialog ? null : <h1 className="flex h-[136px] items-center justify-center text-center text-[32px] leading-[42px] font-bold tracking-[0.1em]">KURIO</h1>}
      <p className={dialog ? 'text-center text-sm leading-4 text-[var(--kurio-secondary)]' : 'mt-10 text-center text-[20px] leading-4 font-bold'}>
        {dialog ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Entrar'}
      </p>
      {notice === 'expired' ? (
        <p role="alert" className="mt-6 text-center text-sm">
          Sua sessão expirou. Entre novamente para continuar.
        </p>
      ) : null}
      <form className={dialog ? 'mt-6 flex flex-col gap-3' : 'mt-10 flex flex-col gap-3'} onSubmit={onSubmit} noValidate>
        <AuthField
          id="login-email"
          label="contato@email.com"
          type="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          id="login-password"
          label="Senha"
          autoComplete="current-password"
          value={password}
          error={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="button"
          className="self-end text-sm leading-4 text-[var(--kurio-action)]"
          onClick={() => setSocialNotice('A recuperação de senha não faz parte desta simulação.')}
        >
          Esqueceu a senha?
        </button>
        {formError ? (
          <p role="alert" className="text-center text-sm">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          className={dialog ? 'mt-7 h-[45px] w-full rounded-[4px] bg-[var(--kurio-action)] text-base font-semibold text-[var(--kurio-action-ink)] hover:bg-[var(--kurio-action)]' : 'mt-7 h-[60px] w-full rounded-[10px] bg-[var(--kurio-action)] text-base font-semibold text-[var(--kurio-action-ink)] hover:bg-[var(--kurio-action)]'}
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <div className={dialog ? 'mt-6 flex items-center gap-3 text-[13px] leading-4 text-[var(--kurio-ink)]' : 'mt-10 flex items-center gap-3 text-[13px] leading-4 text-[var(--kurio-ink)]'}>
        <span className="h-px flex-1 bg-[var(--kurio-line)]" />
        Ou continue com
        <span className="h-px flex-1 bg-[var(--kurio-line)]" />
      </div>
      <div className="mt-3 flex flex-col gap-4">
        <AuthSocialButton className={dialog ? 'h-10 rounded-[4px] text-[13px]' : 'h-10 rounded-[5px] text-[13px]'} onClick={() => setSocialNotice('O acesso com Google não faz parte desta simulação.')}>
          <GoogleMark />
          Continuar com Google
        </AuthSocialButton>
        <AuthSocialButton className={dialog ? 'h-10 rounded-[4px] text-[13px]' : 'h-10 rounded-[5px] text-[13px]'} onClick={() => setSocialNotice('O acesso com Facebook não faz parte desta simulação.')}>
          <FacebookMark />
          Continuar com Facebook
        </AuthSocialButton>
      </div>
      {socialNotice ? (
        <p role="status" className="mt-3 text-center text-sm">
          {socialNotice}
        </p>
      ) : null}
      <p className={dialog ? 'hidden mt-8 text-center text-[13px] leading-4 text-[var(--kurio-gold)]' : 'mt-10 text-center text-[13px] leading-4 text-[var(--kurio-gold)]'}>
        Novo na Kurio?{' '}
        <Link
          to="/register" search={redirectTo ? { redirect: redirectTo } : {}}
          className="text-[#cfb28c] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kurio-action)]"
        >
          Crie uma conta
        </Link>
      </p>
    </main>
  )
}
