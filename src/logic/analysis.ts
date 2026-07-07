import { cellKey } from './matchup'
import type { MatchupTable } from '../types'

type TableSlice = Pick<
  MatchupTable,
  'decks' | 'myDeckIds' | 'fieldDeckIds' | 'cells' | 'shares' | 'powerAdjust' | 'records' | 'recordBlend'
>

export interface CellEstimate {
  /** 実績ブレンド＋パワー補正込みの推定値。データなしは null */
  value: number | null
  /** 主観未入力で、対戦記録だけから推定した値かどうか */
  recordOnly: boolean
}

/**
 * セルの推定相性値。実績ブレンド（主観を priorGames 戦分として実績と加重平均）を
 * 適用した後、デッキパワー補正を掛ける。主観未入力のセルは50%を起点に実績から推定する。
 */
export function cellEstimate(
  table: TableSlice,
  powerOf: Map<string, number>,
  myDeckId: string,
  fieldDeckId: string,
): CellEstimate {
  const key = cellKey(myDeckId, fieldDeckId)
  const cell = table.cells[key]
  const record = table.records[key]
  const games = record ? record.wins + record.losses : 0

  let base: number | null = cell?.value ?? null
  let recordOnly = false
  if (table.recordBlend.enabled && record && games > 0) {
    const prior = base ?? 50
    recordOnly = base === null
    const { priorGames } = table.recordBlend
    base = (priorGames * prior + record.wins * 100) / (priorGames + games)
  }
  if (base === null) return { value: null, recordOnly: false }

  if (table.powerAdjust.enabled) {
    const diff = (powerOf.get(myDeckId) ?? 5) - (powerOf.get(fieldDeckId) ?? 5)
    base += table.powerAdjust.coef * diff
  }
  return { value: Math.min(100, Math.max(0, base)), recordOnly }
}

export interface AnalysisCtx {
  myIds: string[]
  fieldIds: string[]
  /** fieldId → 正規化済みシェア。シェアが1つも入力されていなければ均等 */
  weights: Map<string, number>
  /** 実績ブレンド＋パワー補正込みのセル値。データなしは null */
  value: (myDeckId: string, fieldDeckId: string) => number | null
}

export function buildCtx(table: TableSlice): AnalysisCtx {
  const powerOf = new Map(table.decks.map((d) => [d.id, d.power]))

  const value = (myDeckId: string, fieldDeckId: string): number | null =>
    cellEstimate(table, powerOf, myDeckId, fieldDeckId).value

  const raw = table.fieldDeckIds.map((id) => Math.max(0, table.shares[id] ?? 0))
  const total = raw.reduce((a, b) => a + b, 0)
  const weights = new Map(
    table.fieldDeckIds.map((id, i) => [
      id,
      total > 0 ? raw[i] / total : 1 / Math.max(1, table.fieldDeckIds.length),
    ]),
  )

  return { myIds: table.myDeckIds, fieldIds: table.fieldDeckIds, weights, value }
}

export interface DeckRanking {
  deckId: string
  /** シェア重み付き期待勝率。未入力なら null（入力済みセルのみで重みを再正規化） */
  expected: number | null
  entered: number
  total: number
}

export function ladderRanking(ctx: AnalysisCtx): DeckRanking[] {
  const rows = ctx.myIds.map((myId) => {
    let acc = 0
    let weightSum = 0
    let entered = 0
    for (const fieldId of ctx.fieldIds) {
      const v = ctx.value(myId, fieldId)
      if (v === null) continue
      const w = ctx.weights.get(fieldId) ?? 0
      acc += w * v
      weightSum += w
      entered++
    }
    return {
      deckId: myId,
      expected: entered > 0 && weightSum > 0 ? acc / weightSum : null,
      entered,
      total: ctx.fieldIds.length,
    }
  })
  return rows.sort((a, b) => (b.expected ?? -1) - (a.expected ?? -1))
}

export function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [head, ...rest] = items
  return [
    ...combinations(rest, size - 1).map((c) => [head, ...c]),
    ...combinations(rest, size),
  ]
}

export interface LineupResult {
  deckIds: string[]
  /** 対環境期待勝率% */
  expected: number
  /** 50%として扱った未入力セルの数 */
  assumed: number
}

const countAssumed = (ctx: AnalysisCtx, deckIds: string[]) =>
  deckIds.reduce(
    (sum, id) => sum + ctx.fieldIds.filter((f) => ctx.value(id, f) === null).length,
    0,
  )

/**
 * BO1: 各ラウンド、相手のデッキが分かってから持ち込みの中で最適な方を出せる想定（楽観モデル）。
 * 未入力セルは50%として扱う。
 */
export function lineupRankingBo1(ctx: AnalysisCtx, deckCount: 2 | 3): LineupResult[] {
  if (ctx.fieldIds.length === 0) return []
  return combinations(ctx.myIds, deckCount)
    .map((deckIds) => {
      let expected = 0
      for (const fieldId of ctx.fieldIds) {
        const w = ctx.weights.get(fieldId) ?? 0
        const best = Math.max(...deckIds.map((id) => ctx.value(id, fieldId) ?? 50))
        expected += w * best
      }
      return { deckIds, expected, assumed: countAssumed(ctx, deckIds) }
    })
    .sort((a, b) => b.expected - a.expected)
}

/**
 * 2デッキBO3コンクエスト（勝ったデッキは再使用不可・両デッキで1勝ずつ必要）のマッチ勝率。
 * 相手の出すデッキはランダム、自分は勝率最大の手を選ぶ簡易モデル。
 * p は「自分のデッキ i が相手のデッキ j に勝つ確率%」。
 */
export function conquestMatchWin(
  p: (myDeckId: string, oppDeckId: string) => number,
  myPair: [string, string],
  oppPair: [string, string],
): number {
  const memo = new Map<number, number>()
  // won はビットマスク（bit0 = ペアの1つ目で勝利済み, bit1 = 2つ目）
  const solve = (myWon: number, oppWon: number): number => {
    if (myWon === 0b11) return 1
    if (oppWon === 0b11) return 0
    const key = myWon * 4 + oppWon
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    const myAvail = [0, 1].filter((b) => !(myWon & (1 << b)))
    const oppAvail = [0, 1].filter((b) => !(oppWon & (1 << b)))
    let best = 0
    for (const i of myAvail) {
      let ev = 0
      for (const j of oppAvail) {
        const win = p(myPair[i], oppPair[j]) / 100
        ev += win * solve(myWon | (1 << i), oppWon) + (1 - win) * solve(myWon, oppWon | (1 << j))
      }
      ev /= oppAvail.length
      if (ev > best) best = ev
    }
    memo.set(key, best)
    return best
  }
  return solve(0, 0)
}

/**
 * 2デッキBO3コンクエストの持ち込みペアランキング。
 * 相手の持ち込みペアは環境シェアの積で重み付けする（異なる2デッキの組合せのみ）。
 */
export function lineupRankingBo3(ctx: AnalysisCtx): LineupResult[] {
  if (ctx.fieldIds.length < 2) return []

  const oppPairs: Array<{ pair: [string, string]; w: number }> = []
  for (let a = 0; a < ctx.fieldIds.length; a++) {
    for (let b = a + 1; b < ctx.fieldIds.length; b++) {
      oppPairs.push({
        pair: [ctx.fieldIds[a], ctx.fieldIds[b]],
        w: (ctx.weights.get(ctx.fieldIds[a]) ?? 0) * (ctx.weights.get(ctx.fieldIds[b]) ?? 0),
      })
    }
  }
  let totalW = oppPairs.reduce((s, o) => s + o.w, 0)
  if (totalW === 0) {
    // シェアの偏りでペア重みが全滅した場合は均等扱いにフォールバック
    for (const o of oppPairs) o.w = 1
    totalW = oppPairs.length
  }

  const value = (myId: string, oppId: string) => ctx.value(myId, oppId) ?? 50

  return combinations(ctx.myIds, 2)
    .map((deckIds) => {
      let expected = 0
      for (const { pair, w } of oppPairs) {
        expected +=
          (w / totalW) * conquestMatchWin(value, [deckIds[0], deckIds[1]], pair) * 100
      }
      return { deckIds, expected, assumed: countAssumed(ctx, deckIds) }
    })
    .sort((a, b) => b.expected - a.expected)
}
