import { describe, expect, it } from 'vitest'
import { applyCellEdit, cellKey, clearCellEdit } from './matchup'
import type { MatchupCell } from '../types'

// A, B は自分も相手も使うデッキ、C は相手しか使わないデッキ
const base = (cells: Record<string, MatchupCell> = {}) => ({
  myDeckIds: ['A', 'B'],
  fieldDeckIds: ['A', 'B', 'C'],
  cells,
})

describe('applyCellEdit', () => {
  it('手入力セルを保存し、双方向に登録されたデッキのミラーを 100-値 で自動補完する', () => {
    const cells = applyCellEdit(base(), 'A', 'B', 65)
    expect(cells[cellKey('A', 'B')]).toEqual({ value: 65, source: 'manual' })
    expect(cells[cellKey('B', 'A')]).toEqual({ value: 35, source: 'auto' })
  })

  it('相手しか使わないデッキにはミラーを作らない', () => {
    const cells = applyCellEdit(base(), 'A', 'C', 60)
    expect(cells[cellKey('A', 'C')]).toEqual({ value: 60, source: 'manual' })
    expect(cells[cellKey('C', 'A')]).toBeUndefined()
  })

  it('手入力済みのミラーは上書きしない（非対称な値を保持できる）', () => {
    // 「ドラゴンでもエルフに勝つし、エルフでもドラゴンに勝つ」を許容する
    const prev = applyCellEdit(base(), 'A', 'B', 70) // A→B 70, B→A auto 30
    const withManualMirror = applyCellEdit(base(prev), 'B', 'A', 60) // B→A を手入力で 60 に
    const after = applyCellEdit(base(withManualMirror), 'A', 'B', 55)
    expect(after[cellKey('A', 'B')]).toEqual({ value: 55, source: 'manual' })
    expect(after[cellKey('B', 'A')]).toEqual({ value: 60, source: 'manual' })
  })

  it('auto のままのミラーは再編集に追従する', () => {
    const prev = applyCellEdit(base(), 'A', 'B', 70)
    const after = applyCellEdit(base(prev), 'A', 'B', 40)
    expect(after[cellKey('B', 'A')]).toEqual({ value: 60, source: 'auto' })
  })

  it('ミラー戦（同一デッキ同士）のセルは自分自身を上書きしない', () => {
    const cells = applyCellEdit(base(), 'A', 'A', 55)
    expect(cells[cellKey('A', 'A')]).toEqual({ value: 55, source: 'manual' })
  })

  it('値を 0〜100 に丸める', () => {
    const cells = applyCellEdit(base(), 'A', 'C', 140)
    expect(cells[cellKey('A', 'C')]?.value).toBe(100)
  })
})

describe('clearCellEdit', () => {
  it('セルと auto のミラーを一緒に削除する', () => {
    const prev = applyCellEdit(base(), 'A', 'B', 70)
    const after = clearCellEdit(base(prev), 'A', 'B')
    expect(after[cellKey('A', 'B')]).toBeUndefined()
    expect(after[cellKey('B', 'A')]).toBeUndefined()
  })

  it('手入力のミラーは削除しない', () => {
    const prev = applyCellEdit(base(), 'A', 'B', 70)
    const withManualMirror = applyCellEdit(base(prev), 'B', 'A', 60)
    const after = clearCellEdit(base(withManualMirror), 'A', 'B')
    expect(after[cellKey('A', 'B')]).toBeUndefined()
    expect(after[cellKey('B', 'A')]).toEqual({ value: 60, source: 'manual' })
  })
})
