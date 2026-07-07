import { useMemo } from 'react'
import { buildCtx, ladderRanking } from '../logic/analysis'
import { useStore } from '../store'
import type { MatchupTable } from '../types'
import { ClassDot } from './ClassDot'
import { ScatterView, type ScatterPoint } from './ScatterView'

export function LadderPanel({ table }: { table: MatchupTable }) {
  const { setShare, resetShares } = useStore()
  const deckOf = useMemo(() => new Map(table.decks.map((d) => [d.id, d])), [table.decks])
  const ctx = useMemo(() => buildCtx(table), [table])
  const ranking = useMemo(() => ladderRanking(ctx), [ctx])
  const hasShares = table.fieldDeckIds.some((id) => (table.shares[id] ?? 0) > 0)

  if (table.myDeckIds.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-muted">
        「自分が使う」デッキを追加すると、対環境の期待勝率ランキングが表示されます。
      </p>
    )
  }

  // 散布図: 自分が使うデッキは期待勝率、環境のみのデッキは自分のデッキへの勝率から逆算
  const points: ScatterPoint[] = table.decks.flatMap((deck) => {
    if (table.myDeckIds.includes(deck.id)) {
      const row = ranking.find((r) => r.deckId === deck.id)
      if (!row || row.expected === null) return []
      return [{ deck, expected: row.expected, entered: row.entered, total: row.total }]
    }
    if (table.fieldDeckIds.includes(deck.id)) {
      const values = table.myDeckIds
        .map((myId) => ctx.value(myId, deck.id))
        .filter((v): v is number => v !== null)
      if (values.length === 0) return []
      const expected = 100 - values.reduce((a, b) => a + b, 0) / values.length
      return [
        {
          deck,
          expected,
          entered: values.length,
          total: table.myDeckIds.length,
          estimated: true,
        },
      ]
    }
    return []
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* デッキ遭遇率の入力 */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-wide">デッキの遭遇率</h3>
            {hasShares && (
              <button
                onClick={() => resetShares(table.id)}
                className="text-[11px] text-muted underline transition hover:text-fg"
              >
                均等に戻す
              </button>
            )}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            それぞれのデッキとどれくらい当たりそうか、の見込みです。この比率を重みにして期待勝率を計算します。
          </p>
          {table.fieldDeckIds.length === 0 ? (
            <p className="text-xs text-muted">「環境にいる」デッキがありません。</p>
          ) : (
            <ul className="space-y-2.5">
              {table.decks
                .filter((d) => table.fieldDeckIds.includes(d.id))
                .map((deck) => (
                  <li key={deck.id} className="flex items-center gap-2">
                    <ClassDot className={deck.className} size={7} />
                    <span className="w-24 shrink-0 truncate text-xs" title={deck.name}>
                      {deck.name}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={table.shares[deck.id] ?? 0}
                      onChange={(e) => setShare(table.id, deck.id, Number(e.target.value))}
                      className="min-w-0 flex-1"
                    />
                    <span className="w-10 shrink-0 text-right font-display text-xs font-semibold text-muted">
                      {Math.round((ctx.weights.get(deck.id) ?? 0) * 100)}%
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            {hasShares
              ? '右の%は、合計が100%になるように換算した想定遭遇率です。'
              : '未設定のため、いまは全デッキと同じ割合で当たる前提で計算しています。よく当たるデッキのスライダーを大きくしてください。'}
          </p>
        </div>

        {/* ランキング */}
        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-wide">期待勝率ランキング</h3>
          <ol className="space-y-2">
            {ranking.map((row, i) => {
              const deck = deckOf.get(row.deckId)
              if (!deck) return null
              const v = row.expected
              const tone =
                v === null ? 'text-muted/50' : v >= 55 ? 'text-win' : v <= 45 ? 'text-lose' : 'text-fg'
              return (
                <li
                  key={row.deckId}
                  className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3.5 py-2.5"
                >
                  <span
                    className={`w-7 text-center font-display text-lg font-bold ${
                      i === 0 && v !== null ? 'text-gold' : 'text-muted/60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <ClassDot className={deck.className} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium" title={deck.name}>
                    {deck.name}
                  </span>
                  <span className="font-display text-xs font-semibold text-muted">P{deck.power}</span>
                  <div className="hidden w-28 sm:block">
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
                    {v === null ? '—' : `${v.toFixed(1)}%`}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
            ※ 遭遇率{hasShares ? 'で重み付け' : 'は均等扱い'}・デッキパワー補正
            {table.powerAdjust.enabled ? `ON（係数${table.powerAdjust.coef}）` : 'OFF'}
            。未入力セルは除外し、重みを再正規化して計算しています。
          </p>
        </div>
      </div>

      {points.length > 0 && <ScatterView points={points} />}
    </div>
  )
}
