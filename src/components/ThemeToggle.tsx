import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { applyTheme, getStoredTheme, setStoredTheme, watchSystemTheme, type Theme } from '@/lib/theme'

const ORDER: Theme[] = ['light', 'dark', 'system']

const LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => watchSystemTheme(() => applyTheme(getStoredTheme())), [])

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    setTheme(next)
    setStoredTheme(next)
  }

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cycle}
      className={cn('justify-start gap-2', className)}
      aria-label={`Theme: ${LABEL[theme]}. Switch theme`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <Icon className="size-3.5" />
      <span className="text-xs">{LABEL[theme]}</span>
    </Button>
  )
}
