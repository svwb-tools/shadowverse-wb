import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyCellEdit, cellKey, clearCellEdit } from './logic/matchup'
import type {
  Deck,
  MatchupTable,
  PowerAdjust,
  RecordBlend,
  TabKind,
  TournamentRule,
} from './types'

const DEFAULT_POWER_ADJUST: PowerAdjust = { enabled: false, coef: 2 }
const DEFAULT_RECORD_BLEND: RecordBlend = { enabled: true, priorGames: 10 }

export interface DeckRoles {
  my: boolean
  field: boolean
}

interface CreateTableInput {
  name: string
  defaultTab?: TabKind
  tournamentRule?: TournamentRule
}

type TableMetaPatch = Partial<
  Pick<MatchupTable, 'name' | 'inputScale' | 'defaultTab' | 'tournamentRule'>
>

interface AppStore {
  tables: Record<string, MatchupTable>
  /** ホーム画面での表示順（先頭が最初）。含まれないIDは更新日時順で末尾に並ぶ */
  tableOrder: string[]
  setTableOrder: (ids: string[]) => void
  createTable: (input: CreateTableInput) => string
  deleteTable: (tableId: string) => void
  updateTableMeta: (tableId: string, patch: TableMetaPatch) => void
  addDeck: (tableId: string, deck: Omit<Deck, 'id'>, roles: DeckRoles) => void
  updateDeck: (tableId: string, deck: Deck) => void
  /** デッキの表示順を差し替える（マトリクスの行・列にも反映） */
  setDeckOrder: (tableId: string, deckIds: string[]) => void
  setDeckRoles: (tableId: string, deckId: string, roles: DeckRoles) => void
  removeDeck: (tableId: string, deckId: string) => void
  setCell: (tableId: string, myDeckId: string, fieldDeckId: string, value: number) => void
  clearCell: (tableId: string, myDeckId: string, fieldDeckId: string) => void
  setShare: (tableId: string, fieldDeckId: string, value: number) => void
  resetShares: (tableId: string) => void
  setPowerAdjust: (tableId: string, patch: Partial<PowerAdjust>) => void
  setRecordBlend: (tableId: string, patch: Partial<RecordBlend>) => void
  /** 対戦結果を1件記録する（通算勝敗カウントに加算） */
  addGameResult: (tableId: string, myDeckId: string, fieldDeckId: string, win: boolean) => void
  /** 誤入力の修正。勝敗数に差分を加える（0未満にはならない） */
  adjustRecord: (
    tableId: string,
    myDeckId: string,
    fieldDeckId: string,
    dWins: number,
    dLosses: number,
  ) => void
  /** 対戦記録の遭遇回数の比率で遭遇率スライダーを設定する */
  applySharesFromRecords: (tableId: string) => void
  /** 共有・インポートされた相性表を新しいIDでコピーとして追加する */
  importTable: (table: MatchupTable) => string
}

const withRole = (ids: string[], id: string, enabled: boolean) => {
  if (enabled) return ids.includes(id) ? ids : [...ids, id]
  return ids.filter((x) => x !== id)
}

export const useStore = create<AppStore>()(
  persist(
    (set) => {
      const mutate = (tableId: string, fn: (table: MatchupTable) => MatchupTable) =>
        set((state) => {
          const table = state.tables[tableId]
          if (!table) return state
          return {
            tables: {
              ...state.tables,
              [tableId]: { ...fn(table), updatedAt: new Date().toISOString() },
            },
          }
        })

      return {
        tables: {},
        tableOrder: [],

        setTableOrder: (ids) => set({ tableOrder: ids }),

        createTable: (input) => {
          const id = crypto.randomUUID()
          const table: MatchupTable = {
            id,
            name: input.name.trim() || '新しい相性表',
            decks: [],
            myDeckIds: [],
            fieldDeckIds: [],
            cells: {},
            shares: {},
            records: {},
            recordBlend: { ...DEFAULT_RECORD_BLEND },
            defaultTab: input.defaultTab ?? 'ladder',
            tournamentRule: input.tournamentRule ?? { deckCount: 2, matchType: 'bo1' },
            inputScale: 'percent',
            powerAdjust: { ...DEFAULT_POWER_ADJUST },
            updatedAt: new Date().toISOString(),
          }
          set((state) => ({
            tables: { ...state.tables, [id]: table },
            tableOrder: [id, ...state.tableOrder],
          }))
          return id
        },

        deleteTable: (tableId) =>
          set((state) => {
            const tables = { ...state.tables }
            delete tables[tableId]
            return { tables, tableOrder: state.tableOrder.filter((id) => id !== tableId) }
          }),

        updateTableMeta: (tableId, patch) => mutate(tableId, (t) => ({ ...t, ...patch })),

        addDeck: (tableId, deck, roles) =>
          mutate(tableId, (t) => {
            const id = crypto.randomUUID()
            return {
              ...t,
              decks: [...t.decks, { ...deck, id }],
              myDeckIds: roles.my ? [...t.myDeckIds, id] : t.myDeckIds,
              fieldDeckIds: roles.field ? [...t.fieldDeckIds, id] : t.fieldDeckIds,
            }
          }),

        updateDeck: (tableId, deck) =>
          mutate(tableId, (t) => ({
            ...t,
            decks: t.decks.map((d) => (d.id === deck.id ? deck : d)),
          })),

        setDeckOrder: (tableId, deckIds) =>
          mutate(tableId, (t) => {
            const pos = new Map(deckIds.map((id, i) => [id, i]))
            return {
              ...t,
              decks: [...t.decks].sort(
                (a, b) => (pos.get(a.id) ?? t.decks.length) - (pos.get(b.id) ?? t.decks.length),
              ),
            }
          }),

        // 行・列からの出し入れのみ。セルの入力値は保持し、再チェックで復元できるようにする
        setDeckRoles: (tableId, deckId, roles) =>
          mutate(tableId, (t) => ({
            ...t,
            myDeckIds: withRole(t.myDeckIds, deckId, roles.my),
            fieldDeckIds: withRole(t.fieldDeckIds, deckId, roles.field),
          })),

        removeDeck: (tableId, deckId) =>
          mutate(tableId, (t) => {
            const shares = { ...t.shares }
            delete shares[deckId]
            const dropKeysOf = <V,>(map: Record<string, V>) =>
              Object.fromEntries(
                Object.entries(map).filter(([key]) => {
                  const [a, b] = key.split(':')
                  return a !== deckId && b !== deckId
                }),
              )
            return {
              ...t,
              decks: t.decks.filter((d) => d.id !== deckId),
              myDeckIds: t.myDeckIds.filter((id) => id !== deckId),
              fieldDeckIds: t.fieldDeckIds.filter((id) => id !== deckId),
              cells: dropKeysOf(t.cells),
              records: dropKeysOf(t.records),
              shares,
            }
          }),

        setCell: (tableId, myDeckId, fieldDeckId, value) =>
          mutate(tableId, (t) => ({
            ...t,
            cells: applyCellEdit(t, myDeckId, fieldDeckId, value),
          })),

        clearCell: (tableId, myDeckId, fieldDeckId) =>
          mutate(tableId, (t) => ({
            ...t,
            cells: clearCellEdit(t, myDeckId, fieldDeckId),
          })),

        setShare: (tableId, fieldDeckId, value) =>
          mutate(tableId, (t) => ({
            ...t,
            shares: { ...t.shares, [fieldDeckId]: Math.min(100, Math.max(0, value)) },
          })),

        resetShares: (tableId) => mutate(tableId, (t) => ({ ...t, shares: {} })),

        setPowerAdjust: (tableId, patch) =>
          mutate(tableId, (t) => ({ ...t, powerAdjust: { ...t.powerAdjust, ...patch } })),

        setRecordBlend: (tableId, patch) =>
          mutate(tableId, (t) => ({ ...t, recordBlend: { ...t.recordBlend, ...patch } })),

        addGameResult: (tableId, myDeckId, fieldDeckId, win) =>
          mutate(tableId, (t) => {
            const key = cellKey(myDeckId, fieldDeckId)
            const current = t.records[key] ?? { wins: 0, losses: 0 }
            return {
              ...t,
              records: {
                ...t.records,
                [key]: {
                  wins: current.wins + (win ? 1 : 0),
                  losses: current.losses + (win ? 0 : 1),
                },
              },
            }
          }),

        adjustRecord: (tableId, myDeckId, fieldDeckId, dWins, dLosses) =>
          mutate(tableId, (t) => {
            const key = cellKey(myDeckId, fieldDeckId)
            const current = t.records[key] ?? { wins: 0, losses: 0 }
            const next = {
              wins: Math.max(0, current.wins + dWins),
              losses: Math.max(0, current.losses + dLosses),
            }
            const records = { ...t.records }
            if (next.wins === 0 && next.losses === 0) delete records[key]
            else records[key] = next
            return { ...t, records }
          }),

        applySharesFromRecords: (tableId) =>
          mutate(tableId, (t) => {
            const counts = new Map<string, number>()
            for (const [key, rec] of Object.entries(t.records)) {
              const fieldDeckId = key.split(':')[1]
              if (!t.fieldDeckIds.includes(fieldDeckId)) continue
              counts.set(fieldDeckId, (counts.get(fieldDeckId) ?? 0) + rec.wins + rec.losses)
            }
            const total = [...counts.values()].reduce((a, b) => a + b, 0)
            if (total === 0) return t
            const shares: MatchupTable['shares'] = {}
            for (const id of t.fieldDeckIds) {
              shares[id] = Math.round(((counts.get(id) ?? 0) / total) * 100)
            }
            return { ...t, shares }
          }),

        importTable: (table) => {
          const id = crypto.randomUUID()
          set((state) => ({
            tables: {
              ...state.tables,
              [id]: { ...table, id, updatedAt: new Date().toISOString() },
            },
            tableOrder: [id, ...state.tableOrder],
          }))
          return id
        },
      }
    },
    {
      name: 'svwb-matchup-v1',
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { tables?: Record<string, MatchupTable> }
        for (const table of Object.values(state?.tables ?? {})) {
          table.powerAdjust ??= { ...DEFAULT_POWER_ADJUST }
          table.records ??= {}
          table.recordBlend ??= { ...DEFAULT_RECORD_BLEND }
        }
        return state as { tables: Record<string, MatchupTable> }
      },
    },
  ),
)
