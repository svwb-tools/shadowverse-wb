import type { MatchupCell, MatchupTable } from '../types'

type TableSlice = Pick<MatchupTable, 'cells' | 'myDeckIds' | 'fieldDeckIds'>

export const cellKey = (myDeckId: string, fieldDeckId: string) => `${myDeckId}:${fieldDeckId}`

const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)))

/**
 * セルを手入力で更新する。
 * 相手側のミラーセル（fieldDeck を自分が使い、myDeck が環境にもいる場合）が
 * 未入力または auto のときだけ 100-値 で自動補完する。手入力セルは上書きしない。
 */
export function applyCellEdit(
  table: TableSlice,
  myDeckId: string,
  fieldDeckId: string,
  value: number,
): Record<string, MatchupCell> {
  const v = clamp(value)
  const cells: Record<string, MatchupCell> = {
    ...table.cells,
    [cellKey(myDeckId, fieldDeckId)]: { value: v, source: 'manual' },
  }
  const mirrorExists =
    myDeckId !== fieldDeckId &&
    table.myDeckIds.includes(fieldDeckId) &&
    table.fieldDeckIds.includes(myDeckId)
  if (mirrorExists) {
    const mirrorKey = cellKey(fieldDeckId, myDeckId)
    const existing = table.cells[mirrorKey]
    if (!existing || existing.source === 'auto') {
      cells[mirrorKey] = { value: 100 - v, source: 'auto' }
    }
  }
  return cells
}

/** セルを削除する。対になる auto セルも一緒に消す（手入力のミラーは残す）。 */
export function clearCellEdit(
  table: TableSlice,
  myDeckId: string,
  fieldDeckId: string,
): Record<string, MatchupCell> {
  const cells = { ...table.cells }
  delete cells[cellKey(myDeckId, fieldDeckId)]
  if (myDeckId !== fieldDeckId) {
    const mirrorKey = cellKey(fieldDeckId, myDeckId)
    if (cells[mirrorKey]?.source === 'auto') delete cells[mirrorKey]
  }
  return cells
}

export interface DeckRanking {
  deckId: string
  /** 入力済みセルの単純平均（シェア均等扱い）。未入力なら null */
  average: number | null
  entered: number
  total: number
}

/** 自分の各デッキの対環境期待勝率（入力済みセルのみで平均）を勝率降順で返す */
export function ladderRanking(table: TableSlice): DeckRanking[] {
  const rows = table.myDeckIds.map((myId) => {
    const values = table.fieldDeckIds
      .map((fieldId) => table.cells[cellKey(myId, fieldId)])
      .filter((c): c is MatchupCell => c !== undefined)
      .map((c) => c.value)
    const entered = values.length
    const average = entered > 0 ? values.reduce((a, b) => a + b, 0) / entered : null
    return { deckId: myId, average, entered, total: table.fieldDeckIds.length }
  })
  return rows.sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
}
