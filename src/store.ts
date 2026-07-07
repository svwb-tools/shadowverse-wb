import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyCellEdit, clearCellEdit } from './logic/matchup'
import type { Deck, MatchupTable, PowerAdjust, TabKind, TournamentRule } from './types'

const DEFAULT_POWER_ADJUST: PowerAdjust = { enabled: false, coef: 2 }

export interface DeckRoles {
  my: boolean
  field: boolean
}

interface CreateTableInput {
  name: string
  defaultTab: TabKind
  tournamentRule: TournamentRule
}

type TableMetaPatch = Partial<
  Pick<MatchupTable, 'name' | 'inputScale' | 'defaultTab' | 'tournamentRule'>
>

interface AppStore {
  tables: Record<string, MatchupTable>
  createTable: (input: CreateTableInput) => string
  deleteTable: (tableId: string) => void
  updateTableMeta: (tableId: string, patch: TableMetaPatch) => void
  addDeck: (tableId: string, deck: Omit<Deck, 'id'>, roles: DeckRoles) => void
  updateDeck: (tableId: string, deck: Deck) => void
  setDeckRoles: (tableId: string, deckId: string, roles: DeckRoles) => void
  removeDeck: (tableId: string, deckId: string) => void
  setCell: (tableId: string, myDeckId: string, fieldDeckId: string, value: number) => void
  clearCell: (tableId: string, myDeckId: string, fieldDeckId: string) => void
  setShare: (tableId: string, fieldDeckId: string, value: number) => void
  resetShares: (tableId: string) => void
  setPowerAdjust: (tableId: string, patch: Partial<PowerAdjust>) => void
  /** 共有・インポートされたテーブルを新しいIDでコピーとして追加する */
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

        createTable: (input) => {
          const id = crypto.randomUUID()
          const table: MatchupTable = {
            id,
            name: input.name.trim() || '新しいテーブル',
            decks: [],
            myDeckIds: [],
            fieldDeckIds: [],
            cells: {},
            shares: {},
            defaultTab: input.defaultTab,
            tournamentRule: input.tournamentRule,
            inputScale: 'percent',
            powerAdjust: { ...DEFAULT_POWER_ADJUST },
            updatedAt: new Date().toISOString(),
          }
          set((state) => ({ tables: { ...state.tables, [id]: table } }))
          return id
        },

        deleteTable: (tableId) =>
          set((state) => {
            const tables = { ...state.tables }
            delete tables[tableId]
            return { tables }
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
            return {
              ...t,
              decks: t.decks.filter((d) => d.id !== deckId),
              myDeckIds: t.myDeckIds.filter((id) => id !== deckId),
              fieldDeckIds: t.fieldDeckIds.filter((id) => id !== deckId),
              cells: Object.fromEntries(
                Object.entries(t.cells).filter(([key]) => {
                  const [a, b] = key.split(':')
                  return a !== deckId && b !== deckId
                }),
              ),
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

        importTable: (table) => {
          const id = crypto.randomUUID()
          set((state) => ({
            tables: {
              ...state.tables,
              [id]: { ...table, id, updatedAt: new Date().toISOString() },
            },
          }))
          return id
        },
      }
    },
    {
      name: 'svwb-matchup-v1',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as { tables?: Record<string, MatchupTable> }
        for (const table of Object.values(state?.tables ?? {})) {
          table.powerAdjust ??= { ...DEFAULT_POWER_ADJUST }
        }
        return state as { tables: Record<string, MatchupTable> }
      },
    },
  ),
)
