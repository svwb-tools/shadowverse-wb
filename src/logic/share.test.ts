import { describe, expect, it } from 'vitest'
import { decodeTableFromHash, encodeTableToHash, parseTableJson, serializeTable } from './share'
import type { MatchupTable } from '../types'

const table: MatchupTable = {
  id: 'orig-id',
  name: '7月環境',
  decks: [
    { id: 'a', name: 'ドラゴン', className: 'ドラゴン', power: 8 },
    { id: 'b', name: '秘術W', className: 'ウィッチ', power: 7 },
  ],
  myDeckIds: ['a'],
  fieldDeckIds: ['a', 'b'],
  cells: { 'a:b': { value: 65, source: 'manual' } },
  shares: { b: 40 },
  records: { 'a:b': { wins: 7, losses: 5 } },
  recordBlend: { enabled: true, priorGames: 12 },
  defaultTab: 'tournament',
  tournamentRule: { deckCount: 2, matchType: 'bo3' },
  inputScale: 'five',
  powerAdjust: { enabled: true, coef: 3 },
  updatedAt: '2026-07-07T00:00:00.000Z',
}

describe('share round-trip', () => {
  it('URLハッシュにエンコードして復元できる', () => {
    const hash = encodeTableToHash(table)
    expect(hash.startsWith('#d=')).toBe(true)
    const decoded = decodeTableFromHash(hash)
    expect(decoded).toEqual(table)
  })

  it('JSONシリアライズから復元できる', () => {
    expect(parseTableJson(serializeTable(table))).toEqual(table)
  })

  it('配信カウンタの基準点（overlayBaseline）は共有に含めない', () => {
    const withBaseline = { ...table, overlayBaseline: { 'a:b': { wins: 3, losses: 1 } } }
    expect(serializeTable(withBaseline)).not.toContain('overlayBaseline')
    expect(decodeTableFromHash(encodeTableToHash(withBaseline))?.overlayBaseline).toBeUndefined()
  })
})

describe('parseTableJson の検証', () => {
  it('壊れたデータは null を返す', () => {
    expect(parseTableJson('not json')).toBeNull()
    expect(parseTableJson('{"v":1}')).toBeNull()
    expect(parseTableJson('{"name":"x"}')).toBeNull() // decks なし
  })

  it('未知のフィールド欠けを既定値で埋め、存在しないデッキIDへの参照を除去する', () => {
    const dirty = JSON.stringify({
      name: 'x',
      decks: [
        { id: 'a', name: 'A', className: '不正クラス', power: 99 },
        { id: 'broken' }, // name なし → 除外
      ],
      myDeckIds: ['a', 'ghost'],
      fieldDeckIds: ['a'],
      cells: { 'a:a': { value: 250 }, 'a:ghost': { value: 50 } },
      shares: { ghost: 30, a: 20 },
      records: { 'a:a': { wins: 3, losses: -2 }, 'a:ghost': { wins: 1, losses: 1 } },
    })
    const t = parseTableJson(dirty)!
    expect(t.decks).toHaveLength(1)
    expect(t.decks[0]).toMatchObject({ className: 'エルフ', power: 10 })
    expect(t.myDeckIds).toEqual(['a'])
    expect(t.cells['a:a']).toMatchObject({ value: 100, source: 'manual' })
    expect(t.cells['a:ghost']).toBeUndefined()
    expect(t.shares).toEqual({ a: 20 })
    expect(t.records).toEqual({ 'a:a': { wins: 3, losses: 0 } }) // 負値は0に、ghost参照は除去
    expect(t.recordBlend).toEqual({ enabled: true, priorGames: 10 })
    expect(t.powerAdjust).toEqual({ enabled: false, coef: 2 })
    expect(t.tournamentRule).toEqual({ deckCount: 2, matchType: 'bo1' })
  })

  it('過大な入力を制限する（文字列長・デッキ数・ペイロードサイズ・不正なID）', () => {
    const longName = 'あ'.repeat(10_000)
    const t = parseTableJson(
      JSON.stringify({
        name: longName,
        decks: [
          { id: 'ok', name: longName },
          { id: 'a:b', name: '区切り文字入りIDは拒否' },
          { id: '', name: '空IDは拒否' },
          ...Array.from({ length: 150 }, (_, i) => ({ id: `d${i}`, name: `deck${i}` })),
        ],
      }),
    )!
    expect(t.name).toHaveLength(100)
    expect(t.decks[0].name).toHaveLength(100)
    expect(t.decks.some((d) => d.id === 'a:b' || d.id === '')).toBe(false)
    expect(t.decks.length).toBeLessThanOrEqual(100)

    // 上限超過のペイロードは読み込まない
    expect(parseTableJson('x'.repeat(5_000_001))).toBeNull()

    // 解凍前の圧縮データ長も上限を超えたら解凍せずに拒否（解凍ボム対策）
    expect(decodeTableFromHash('#d=' + 'x'.repeat(400_001))).toBeNull()
  })
})
