import { useStore } from '../store'
import type { MatchupTable, TournamentRule } from '../types'

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

export function TournamentPanel({ table }: { table: MatchupTable }) {
  const { updateTableMeta } = useStore()
  const rule = table.tournamentRule

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
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
                  : 'border-line bg-panel-2/40 hover:border-muted/60'
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
      <div className="mt-3 rounded-lg border border-dashed border-line bg-panel-2/30 px-4 py-6 text-center">
        <p className="font-display text-sm font-semibold tracking-wide text-muted">
          最適持ち込みセット計算 — v2 で実装予定
        </p>
        <p className="mx-auto mt-1.5 max-w-lg text-[12px] leading-relaxed text-muted/80">
          相性値と環境シェアから、選択中の大会形式で期待勝率が最大になる持ち込みの組合せをランキング表示します（BO1
          は相手デッキを見て最適選択できる想定、BO3 はコンクエスト式の簡易モデル）。
        </p>
      </div>
    </div>
  )
}
