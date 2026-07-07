import { describe, expect, it } from 'vitest'
import {
  buildCtx,
  combinations,
  conquestMatchWin,
  ladderRanking,
  lineupRankingBo1,
  lineupRankingBo3,
} from './analysis'
import type { Deck, MatchupCell, PowerAdjust } from '../types'

const deck = (id: string, power = 5): Deck => ({ id, name: id, className: 'エルフ', power })
const cell = (value: number): MatchupCell => ({ value, source: 'manual' })

const makeTable = (over: {
  decks?: Deck[]
  myDeckIds?: string[]
  fieldDeckIds?: string[]
  cells?: Record<string, MatchupCell>
  shares?: Record<string, number>
  powerAdjust?: PowerAdjust
}) => ({
  decks: over.decks ?? [deck('A'), deck('B'), deck('X'), deck('Y')],
  myDeckIds: over.myDeckIds ?? ['A', 'B'],
  fieldDeckIds: over.fieldDeckIds ?? ['X', 'Y'],
  cells: over.cells ?? {},
  shares: over.shares ?? {},
  powerAdjust: over.powerAdjust ?? { enabled: false, coef: 2 },
})

describe('buildCtx', () => {
  it('シェア未入力なら均等、入力があれば正規化した重みを返す', () => {
    const uniform = buildCtx(makeTable({}))
    expect(uniform.weights.get('X')).toBeCloseTo(0.5)

    const weighted = buildCtx(makeTable({ shares: { X: 75, Y: 25 } }))
    expect(weighted.weights.get('X')).toBeCloseTo(0.75)
    expect(weighted.weights.get('Y')).toBeCloseTo(0.25)
  })

  it('パワー補正ONのとき 値 + coef×(自パワー−相手パワー) を0〜100で返す', () => {
    const table = makeTable({
      decks: [deck('A', 8), deck('B', 5), deck('X', 4), deck('Y', 5)],
      cells: { 'A:X': cell(60), 'A:Y': cell(98) },
      powerAdjust: { enabled: true, coef: 2 },
    })
    const ctx = buildCtx(table)
    expect(ctx.value('A', 'X')).toBe(68) // 60 + 2×(8−4)
    expect(ctx.value('A', 'Y')).toBe(100) // 98 + 6 → クランプ
    expect(ctx.value('B', 'X')).toBeNull() // 未入力は補正しても null
  })
})

describe('ladderRanking', () => {
  it('シェア重み付きの期待勝率を降順で返し、未入力セルは重みを再正規化して除外する', () => {
    const table = makeTable({
      cells: { 'A:X': cell(60), 'A:Y': cell(40), 'B:X': cell(70) },
      shares: { X: 75, Y: 25 },
    })
    const ranking = ladderRanking(buildCtx(table))
    // B は X のみ入力 → 70。A は 0.75×60 + 0.25×40 = 55
    expect(ranking[0]).toMatchObject({ deckId: 'B', entered: 1 })
    expect(ranking[0].expected).toBeCloseTo(70)
    expect(ranking[1].expected).toBeCloseTo(55)
  })
})

describe('combinations', () => {
  it('nCk の組合せを列挙する', () => {
    expect(combinations(['a', 'b', 'c'], 2)).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ])
    expect(combinations(['a'], 2)).toEqual([])
  })
})

describe('lineupRankingBo1', () => {
  it('相手ごとに持ち込み内の最良デッキを出せる想定で期待勝率を計算する', () => {
    // A は X に強く Y に弱い、B はその逆 → ペア{A,B}は常に70を出せる
    const table = makeTable({
      cells: { 'A:X': cell(70), 'A:Y': cell(30), 'B:X': cell(30), 'B:Y': cell(70) },
    })
    const [top] = lineupRankingBo1(buildCtx(table), 2)
    expect(top.deckIds.sort()).toEqual(['A', 'B'])
    expect(top.expected).toBeCloseTo(70)
    expect(top.assumed).toBe(0)
  })

  it('未入力セルは50%として扱い、件数を報告する', () => {
    const table = makeTable({ cells: { 'A:X': cell(70) } })
    const [top] = lineupRankingBo1(buildCtx(table), 2)
    expect(top.assumed).toBe(3) // A:Y, B:X, B:Y
  })
})

describe('conquestMatchWin', () => {
  const pairs: [string, string] = ['A', 'B']
  const opp: [string, string] = ['X', 'Y']

  it('全マッチアップ50%ならマッチ勝率も50%', () => {
    expect(conquestMatchWin(() => 50, pairs, opp)).toBeCloseTo(0.5)
  })

  it('全勝なら1、全敗なら0', () => {
    expect(conquestMatchWin(() => 100, pairs, opp)).toBe(1)
    expect(conquestMatchWin(() => 0, pairs, opp)).toBe(0)
  })

  it('片方のデッキで絶対に勝てないなら、両デッキ勝利条件は満たせず0', () => {
    const p = (my: string) => (my === 'A' ? 100 : 0)
    expect(conquestMatchWin(p, pairs, opp)).toBe(0)
  })

  it('相性が良いほどマッチ勝率が上がる', () => {
    const low = conquestMatchWin(() => 45, pairs, opp)
    const high = conquestMatchWin(() => 60, pairs, opp)
    expect(high).toBeGreaterThan(low)
    expect(low).toBeLessThan(0.5)
  })
})

describe('lineupRankingBo3', () => {
  it('相性の良いペアが上位に来る', () => {
    const table = makeTable({
      decks: [deck('A'), deck('B'), deck('C'), deck('X'), deck('Y')],
      myDeckIds: ['A', 'B', 'C'],
      cells: {
        'A:X': cell(65), 'A:Y': cell(65),
        'B:X': cell(60), 'B:Y': cell(60),
        'C:X': cell(35), 'C:Y': cell(35),
      },
    })
    const results = lineupRankingBo3(buildCtx(table))
    expect(results[0].deckIds.sort()).toEqual(['A', 'B'])
    expect(results[0].expected).toBeGreaterThan(50)
    expect(results.at(-1)!.deckIds).toContain('C')
  })

  it('環境デッキが2つ未満なら空を返す', () => {
    const table = makeTable({ fieldDeckIds: ['X'] })
    expect(lineupRankingBo3(buildCtx(table))).toEqual([])
  })
})
