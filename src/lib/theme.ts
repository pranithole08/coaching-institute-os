const KEY = 'ci_theme'

export type Theme = 'light' | 'dark' | 'system'

export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Paint the theme onto <html>. `dark` drives the Tailwind dark variant. */
export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage unavailable */
  }
  applyTheme(theme)
}

/** Follow the OS preference while the user has "system" selected. */
export function watchSystemTheme(onChange: () => void): () => void {
  let mq: MediaQueryList
  try {
    mq = window.matchMedia('(prefers-color-scheme: dark)')
  } catch {
    return () => {}
  }
  const handler = () => {
    if (getStoredTheme() === 'system') onChange()
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
