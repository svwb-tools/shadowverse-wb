import { useMemo } from 'react'
import { buildCtx, lineupRankingBo1, lineupRankingBo3 } from '../logic/analysis'
import { useStore } from '../store'
import type { MatchupTable, TournamentRule } from '../types'
import { ClassDot } from './ClassDot'

const RULES: Array<TournamentRule & { label: string; desc: string }> = [
  { deckCount: 2, matchType: 'bo1', label: '2デッキ BO1', desc: '2デッキ持ち込み・1本勝負' },
  { deckCount: 3, matchType: 'bo1', label: '3デッキ BO1', desc: '3デッキ持ち込み・1本勝負' },
  {
    deckCount: 2,
    matchType: 'bo3',
    label: '2デッキ BO3',
    desc: '勝利デッキ再使用不可・両デッキで1勝ずつ',
  },
]

const SHOW_MAX = 8

export function TournamentPanel({ table }: { table: MatchupTable }) {
  const { updateTableMeta } = useStore()
  const rule = table.tournamentRule
  const deckOf = useMemo(() => new Map(table.decks.map((d) => [d.id, d])), [table.decks])
  const ctx = useMemo(() => buildCtx(table), [table])
  const results = useMemo(
    () => (rule.matchType === 'bo1' ? lineupRankingBo1(ctx, rule.deckCount) : lineupRankingBo3(ctx)),
    [ctx, rule],
  )

  const notReady =
    ctx.myIds.length < rule.deckCount
      ? `「自分が使う」デッキを${rule.deckCount}個以上登録してください（現在 ${ctx.myIds.length}個）。`
      : ctx.fieldIds.length === 0
        ? '「環境にいる」デッキを登録すると持ち込みセットを計算できます。'
        : rule.matchType === 'bo3' && ctx.fieldIds.length < 2
          ? 'BO3の計算には「環境にいる」デッキが2つ以上必要です（相手も2デッキ持ち込むため）。'
          : null

  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {RULES.map((r) => {
          const selected = r.deckCount === rule.deckCount && r.matchType === rule.matchType
          return (
            <button
              key={r.label}
              onClick={() =>
                updateTableMeta(table.id, {
                  tournamentRule: { deckCount: r.deckCount, matchType: r.matchType },
                })
              }
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-gold bg-gold/10'
                  : 'border-line bg-panel-2 hover:border-muted/60'
              }`}
            >
              <div className={`font-display text-base font-semibold ${selected ? 'text-gold-bright' : ''}`}>
                {r.label}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">{r.desc}</div>
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold tracking-wide">最適持ち込みセット</h3>
        {notReady ? (
          <p className="rounded-lg border border-dashed border-line bg-panel-2 px-4 py-6 text-center text-xs text-muted">
            {notReady}
          </p>
        ) : (
          <>
            <ol className="space-y-2">
              {results.slice(0, SHOW_MAX).map((r, i) => (
                <li
                  key={r.deckIds.join(':')}
                  className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3.5 py-2.5"
                >
                  <span
                    className={`w-7 text-center font-display text-lg font-bold ${
                      i === 0 ? 'text-gold' : 'text-muted/60'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                    {r.deckIds.map((id) => {
                      const deck = deckOf.get(id)
                      if (!deck) return null
                      return (
                        <span key={id} className="flex items-center gap-1.5 text-sm font-medium">
                          <ClassDot className={deck.className} size={7} />
                          <span className="max-w-36 truncate" title={deck.name}>
                            {deck.name}
                          </span>
                        </span>
                      )
                    })}
                    {r.assumed > 0 && (
                      <span className="text-[10px] text-gold/80">未入力{r.assumed}セルを50%扱い</span>
                    )}
                  </div>
                  <span
                    className={`w-20 shrink-0 text-right font-display text-xl font-bold ${
                      r.expected >= 55 ? 'text-win' : r.expected <= 45 ? 'text-lose' : 'text-fg'
                    }`}
                  >
                    {r.expected.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ol>
            {results.length > SHOW_MAX && (
              <p className="mt-1.5 px-1 text-[11px] text-muted">他 {results.length - SHOW_MAX} 通り</p>
            )}
            <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
              {rule.matchType === 'bo1'
                ? '※ 各ラウンド、相手のデッキが分かってから持ち込み内の最適なデッキを出せる想定の楽観値です（実際は同時選択のためやや上振れします）。'
                : '※ BO3はコンクエスト式（勝利デッキ再使用不可）のマッチ勝率。相手の出し方はランダム・自分は最適選択の簡易モデルで、相手の持ち込みペアは遭遇率のかけ合わせで重み付けしています。'}
              遭遇率{ctx.fieldIds.some((id) => (table.shares[id] ?? 0) > 0) ? 'で重み付け' : 'は均等扱い'}
              ・デッキパワー補正{table.powerAdjust.enabled ? `ON（係数${table.powerAdjust.coef}）` : 'OFF'}
              ・実績ブレンド
              {table.recordBlend.enabled ? `ON（主観=${table.recordBlend.priorGames}戦分）` : 'OFF'}。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
