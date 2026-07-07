import { useMemo } from 'react'
import { ladderRanking } from '../logic/matchup'
import type { MatchupTable } from '../types'
import { ClassDot } from './ClassDot'

export function LadderPanel({ table }: { table: MatchupTable }) {
  const deckOf = useMemo(() => new Map(table.decks.map((d) => [d.id, d])), [table.decks])
  const ranking = ladderRanking(table)

  if (ranking.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-muted">
        「自分が使う」デッキを追加すると、対環境の期待勝率ランキングが表示されます。
      </p>
    )
  }

  return (
    <div>
      <ol className="space-y-1.5">
        {ranking.map((row, i) => {
          const deck = deckOf.get(row.deckId)
          if (!deck) return null
          const avg = row.average
          const tone =
            avg === null ? 'text-muted/50' : avg >= 55 ? 'text-win' : avg <= 45 ? 'text-lose' : 'text-fg'
          return (
            <li
              key={row.deckId}
              className="flex items-center gap-3 rounded-lg border border-line bg-panel-2/40 px-3 py-2"
            >
              <span
                className={`w-7 text-center font-display text-lg font-bold ${
                  i === 0 && avg !== null ? 'text-gold' : 'text-muted/60'
                }`}
              >
                {i + 1}
              </span>
              <ClassDot className={deck.className} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={deck.name}>
                {deck.name}
              </span>
              <span className="font-display text-xs font-semibold text-muted">P{deck.power}</span>
              <div className="hidden w-32 sm:block">
                <div className="mb-0.5 text-right text-[10px] text-muted">
                  入力 {row.entered}/{row.total}
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-abyss">
                  <div
                    className="h-full rounded-full bg-gold/70"
                    style={{ width: `${row.total > 0 ? (row.entered / row.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className={`w-20 text-right font-display text-xl font-bold ${tone}`}>
                {avg === null ? '—' : `${avg.toFixed(1)}%`}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
        ※ 入力済みのセルのみを環境シェア均等で単純平均した期待勝率です。環境シェアの重み付けとデッキパワー補正は
        v2 で対応予定。
      </p>
    </div>
  )
}
