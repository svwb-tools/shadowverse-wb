import type { MatchupTable, WinLoss } from '../types'

export interface DeckSession extends WinLoss {
  deckId: string
}

/**
 * 配信オーバーレイ用の「今日の分」の勝敗。
 * 通算カウントからリセット時点のスナップショットを差し引く（修正で通算が減った場合は0で止める）。
 * リセットしたことがなければ通算そのものを返す。
 */
export function sessionRecords(
  table: Pick<MatchupTable, 'myDeckIds' | 'records' | 'overlayBaseline'>,
): { decks: DeckSession[]; total: WinLoss } {
  const baseline = table.overlayBaseline ?? {}
  const decks = table.myDeckIds.map((deckId) => {
    let wins = 0
    let losses = 0
    for (const [key, rec] of Object.entries(table.records)) {
      if (!key.startsWith(`${deckId}:`)) continue
      const base = baseline[key]
      wins += Math.max(0, rec.wins - (base?.wins ?? 0))
      losses += Math.max(0, rec.losses - (base?.losses ?? 0))
    }
    return { deckId, wins, losses }
  })
  const total = decks.reduce(
    (acc, d) => ({ wins: acc.wins + d.wins, losses: acc.losses + d.losses }),
    { wins: 0, losses: 0 },
  )
  return { decks, total }
}
