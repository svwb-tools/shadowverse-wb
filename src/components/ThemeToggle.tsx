import { useTheme } from '../theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title="ライト／ダークの切替"
      className="shrink-0 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-muted hover:text-fg"
    >
      {theme === 'dark' ? '☀ ライト' : '☾ ダーク'}
    </button>
  )
}
