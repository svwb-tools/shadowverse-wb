import { useEffect } from 'react'
import { sessionRecords } from '../logic/overlay'
import { useStore } from '../store'
import { ClassDot } from './ClassDot'

/** OBSのクロマキーで抜くための背景色（グリーンバック） */
const CHROMA_GREEN = '#00ff00'
const DEFAULT_INK = '#ffffff'
const GOLD = '#f2c96d'
/** 縁取り影。文字色が明るければ暗い影、暗い文字色なら白い影に切り替えて読みやすくする */
const SHADOW_DARK = '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.6)'
const SHADOW_LIGHT = '0 1px 2px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,0.7)'

const isLightColor = (hex: string): boolean => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 140
}

export function StreamOverlay({ tableId }: { tableId: string }) {
  const table = useStore((s) => s.tables[tableId])

  // 本体ウィンドウでの記録を localStorage 経由で受け取って即時反映する。
  // storage イベントが主で、取りこぼし対策に数秒ごとの再読込も併用する
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'svwb-matchup-v1') void useStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    const poll = setInterval(() => void useStore.persist.rehydrate(), 3000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    document.title = table ? `配信オーバーレイ - ${table.name}` : '配信オーバーレイ'
  }, [table])

  if (!table) {
    return (
      <div className="fixed inset-0 p-6" style={{ backgroundColor: CHROMA_GREEN }}>
        <p className="text-sm font-bold" style={{ color: DEFAULT_INK, textShadow: SHADOW_DARK }}>
          相性表が見つかりません。アプリ側の「配信オーバーレイを開く」から開き直してください。
        </p>
      </div>
    )
  }

  const { decks, total } = sessionRecords(table)
  const deckOf = new Map(table.decks.map((d) => [d.id, d]))
  const totalGames = total.wins + total.losses

  // 文字色は配信者向け設定に従う（未設定なら白＋TOTALのみ金）
  const ink = table.overlayTextColor ?? DEFAULT_INK
  const inkMuted = `${ink}c0`
  const totalInk = table.overlayTextColor ?? GOLD
  const textShadow = isLightColor(ink) ? SHADOW_DARK : SHADOW_LIGHT

  return (
    <div className="fixed inset-0 overflow-auto p-4" style={{ backgroundColor: CHROMA_GREEN }}>
      <div className="flex w-fit min-w-72 flex-col gap-2">
        {decks.map((row) => {
          const deck = deckOf.get(row.deckId)
          if (!deck) return null
          const games = row.wins + row.losses
          return (
            <div
              key={row.deckId}
              className="flex items-center gap-3 px-1 py-1"
              style={{ color: ink, textShadow }}
            >
              <ClassDot className={deck.className} size={10} />
              <span className="min-w-0 max-w-52 flex-1 truncate text-base font-bold" title={deck.name}>
                {deck.name}
              </span>
              <span className="font-display text-2xl font-bold tabular-nums">
                {row.wins}
                <span className="mx-0.5 text-sm" style={{ color: inkMuted }}>
                  勝
                </span>
                {row.losses}
                <span className="ml-0.5 text-sm" style={{ color: inkMuted }}>
                  敗
                </span>
              </span>
              <span
                className="w-14 text-right font-display text-lg font-semibold tabular-nums"
                style={{ color: inkMuted }}
              >
                {games > 0 ? `${Math.round((row.wins / games) * 100)}%` : '—'}
              </span>
            </div>
          )
        })}

        <div
          className="flex items-center gap-3 px-1 py-1"
          style={{ color: totalInk, textShadow }}
        >
          <span className="min-w-0 flex-1 text-base font-bold tracking-wide">TOTAL</span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {total.wins}
            <span className="mx-0.5 text-sm" style={{ color: inkMuted }}>
              勝
            </span>
            {total.losses}
            <span className="ml-0.5 text-sm" style={{ color: inkMuted }}>
              敗
            </span>
          </span>
          <span className="w-14 text-right font-display text-lg font-semibold tabular-nums">
            {totalGames > 0 ? `${Math.round((total.wins / totalGames) * 100)}%` : '—'}
          </span>
        </div>

        {decks.length === 0 && (
          <p className="text-sm font-bold" style={{ color: ink, textShadow }}>
            「自分が使う」デッキを登録すると、ここにデッキごとの戦績が表示されます。
          </p>
        )}
      </div>
    </div>
  )
}
