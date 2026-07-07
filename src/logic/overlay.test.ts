import { describe, expect, it } from 'vitest'
import { sessionRecords } from './overlay'
import type { WinLoss } from '../types'

const rec = (wins: number, losses: number): WinLoss => ({ wins, losses })

describe('sessionRecords', () => {
  it('リセット時点のスナップショットとの差分をデッキ別に集計する', () => {
    const { decks, total } = sessionRecords({
      myDeckIds: ['A', 'B'],
      records: { 'A:X': rec(10, 5), 'A:Y': rec(3, 3), 'B:X': rec(2, 0) },
      overlayBaseline: { 'A:X': rec(8, 4), 'A:Y': rec(3, 3) },
    })
    expect(decks).toEqual([
      { deckId: 'A', wins: 2, losses: 1 }, // (10-8, 5-4) + (0, 0)
      { deckId: 'B', wins: 2, losses: 0 }, // 基準点なし → 通算そのまま
    ])
    expect(total).toEqual({ wins: 4, losses: 1 })
  })

  it('リセットしたことがなければ通算をそのまま返す', () => {
    const { total } = sessionRecords({
      myDeckIds: ['A'],
      records: { 'A:X': rec(7, 3) },
    })
    expect(total).toEqual({ wins: 7, losses: 3 })
  })

  it('修正で通算が基準点より減っても負の値にならない', () => {
    const { decks } = sessionRecords({
      myDeckIds: ['A'],
      records: { 'A:X': rec(1, 0) },
      overlayBaseline: { 'A:X': rec(5, 2) },
    })
    expect(decks[0]).toEqual({ deckId: 'A', wins: 0, losses: 0 })
  })
})
