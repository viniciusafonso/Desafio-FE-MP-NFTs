import { useRef, useState, type FormEvent } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { validatePasswordChange, validateProfile, type AvatarId } from '@/api/contracts/profile'
import { isApiRequestError } from '@/api/errors'
import { AccountFrame } from '@/features/account/account-nav'
import { TextField } from '@/features/account/text-field'
import { KurioButton, kurioFieldClass } from '@/features/home/kurio-ui'
import { KurioScreen } from '@/features/home/kurio-screen'
import { useChangePassword, useProfile, useUpdateProfile } from '@/features/profile/profile-state'

type ProfileDraft = {
  name: string
  email: string
  avatarUrl?: string | null
  username?: string
  ens?: string
  walletLabel?: string
  avatarId: AvatarId | null
}

export function ProfilePage() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const password = useChangePassword()
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const avatarInput = useRef<HTMLInputElement>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  if (profile.isPending) {
    return (
      <KurioScreen active="inicio" account>
        <AccountFrame>
          <h1 className="mb-6 text-[17px] leading-5 font-bold">Perfil do colecionador</h1>
          <div className="skeleton h-80 rounded-[6px]" />
          <p className="sr-only">Carregando o perfil.</p>
        </AccountFrame>
      </KurioScreen>
    )
  }

  if (profile.isError || !profile.data) {
    const message = isApiRequestError(profile.error) ? profile.error.message : 'Não foi possível carregar o perfil.'
    return (
      <KurioScreen active="inicio" account>
        <AccountFrame>
          <h1 className="text-[17px] leading-5 font-bold">Perfil do colecionador</h1>
          <p role="alert">{message}</p>
          <KurioButton type="button" className="h-10 px-4 text-sm font-bold" onClick={() => void profile.refetch()}>
            Tentar de novo
          </KurioButton>
        </AccountFrame>
      </KurioScreen>
    )
  }

  const view = draft ?? {
    name: profile.data.name,
    email: profile.data.email,
    avatarId: profile.data.avatarId,
    avatarUrl: profile.data.avatarUrl ?? null,
    username: profile.data.username ?? '', ens: profile.data.ens ?? '', walletLabel: profile.data.walletLabel ?? '',
  }
  if (!draft) {
    setDraft(view)
  }

  function onProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!view || update.isPending) {
      return
    }

    const fields = validateProfile(view)
    setProfileErrors(fields)
    setProfileMessage(null)
    if (Object.keys(fields).length > 0) {
      document.getElementById(fields.name ? 'profile-name' : fields.email ? 'profile-email' : fields.username ? 'profile-username' : fields.ens ? 'profile-ens' : fields.walletLabel ? 'profile-wallet-label' : 'profile-avatar')?.focus()
      return
    }

    update.mutate(view, {
      onSuccess: (saved) => {
        setDraft({ name: saved.name, email: saved.email, avatarId: saved.avatarId, avatarUrl: saved.avatarUrl, username: saved.username, ens: saved.ens, walletLabel: saved.walletLabel })
        setProfileMessage('Perfil atualizado.')
      },
      onError: (error) => {
        if (!isApiRequestError(error)) {
          setProfileMessage('Não foi possível atualizar o perfil.')
          return
        }
        if (Object.keys(error.fields).length > 0) {
          setProfileErrors(error.fields)
        }
        setProfileMessage(error.message)
      },
    })
  }

  function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.isPending) {
      return
    }

    const fields = validatePasswordChange({ currentPassword, newPassword, confirmPassword })
    setPasswordErrors(fields)
    setPasswordMessage(null)
    if (Object.keys(fields).length > 0) {
      const target = fields.currentPassword
        ? 'profile-current-password'
        : fields.newPassword
          ? 'profile-new-password'
          : 'profile-confirm-password'
      document.getElementById(target)?.focus()
      return
    }

    password.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordMessage('Senha alterada.')
        },
        onError: (error) => {
          if (!isApiRequestError(error)) {
            setPasswordMessage('Não foi possível alterar a senha.')
            return
          }
          if (Object.keys(error.fields).length > 0) {
            setPasswordErrors(error.fields)
          }
          setPasswordMessage(error.message)
        },
      },
    )
  }

  function onSaveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (update.isPending || password.isPending) return
    const changingPassword = Boolean(currentPassword || newPassword || confirmPassword)
    const fields = validateProfile(view)
    const secretFields = changingPassword
      ? validatePasswordChange({ currentPassword, newPassword, confirmPassword })
      : {}
    setProfileErrors(fields)
    setPasswordErrors(secretFields)
    setProfileMessage(null)
    setPasswordMessage(null)
    if (Object.keys(fields).length || Object.keys(secretFields).length) {
      const target = fields.name ? 'profile-name' : fields.email ? 'profile-email'
        : fields.username ? 'profile-username' : fields.ens ? 'profile-ens' : fields.walletLabel ? 'profile-wallet-label' : fields.avatarId ? 'profile-avatar' : secretFields.currentPassword ? 'profile-current-password'
          : secretFields.newPassword ? 'profile-new-password' : 'profile-confirm-password'
      document.getElementById(target)?.focus()
      return
    }
    onProfileSubmit(event)
    if (changingPassword) onPasswordSubmit(event)
  }

  return (
    <KurioScreen active="inicio" account>
    <AccountFrame>
    <div className="flex w-full flex-col gap-8" data-profile-status="ready">
      <div className="flex flex-col gap-2">
        <h1 className="text-[17px] leading-5 font-bold">Perfil do colecionador</h1>

      </div>
      <form id="profile-data" className="flex flex-col gap-8" onSubmit={onSaveSubmit} noValidate>
        <div className="grid gap-x-7 gap-y-8 md:grid-cols-2">
        <TextField containerClassName="flex flex-col gap-[14px]"
          id="profile-name"
          label="Nome de exibição *"
          autoComplete="name"
          className={kurioFieldClass}
          value={view.name}
          error={profileErrors.name}
          onChange={(event) => setDraft({ ...view, name: event.target.value })}
        />
        <TextField containerClassName="flex flex-col gap-[14px]"
          error={profileErrors.username} aria-required="true" id="profile-username"
          label="Nome de usuário *"
          className={kurioFieldClass}
          value={view.username ?? ''}
          onChange={(event) => setDraft({ ...view, username: event.target.value })}
        />
        <TextField containerClassName="flex flex-col gap-[14px]"
          id="profile-email"
          label="E-mail *"
          type="email"
          autoComplete="email"
          className={kurioFieldClass}
          value={view.email}
          error={profileErrors.email}
          onChange={(event) => setDraft({ ...view, email: event.target.value })}
        />
        <TextField containerClassName="flex flex-col gap-[14px]"
          error={profileErrors.ens} aria-required="true" id="profile-ens"
          label="Nome ENS *"
          className={kurioFieldClass}
          value={view.ens ?? ''}
          onChange={(event) => setDraft({ ...view, ens: event.target.value })}
        />
        <TextField containerClassName="flex flex-col gap-[14px]" error={profileErrors.walletLabel} aria-required="true" id="profile-wallet-label" label="Apelido da carteira *" className={kurioFieldClass}
          value={view.walletLabel ?? ''} onChange={(event) => setDraft({ ...view, walletLabel: event.target.value })} />
        <div className="flex flex-col gap-2"><span className="text-[15px]">Avatar</span>
          <div className="flex items-center gap-6"><span className="flex size-[50px] items-center justify-center overflow-hidden rounded-full border border-[var(--kurio-border)] bg-[#2f1d15] text-[var(--kurio-primary)]">{view.avatarUrl ? <img src={view.avatarUrl} alt="Avatar do colecionador" className="size-full object-cover" /> : <ImageIcon className="size-5" />}</span>
            <button type="button" className="cursor-pointer rounded bg-[var(--kurio-primary)] px-6 py-3 text-sm font-bold text-[var(--kurio-ink)]" onClick={() => avatarInput.current?.click()}>Alterar</button>
            <button type="button" className="text-sm" onClick={() => setDraft({ ...view, avatarId: null, avatarUrl: null })}>Remover</button>
          </div>
        </div>
        </div>
        <input ref={avatarInput} type="file" accept="image/png" aria-label="Enviar avatar PNG" className="sr-only" onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          if (file.type !== 'image/png' || file.size > 2_000_000) { setProfileErrors({ ...profileErrors, avatarId: 'Escolha um PNG de até 2 MB.' }); return }
          const reader = new FileReader()
          reader.onload = () => { setDraft({ ...view, avatarUrl: String(reader.result), avatarId: null }); setProfileErrors({ ...profileErrors, avatarId: '' }) }
          reader.readAsDataURL(file)
        }} />
        {profileErrors.avatarId ? <p role="alert">{profileErrors.avatarId}</p> : null}
        {profileMessage ? (
          <p role="status" data-profile-message="">
            {profileMessage}
          </p>
        ) : null}
      <section className="flex w-full max-w-[417px] flex-col gap-6" aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-[17px] leading-4 font-bold">Alterar senha</h2>
        <TextField
          id="profile-current-password"
          label="Senha atual"
          type="password"
          revealPassword
          autoComplete="current-password"
          className={kurioFieldClass}
          value={currentPassword}
          error={passwordErrors.currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <TextField
          id="profile-new-password"
          label="Nova senha"
          type="password"
          revealPassword
          autoComplete="new-password"
          className={kurioFieldClass}
          value={newPassword}
          error={passwordErrors.newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <TextField
          id="profile-confirm-password"
          label="Confirmar nova senha"
          type="password"
          revealPassword
          autoComplete="new-password"
          className={kurioFieldClass}
          value={confirmPassword}
          error={passwordErrors.confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        {passwordMessage ? (
          <p role="status" data-password-message="">
            {passwordMessage}
          </p>
        ) : null}
      </section>
      </form>
        <KurioButton type="submit" form="profile-data" className="h-10 w-[131px] px-4 text-sm font-bold" disabled={update.isPending || password.isPending}>
          {update.isPending || password.isPending ? 'Salvando…' : 'Salvar'}
        </KurioButton>
    </div>
    </AccountFrame>
    </KurioScreen>
  )
}
