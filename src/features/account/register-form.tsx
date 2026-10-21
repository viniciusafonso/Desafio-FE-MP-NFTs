import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { validateRegister } from '@/api/contracts/session'
import { isApiRequestError } from '@/api/errors'
import { register } from '@/api/session'
import { saveSessionToken } from '@/api/session-storage'
import { Button } from '@/components/ui/button'
import {
  AuthField,
  AuthSocialButton,
  FacebookMark,
  GoogleMark,
  PasswordField,
} from '@/features/account/auth-controls'
import { accountSessionKey } from '@/features/account/session'
import { adoptGuestCartIfAny } from '@/features/cart/cart-state'

export function RegisterForm({ surface = 'phone', redirectTo }: { surface?: 'phone' | 'dialog'; redirectTo?: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [socialNotice, setSocialNotice] = useState<string | null>(null)

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: async (session) => {
      saveSessionToken(session.token)
      queryClient.setQueryData(accountSessionKey, {
        user: session.user,
        expiresAt: session.expiresAt,
      })
      await adoptGuestCartIfAny(queryClient)
      await navigate({ href: redirectTo ?? '/' })
    },
  })

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = validateRegister({ name, email, password, confirmPassword })
    setFieldErrors(fields)
    setFormError(null)
    setSocialNotice(null)
    if (Object.keys(fields).length > 0) {
      const target = fields.name
        ? 'register-name'
        : fields.email
          ? 'register-email'
          : fields.password
            ? 'register-password'
            : 'register-confirm-password'
      document.getElementById(target)?.focus()
      return
    }

    registerMutation.mutate(
      { name, email, password },
      {
        onError: (error) => {
          if (!isApiRequestError(error)) {
            setFormError('Não foi possível criar a conta.')
            return
          }
          if (Object.keys(error.fields).length > 0) {
            setFieldErrors(error.fields)
          }
          if (error.code === 'email_taken' || Object.keys(error.fields).length === 0) {
            setFormError(error.message)
          }
        },
      },
    )
  }

  function refuseSocial(provider: string) {
    setSocialNotice(`O acesso com ${provider} não faz parte desta simulação.`)
  }

  const dialog = surface === 'dialog'

  return (
    <main className={dialog ? 'flex flex-col' : 'mx-auto flex min-h-[896px] w-full max-w-[414px] flex-col rounded-[40px] px-7 pt-20 pb-6'}>
      {dialog ? (
        <p className="text-center text-sm leading-4 text-[var(--kurio-secondary)]">
          Crie seu perfil de colecionador e conecte uma carteira quando quiser.
        </p>
      ) : (
        <>
          <h1 className="flex h-[136px] items-center justify-center text-center text-[32px] leading-[42px] font-bold tracking-[0.1em]">KURIO</h1>
          <p className="mt-10 text-center text-[18px] leading-4 font-bold">Criar perfil de colecionador</p>
        </>
      )}
      <form className={dialog ? 'mt-6 flex flex-col gap-3' : 'mt-10 flex flex-col gap-3'} onSubmit={onSubmit} noValidate>
        <AuthField
          id="register-name"
          label="Nome de usuário"
          autoComplete="username"
          value={name}
          error={fieldErrors.name}
          onChange={(event) => setName(event.target.value)}
        />
        <AuthField
          id="register-email"
          label="Digite seu e-mail"
          type="email"
          autoComplete="email"
          value={email}
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          id="register-password"
          label="Senha"
          autoComplete="new-password"
          value={password}
          error={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          id="register-confirm-password"
          label="Confirmar senha"
          autoComplete="new-password"
          value={confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {formError ? (
          <p role="alert" className="text-center text-sm">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          className={dialog ? 'mt-7 h-[45px] w-full rounded-[4px] bg-[var(--kurio-action)] text-base font-semibold text-[var(--kurio-action-ink)] hover:bg-[var(--kurio-action)]' : 'mt-7 h-[60px] w-full rounded-[10px] bg-[var(--kurio-action)] text-base font-semibold text-[var(--kurio-action-ink)] hover:bg-[var(--kurio-action)]'}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Criando perfil…' : dialog ? 'Criar conta' : 'Criar perfil'}
        </Button>
      </form>
      <div className="mt-10 flex items-center gap-3 text-[13px] leading-4 text-[var(--kurio-ink)]">
        <span className="h-px flex-1 bg-[var(--kurio-line)]" />
        Ou continue com
        <span className="h-px flex-1 bg-[var(--kurio-line)]" />
      </div>
      <div className="mt-3 flex flex-col gap-4">
        <AuthSocialButton className={dialog ? 'h-10 rounded-[4px] text-[13px]' : 'h-10 rounded-[5px] text-[13px]'} onClick={() => refuseSocial('Google')}>
          <GoogleMark />
          Continuar com Google
        </AuthSocialButton>
        <AuthSocialButton className={dialog ? 'h-10 rounded-[4px] text-[13px]' : 'h-10 rounded-[5px] text-[13px]'} onClick={() => refuseSocial('Facebook')}>
          <FacebookMark />
          Continuar com Facebook
        </AuthSocialButton>
      </div>
      {socialNotice ? (
        <p role="status" className="mt-3 text-center text-sm">
          {socialNotice}
        </p>
      ) : null}
      <p className={dialog ? "hidden" : "mt-10 text-center text-sm text-[var(--kurio-gold)]"}>
        Já tem uma conta?{' '}
        <Link
          to="/login" search={redirectTo ? { redirect: redirectTo } : {}}
          className="text-[#cfb28c] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kurio-action)]"
        >
          Entre
        </Link>
      </p>
    </main>
  )
}
