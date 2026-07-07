import { describe, expect, it, vi } from 'vitest'
import { cellKey } from './logic/matchup'

// zustand/persist は window.localStorage を参照するので、window ごとスタブしてからストアを読み込む
const storage = new Map<string, string>()
const localStorageStub = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
}
vi.stubGlobal('window', { localStorage: localStorageStub })

const { useStore } = await import('./store')

describe('store', () => {
  it('テーブル作成 → デッキ追加 → セル入力 → 削除の一連の流れが動く', () => {
    const s = () => useStore.getState()

    const tableId = s().createTable({
      name: 'テスト環境',
      defaultTab: 'ladder',
      tournamentRule: { deckCount: 2, matchType: 'bo1' },
    })
    expect(s().tables[tableId]?.name).toBe('テスト環境')
    expect(s().tableOrder[0]).toBe(tableId) // 新規作成は並び順の先頭に入る

    s().addDeck(tableId, { name: 'ドラゴン', className: 'ドラゴン', power: 8 }, { my: true, field: true })
    s().addDeck(tableId, { name: 'エルフ', className: 'エルフ', power: 6 }, { my: true, field: true })
    s().addDeck(tableId, { name: '秘術W', className: 'ウィッチ', power: 7 }, { my: false, field: true })

    const t1 = s().tables[tableId]!
    expect(t1.myDeckIds).toHaveLength(2)
    expect(t1.fieldDeckIds).toHaveLength(3)
    const [dragon, elf, witch] = t1.decks

    // セル入力でミラーが auto 補完される
    s().setCell(tableId, dragon.id, elf.id, 65)
    const t2 = s().tables[tableId]!
    expect(t2.cells[cellKey(dragon.id, elf.id)]).toEqual({ value: 65, source: 'manual' })
    expect(t2.cells[cellKey(elf.id, dragon.id)]).toEqual({ value: 35, source: 'auto' })

    // 役割の付け外しではセルを消さない（再チェックで復元できる）
    s().setDeckRoles(tableId, elf.id, { my: false, field: true })
    expect(s().tables[tableId]!.myDeckIds).toEqual([dragon.id])
    expect(s().tables[tableId]!.cells[cellKey(dragon.id, elf.id)]).toBeDefined()

    // デッキ削除で関連セルごと消える
    s().setCell(tableId, dragon.id, witch.id, 45)
    s().removeDeck(tableId, elf.id)
    const t3 = s().tables[tableId]!
    expect(t3.decks.map((d) => d.name)).toEqual(['ドラゴン', '秘術W'])
    expect(t3.cells[cellKey(dragon.id, elf.id)]).toBeUndefined()
    expect(t3.cells[cellKey(elf.id, dragon.id)]).toBeUndefined()
    expect(t3.cells[cellKey(dragon.id, witch.id)]).toBeDefined()

    // localStorage に永続化されている
    expect(storage.get('svwb-matchup-v1')).toContain('テスト環境')

    s().deleteTable(tableId)
    expect(s().tables[tableId]).toBeUndefined()
    expect(s().tableOrder).not.toContain(tableId)
  })

  it('setDeckOrder でデッキの並び順を差し替えられる', () => {
    const s = () => useStore.getState()
    const tableId = s().createTable({
      name: '並べ替え',
      defaultTab: 'ladder',
      tournamentRule: { deckCount: 2, matchType: 'bo1' },
    })
    s().addDeck(tableId, { name: 'A', className: 'エルフ', power: 5 }, { my: true, field: true })
    s().addDeck(tableId, { name: 'B', className: 'ロイヤル', power: 5 }, { my: true, field: true })
    const [a, b] = s().tables[tableId]!.decks.map((d) => d.id)
    s().setDeckOrder(tableId, [b, a])
    expect(s().tables[tableId]!.decks.map((d) => d.name)).toEqual(['B', 'A'])
    s().deleteTable(tableId)
  })

  it('setTableOrder で並び順を差し替えられる', () => {
    const s = () => useStore.getState()
    const make = (name: string) =>
      s().createTable({ name, defaultTab: 'ladder', tournamentRule: { deckCount: 2, matchType: 'bo1' } })
    const a = make('A')
    const b = make('B')
    expect(s().tableOrder.slice(0, 2)).toEqual([b, a]) // 新しい方が先頭
    s().setTableOrder([a, b])
    expect(s().tableOrder).toEqual([a, b])
    s().deleteTable(a)
    s().deleteTable(b)
  })
})
