import { Label } from '@/components/ui/label'
import { Select } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'

export function KurioSelect({ id, label, value, placeholder, options, onValueChange, requiredMark = false, error }: {
  id: string
  label: string
  value: string
  placeholder: string
  options: string[]
  onValueChange: (value: string) => void
  requiredMark?: boolean
  error?: string
}) {
  return <div className="flex flex-col gap-1.5 text-sm">
    <Label htmlFor={id} className="gap-0">{label}{requiredMark ? <span aria-hidden="true" className="ml-0.5 text-base leading-none text-[#d77849]">*</span> : null}</Label>
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger aria-required={requiredMark || undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} id={id} className="flex h-10 w-full items-center justify-between rounded-[6px] border border-[#3f2319] bg-transparent px-3 text-left text-sm text-[var(--kurio-muted)] focus:border-[#d28a4c] focus:outline-none">
        <Select.Value placeholder={placeholder} />
        <Select.Icon><ChevronDown className="size-4" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[6px] border border-[#55321f] bg-[#241612] p-1 font-['Roboto_Mono'] text-sm text-[#f5f1eb] shadow-xl">
          <Select.Viewport>
            {options.map((option) => <Select.Item key={option} value={option} className="relative flex min-h-10 cursor-pointer items-center rounded px-3 pr-9 outline-none select-none data-[highlighted]:bg-[#38220f] data-[highlighted]:text-[#e89b55] data-[state=checked]:text-[#e89b55]">
              <Select.ItemText>{option}</Select.ItemText>
              <Select.ItemIndicator className="absolute right-3"><Check className="size-4" /></Select.ItemIndicator>
            </Select.Item>)}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
    {error ? <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
  </div>
}
