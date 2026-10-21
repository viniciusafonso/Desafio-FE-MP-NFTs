import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string
  error?: string
  containerClassName?: string
  labelClassName?: string
  revealPassword?: boolean
  requiredMark?: boolean
}

export function TextField({ id, label, error, containerClassName, labelClassName, revealPassword = false, requiredMark = false, type, className, ...props }: TextFieldProps) {
  const [visible, setVisible] = useState(false)
  const canReveal = revealPassword && type === 'password'
  const errorId = id ? `${id}-error` : undefined

  const input = (
    <Input id={id} type={canReveal && visible ? 'text' : type}
      className={cn(className, canReveal && 'pr-11')}
      aria-required={requiredMark || undefined} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} />
  )

  return (
    <div className={containerClassName ?? 'flex flex-col gap-1.5'}>
      <Label htmlFor={id} className={cn(labelClassName, requiredMark && 'gap-0')}>{label}{requiredMark ? <span aria-hidden="true" className="ml-0.5 text-base leading-none text-[#d77849]">*</span> : null}</Label>
      {canReveal ? (
        <div className="relative">
          {input}
          <button type="button" aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
            aria-pressed={visible} aria-controls={id}
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-[var(--kurio-muted)]">
            {visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
          </button>
        </div>
      ) : input}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  )
}
