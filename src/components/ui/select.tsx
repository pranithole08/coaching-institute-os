import {
  useState,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'
import { ChevronDown } from 'lucide-react'

const SelectContext = createContext<{
  value: string
  onValueChange: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  disabled: boolean
  labels: Record<string, string>
  registerLabel: (value: string, label: string) => void
}>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  disabled: false,
  labels: {},
  registerLabel: () => {},
})

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: ReactNode
}

export function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  disabled = false,
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const labelsRef = useRef<Record<string, string>>({})
  const [, bumpLabels] = useState(0)

  const value = controlledValue ?? internalValue
  const handleChange = (v: string) => {
    setInternalValue(v)
    onValueChange?.(v)
    setOpen(false)
  }

  // Items register their visible text so the trigger can show "All classes"
  // instead of the raw value it stores.
  const registerLabel = useCallback((itemValue: string, label: string) => {
    if (labelsRef.current[itemValue] === label) return
    labelsRef.current[itemValue] = label
    bumpLabels((n) => n + 1)
  }, [])

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleChange,
        open,
        setOpen,
        disabled,
        labels: labelsRef.current,
        registerLabel,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, disabled } = useContext(SelectContext)
  return (
    <button
      type="button"
      disabled={disabled}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={() => !disabled && setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown size={16} className="opacity-50" />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useContext(SelectContext)
  const text = labels[value] ?? value
  return <span className={cn(!text && 'text-muted-foreground')}>{text || placeholder}</span>
}

export function SelectContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen, disabled } = useContext(SelectContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  if (disabled) return null

  // Kept mounted while closed so each item can register its label for the
  // trigger; `hidden` keeps it out of the layout and the a11y tree.
  return (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        'absolute z-50 mt-1 min-w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
        !open && 'hidden',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

export function SelectItem({ value, className, children, ...props }: SelectItemProps) {
  const ctx = useContext(SelectContext)
  const selected = ctx.value === value
  const { registerLabel } = ctx
  const label = typeof children === 'string' ? children : null

  useEffect(() => {
    if (label) registerLabel(value, label)
  }, [label, value, registerLabel])

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent',
        selected && 'bg-accent',
        className,
      )}
      onClick={(e) => {
        // The trigger is often inside a <label>; without this the label's
        // default activation re-clicks the trigger and reopens the list.
        e.preventDefault()
        ctx.onValueChange(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ctx.onValueChange(value)
        }
      }}
      {...props}
    >
      {children}
    </div>
  )
}
