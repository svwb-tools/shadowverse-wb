import type { ClassName } from './types'

export const CLASS_COLORS: Record<ClassName, string> = {
  エルフ: '#58c471',
  ロイヤル: '#e0b74a',
  ウィッチ: '#9d7bef',
  ドラゴン: '#e8813d',
  ナイトメア: '#c94f6d',
  ビショップ: '#d8cfa8',
  ネメシス: '#55b8d4',
}

/** 5段階入力と内部の勝率%の対応 */
export const FIVE_STEPS = [
  { label: '有利', value: 70 },
  { label: '微有利', value: 60 },
  { label: '五分', value: 50 },
  { label: '微不利', value: 40 },
  { label: '不利', value: 30 },
] as const

export function fiveLabel(value: number): string {
  return FIVE_STEPS.find((s) => s.value === value)?.label ?? `${value}`
}

/** 勝率に応じたセル背景色（勝ち=緑 / 負け=赤、50から離れるほど濃く） */
export function winTone(value: number): string {
  if (value > 50) return `rgba(62, 207, 154, ${(0.08 + ((value - 50) / 50) * 0.42).toFixed(3)})`
  if (value < 50) return `rgba(227, 93, 106, ${(0.08 + ((50 - value) / 50) * 0.42).toFixed(3)})`
  return 'rgba(142, 151, 173, 0.10)'
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
