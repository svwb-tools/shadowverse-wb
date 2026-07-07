export const CLASS_NAMES = [
  'エルフ',
  'ロイヤル',
  'ウィッチ',
  'ドラゴン',
  'ナイトメア',
  'ビショップ',
  'ネメシス',
] as const

export type ClassName = (typeof CLASS_NAMES)[number]

export interface Deck {
  id: string
  /** アーキタイプ名（例: 秘術ウィッチ） */
  name: string
  className: ClassName
  /** デッキパワーの主観評価 1〜10 */
  power: number
}

export type CellSource = 'manual' | 'auto'

export interface MatchupCell {
  /** 自分視点の勝率 0〜100 */
  value: number
  source: CellSource
}

export type TabKind = 'ladder' | 'tournament'

export interface TournamentRule {
  deckCount: 2 | 3
  matchType: 'bo1' | 'bo3'
}

/** デッキパワー補正: 補正値 = 相性値 + coef × (自パワー − 相手パワー) */
export interface PowerAdjust {
  enabled: boolean
  /** パワー差1あたりの勝率補正%（0〜10） */
  coef: number
}

export interface MatchupTable {
  id: string
  name: string
  /** デッキの実体は1箇所で管理し、行・列はIDで参照する */
  decks: Deck[]
  /** 行: 自分が使う候補デッキ */
  myDeckIds: string[]
  /** 列: 環境にいるデッキ */
  fieldDeckIds: string[]
  /** キー: `${myDeckId}:${fieldDeckId}` */
  cells: Record<string, MatchupCell>
  /** fieldDeckId → 想定遭遇率（相対値。正規化して重みに使う） */
  shares: Record<string, number>
  defaultTab: TabKind
  tournamentRule: TournamentRule
  inputScale: 'five' | 'percent'
  powerAdjust: PowerAdjust
  updatedAt: string
}
