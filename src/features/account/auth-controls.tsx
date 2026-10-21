import { useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fieldClassName =
  'h-[50px] rounded-[10px] border-[var(--kurio-line)] bg-transparent px-4 text-left text-sm text-[var(--kurio-ink)] placeholder:text-left placeholder:text-[var(--kurio-gold)] focus-visible:border-[var(--kurio-action)] focus-visible:ring-0 md:text-sm'

type AuthFieldProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
}

export function AuthField({ id, label, error, className, ...props }: AuthFieldProps) {
  const errorId = id ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Input
        id={id}
        placeholder={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(fieldClassName, className)}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-center text-sm text-[var(--kurio-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type PasswordFieldProps = Omit<AuthFieldProps, 'type'>

export function PasswordField({ id, label, error, className, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const errorId = id ? `${id}-error` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldClassName, 'pr-12', className)}
          {...props}
        />
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm text-[#55321f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kurio-action)]"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-center text-sm text-[var(--kurio-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function AuthSocialButton({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-[50px] w-full rounded-[12px] border-[var(--kurio-line)] bg-transparent text-base font-normal text-[var(--kurio-gold)] hover:bg-transparent hover:text-[var(--kurio-gold)]',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {!visible ? <path d="M4 20 20 4" stroke="currentColor" strokeWidth="1.6" /> : null}
    </svg>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.8-1 7.7-2.8l-3.7-2.9c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.6v3c2 4 6 6.4 10.4 6.4Z" />
      <path fill="#FBBC05" d="M5.4 14.6A7.2 7.2 0 0 1 5 12c0-.9.2-1.8.4-2.6V6.4H1.6A12 12 0 0 0 0 12c0 1.9.5 3.8 1.6 5.6l3.8-3Z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.8 1.1 15.2 0 12 0 7.6 0 3.6 2.4 1.6 6.4l3.8 3C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  )
}

export function FacebookMark() {
  return <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path fill="#3b5999" d="M14.4 24V13.1H18l.6-4.3h-4.2V6c0-1.2.4-2.1 2.1-2.1h2.3V.2C18.4.1 17 0 15.5 0c-3.3 0-5.5 2-5.5 5.6v3.2H6.3v4.3H10V24h4.4Z" /></svg>
}
