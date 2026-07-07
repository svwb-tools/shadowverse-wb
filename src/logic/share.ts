import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { CLASS_NAMES, type ClassName, type Deck, type MatchupTable } from '../types'

const PAYLOAD_VERSION = 1

/** 端末ローカルの状態（配信カウンタの基準点）は共有・エクスポートに含めない */
const toShareable = (table: MatchupTable): MatchupTable => {
  const { overlayBaseline: _overlayBaseline, ...rest } = table
  return rest
}

export function serializeTable(table: MatchupTable): string {
  return JSON.stringify({ v: PAYLOAD_VERSION, table: toShareable(table) }, null, 2)
}

export function encodeTableToHash(table: MatchupTable): string {
  return (
    '#d=' + compressToEncodedURIComponent(JSON.stringify({ v: PAYLOAD_VERSION, table: toShareable(table) }))
  )
}

export function decodeTableFromHash(hash: string): MatchupTable | null {
  const m = hash.match(/^#d=(.+)$/)
  if (!m) return null
  const json = decompressFromEncodedURIComponent(m[1])
  if (!json) return null
  return parseTableJson(json)
}

/** 外部入力の上限（悪意ある共有データによる保存領域圧迫・フリーズ対策） */
export const MAX_PAYLOAD_CHARS = 5_000_000
const MAX_NAME_CHARS = 100
const MAX_DECKS = 100
const MAX_ID_CHARS = 64

/** 共有ペイロード（{v, table}）と素のテーブルJSONの両方を受け付ける */
export function parseTableJson(json: string): MatchupTable | null {
  if (json.length > MAX_PAYLOAD_CHARS) return null
  try {
    const data: unknown = JSON.parse(json)
    const t =
      data && typeof data === 'object' && 'table' in data
        ? (data as { table: unknown }).table
        : data
    return normalizeTable(t)
  } catch {
    return null
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

/** 外部から来たデータを検証し、欠けているフィールドを既定値で埋める */
export function normalizeTable(t: unknown): MatchupTable | null {
  if (!isRecord(t) || typeof t.name !== 'string' || !Array.isArray(t.decks)) return null

  const decks: Deck[] = []
  for (const d of t.decks) {
    if (decks.length >= MAX_DECKS) break
    if (!isRecord(d) || typeof d.id !== 'string' || typeof d.name !== 'string') continue
    // ':' はセルのキー区切りに使うためIDに含めない。空・過長も拒否
    if (d.id.length === 0 || d.id.length > MAX_ID_CHARS || d.id.includes(':')) continue
    decks.push({
      id: d.id,
      name: d.name.slice(0, MAX_NAME_CHARS),
      className: CLASS_NAMES.includes(d.className as ClassName)
        ? (d.className as ClassName)
        : 'エルフ',
      power: typeof d.power === 'number' ? Math.min(10, Math.max(1, Math.round(d.power))) : 5,
    })
  }
  const deckIds = new Set(decks.map((d) => d.id))
  const idList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && deckIds.has(x)) : []

  const cells: MatchupTable['cells'] = {}
  if (isRecord(t.cells)) {
    for (const [key, cell] of Object.entries(t.cells)) {
      if (!isRecord(cell) || typeof cell.value !== 'number') continue
      const [a, b] = key.split(':')
      if (!deckIds.has(a) || !deckIds.has(b)) continue
      cells[key] = {
        value: Math.min(100, Math.max(0, Math.round(cell.value))),
        source: cell.source === 'auto' ? 'auto' : 'manual',
      }
    }
  }

  const shares: MatchupTable['shares'] = {}
  if (isRecord(t.shares)) {
    for (const [id, v] of Object.entries(t.shares)) {
      if (deckIds.has(id) && typeof v === 'number') shares[id] = Math.min(100, Math.max(0, v))
    }
  }

  const records: MatchupTable['records'] = {}
  if (isRecord(t.records)) {
    for (const [key, rec] of Object.entries(t.records)) {
      if (!isRecord(rec) || typeof rec.wins !== 'number' || typeof rec.losses !== 'number') continue
      const [a, b] = key.split(':')
      if (!deckIds.has(a) || !deckIds.has(b)) continue
      const wins = Math.max(0, Math.round(rec.wins))
      const losses = Math.max(0, Math.round(rec.losses))
      if (wins + losses > 0) records[key] = { wins, losses }
    }
  }

  const rule = isRecord(t.tournamentRule) ? t.tournamentRule : {}
  const adjust = isRecord(t.powerAdjust) ? t.powerAdjust : {}
  const blend = isRecord(t.recordBlend) ? t.recordBlend : {}

  return {
    id: typeof t.id === 'string' ? t.id.slice(0, MAX_ID_CHARS) : '',
    name: t.name.slice(0, MAX_NAME_CHARS),
    decks,
    myDeckIds: idList(t.myDeckIds),
    fieldDeckIds: idList(t.fieldDeckIds),
    cells,
    shares,
    records,
    recordBlend: {
      enabled: blend.enabled !== false,
      priorGames:
        typeof blend.priorGames === 'number'
          ? Math.min(50, Math.max(1, Math.round(blend.priorGames)))
          : 10,
    },
    defaultTab: t.defaultTab === 'tournament' ? 'tournament' : 'ladder',
    tournamentRule: {
      deckCount: rule.deckCount === 3 ? 3 : 2,
      matchType: rule.matchType === 'bo3' ? 'bo3' : 'bo1',
    },
    inputScale: t.inputScale === 'five' ? 'five' : 'percent',
    powerAdjust: {
      enabled: adjust.enabled === true,
      coef:
        typeof adjust.coef === 'number' ? Math.min(10, Math.max(0, adjust.coef)) : 2,
    },
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : new Date().toISOString(),
  }
}
