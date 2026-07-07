import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** index.html の初期化スクリプトが設定した現在テーマを読む */
const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () =>
    setTheme((t) => {
      const next: Theme = t === 'light' ? 'dark' : 'light'
      localStorage.setItem('svwb-theme', next)
      return next
    })

  return { theme, toggle }
}
