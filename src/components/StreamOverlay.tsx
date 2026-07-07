import { useEffect } from 'react'
import { sessionRecords } from '../logic/overlay'
import { useStore } from '../store'
import { ClassDot } from './ClassDot'

/** OBSのクロマキーで抜くための背景色（グリーンバック） */
const CHROMA_GREEN = '#00ff00'
/** 配信画面上で読めるよう、テーマに依存しない固定の暗色パネルで描く */
const PANEL = 'rgba(10, 15, 28, 0.94)'
const INK = '#f2f0e9'
const INK_MUTED = 'rgba(242, 240, 233, 0.65)'
const GOLD = '#f2c96d'

export function StreamOverlay({ tableId }: { tableId: string }) {
  const table = useStore((s) => s.tables[tableId])

  // 本体ウィンドウでの記録を localStorage 経由で受け取って即時反映する
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'svwb-matchup-v1') void useStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    document.title = table ? `配信オーバーレイ - ${table.name}` : '配信オーバーレイ'
  }, [table])

  if (!table) {
    return (
      <div className="fixed inset-0 p-6" style={{ backgroundColor: CHROMA_GREEN }}>
        <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: PANEL, color: INK }}>
          相性表が見つかりません。アプリ側の「配信オーバーレイを開く」から開き直してください。
        </p>
      </div>
    )
  }

  const { decks, total } = sessionRecords(table)
  const deckOf = new Map(table.decks.map((d) => [d.id, d]))
  const totalGames = total.wins + total.losses

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
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ backgroundColor: PANEL, color: INK }}
            >
              <ClassDot className={deck.className} size={10} />
              <span className="min-w-0 max-w-52 flex-1 truncate text-base font-bold" title={deck.name}>
                {deck.name}
              </span>
              <span className="font-display text-2xl font-bold tabular-nums">
                {row.wins}
                <span className="mx-0.5 text-sm" style={{ color: INK_MUTED }}>
                  勝
                </span>
                {row.losses}
                <span className="ml-0.5 text-sm" style={{ color: INK_MUTED }}>
                  敗
                </span>
              </span>
              <span
                className="w-14 text-right font-display text-lg font-semibold tabular-nums"
                style={{ color: INK_MUTED }}
              >
                {games > 0 ? `${Math.round((row.wins / games) * 100)}%` : '—'}
              </span>
            </div>
          )
        })}

        <div
          className="flex items-center gap-3 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: PANEL, color: GOLD }}
        >
          <span className="min-w-0 flex-1 text-base font-bold tracking-wide">TOTAL</span>
          <span className="font-display text-2xl font-bold tabular-nums">
            {total.wins}
            <span className="mx-0.5 text-sm" style={{ color: INK_MUTED }}>
              勝
            </span>
            {total.losses}
            <span className="ml-0.5 text-sm" style={{ color: INK_MUTED }}>
              敗
            </span>
          </span>
          <span className="w-14 text-right font-display text-lg font-semibold tabular-nums">
            {totalGames > 0 ? `${Math.round((total.wins / totalGames) * 100)}%` : '—'}
          </span>
        </div>

        {decks.length === 0 && (
          <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: PANEL, color: INK }}>
            「自分が使う」デッキを登録すると、ここにデッキごとの戦績が表示されます。
          </p>
        )}
      </div>
    </div>
  )
}
