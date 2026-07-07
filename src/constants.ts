import type { ClassName } from './types'

// ライト(#fdfcf8)・ダーク(#121a2b)両方の背景で明度・彩度・CVD分離・コントラストを検証済みのパレット
export const CLASS_COLORS: Record<ClassName, string> = {
  エルフ: '#35a04e',
  ロイヤル: '#b8892b',
  ウィッチ: '#8f6ce8',
  ドラゴン: '#d96f2a',
  ナイトメア: '#c04a66',
  ビショップ: '#a08c3e',
  ネメシス: '#1d95c0',
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

/** 勝率に応じたセル背景色（勝ち=緑 / 負け=赤、50から離れるほど濃く）。色はテーマ変数に追従 */
export function winTone(value: number): string {
  if (value > 50) return `rgb(var(--tone-win) / ${(0.08 + ((value - 50) / 50) * 0.42).toFixed(3)})`
  if (value < 50) return `rgb(var(--tone-lose) / ${(0.08 + ((50 - value) / 50) * 0.42).toFixed(3)})`
  return 'rgb(var(--tone-flat) / 0.10)'
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
