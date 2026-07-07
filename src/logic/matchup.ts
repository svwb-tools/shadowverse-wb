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

