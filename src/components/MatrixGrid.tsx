import { useMemo, useState, type Ref } from 'react'
import { FIVE_STEPS, fiveLabel, winTone } from '../constants'
import { cellKey } from '../logic/matchup'
import { useStore } from '../store'
import type { Deck, MatchupTable } from '../types'
import { ClassDot } from './ClassDot'

interface EditingPos {
  myDeckId: string
  fieldDeckId: string
}

function CellEditor({
  table,
  pos,
  onDone,
}: {
  table: MatchupTable
  pos: EditingPos
  onDone: () => void
}) {
  const { setCell, clearCell } = useStore()
  const current = table.cells[cellKey(pos.myDeckId, pos.fieldDeckId)]

  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || Number.isNaN(n)) {
      clearCell(table.id, pos.myDeckId, pos.fieldDeckId)
    } else {
      setCell(table.id, pos.myDeckId, pos.fieldDeckId, n)
    }
    onDone()
  }

  if (table.inputScale === 'five') {
    const isStep = FIVE_STEPS.some((s) => s.value === current?.value)
    return (
      <select
        autoFocus
        defaultValue={current && isStep ? String(current.value) : (current ? 'raw' : '')}
        onChange={(e) => commit(e.target.value === 'raw' ? String(current?.value ?? '') : e.target.value)}
        onBlur={onDone}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
        className="h-9 w-full border border-gold bg-panel-2 text-center text-sm focus:outline-none"
      >
        <option value="">未入力</option>
        {FIVE_STEPS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
        {current && !isStep && <option value="raw">{current.value}%（現在値）</option>}
      </select>
    )
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      max={100}
      defaultValue={current?.value ?? ''}
      placeholder="—"
      onFocus={(e) => e.target.select()}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') onDone()
      }}
      className="h-9 w-full border border-gold bg-panel-2 text-center font-display text-[15px] font-semibold focus:outline-none"
    />
  )
}

function DeckLabel({ deck }: { deck: Deck }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ClassDot className={deck.className} size={7} />
      <span className="max-w-30 truncate text-xs font-medium" title={deck.name}>
        {deck.name}
      </span>
      <span className="font-display text-[10px] font-semibold text-muted">P{deck.power}</span>
    </div>
  )
}

export function MatrixGrid({
  table,
  exportRef,
}: {
  table: MatchupTable
  exportRef?: Ref<HTMLTableElement>
}) {
  const { setPowerAdjust } = useStore()
  const [editing, setEditing] = useState<EditingPos | null>(null)
  const deckOf = useMemo(() => new Map(table.decks.map((d) => [d.id, d])), [table.decks])
  const myDecks = table.myDeckIds.map((id) => deckOf.get(id)).filter((d): d is Deck => !!d)
  const fieldDecks = table.fieldDeckIds.map((id) => deckOf.get(id)).filter((d): d is Deck => !!d)

  const adjust = table.powerAdjust
  // 表示用のパワー補正値。編集は常に生値に対して行う
  const displayValue = (raw: number, myDeck: Deck, fieldDeck: Deck) =>
    adjust.enabled
      ? Math.round(
          Math.min(100, Math.max(0, raw + adjust.coef * (myDeck.power - fieldDeck.power))),
        )
      : raw

  if (myDecks.length === 0 || fieldDecks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel/60 px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold text-muted">マトリクスはまだ空です</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted/80">
          デッキ管理でデッキを追加し、「自分が使う」（行）と「環境にいる」（列）にチェックを入れると、ここに相性マトリクスが表示されます。
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={adjust.enabled}
            onChange={(e) => setPowerAdjust(table.id, { enabled: e.target.checked })}
          />
          パワー補正（表示と集計に反映）
        </label>
        {adjust.enabled && (
          <label className="flex items-center gap-1.5">
            係数
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={adjust.coef}
              onChange={(e) =>
                setPowerAdjust(table.id, {
                  coef: Math.min(10, Math.max(0, Number(e.target.value) || 0)),
                })
              }
              className="w-14 rounded border border-line bg-abyss/60 px-1.5 py-0.5 text-center font-display text-fg focus:border-gold focus:outline-none"
            />
            %／パワー差1（セル編集は常に生値）
          </label>
        )}
      </div>
      <div className="max-h-[62vh] overflow-auto rounded-xl border border-line bg-panel">
        <table ref={exportRef} className="w-max min-w-full border-collapse bg-panel">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-panel px-3 py-2.5 text-left text-[11px] font-normal text-muted">
                自分 ＼ 相手
              </th>
              {fieldDecks.map((deck) => (
                <th
                  key={deck.id}
                  className="sticky top-0 z-20 min-w-20 border-l border-line/50 bg-panel px-2 py-2.5"
                >
                  <div className="flex justify-center">
                    <DeckLabel deck={deck} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {myDecks.map((myDeck) => (
              <tr key={myDeck.id}>
                <th className="sticky left-0 z-10 border-t border-line/50 bg-panel px-3 py-1.5 text-left">
                  <DeckLabel deck={myDeck} />
                </th>
                {fieldDecks.map((fieldDeck) => {
                  const cell = table.cells[cellKey(myDeck.id, fieldDeck.id)]
                  const isEditing =
                    editing?.myDeckId === myDeck.id && editing?.fieldDeckId === fieldDeck.id
                  const isMirror = myDeck.id === fieldDeck.id
                  return (
                    <td
                      key={fieldDeck.id}
                      className="border-l border-t border-line/50 p-0"
                      style={
                        isMirror
                          ? {
                              backgroundImage:
                                'repeating-linear-gradient(45deg, rgba(142,151,173,0.08) 0 4px, transparent 4px 9px)',
                            }
                          : undefined
                      }
                    >
                      {isEditing ? (
                        <CellEditor
                          table={table}
                          pos={{ myDeckId: myDeck.id, fieldDeckId: fieldDeck.id }}
                          onDone={() => setEditing(null)}
                        />
                      ) : (
                        <button
                          onClick={() =>
                            setEditing({ myDeckId: myDeck.id, fieldDeckId: fieldDeck.id })
                          }
                          title={`${myDeck.name} vs ${fieldDeck.name}`}
                          className="relative flex h-9 w-full min-w-20 items-center justify-center font-display text-[15px] font-semibold transition hover:ring-1 hover:ring-inset hover:ring-gold/70"
                          style={
                            cell
                              ? {
                                  backgroundColor: winTone(
                                    displayValue(cell.value, myDeck, fieldDeck),
                                  ),
                                }
                              : undefined
                          }
                        >
                          {cell ? (
                            <span className={cell.source === 'auto' ? 'opacity-55' : ''}>
                              {table.inputScale === 'five' ? (
                                <span className="text-[13px]">
                                  {fiveLabel(displayValue(cell.value, myDeck, fieldDeck))}
                                </span>
                              ) : (
                                displayValue(cell.value, myDeck, fieldDeck)
                              )}
                            </span>
                          ) : (
                            <span className="text-muted/40">—</span>
                          )}
                          {cell?.source === 'auto' && (
                            <span className="absolute bottom-0.5 right-1 font-display text-[8px] tracking-widest text-fg/35">
                              AUTO
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: winTone(70) }} />
          有利
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-line" style={{ backgroundColor: winTone(50) }} />
          五分
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: winTone(30) }} />
          不利
        </span>
        <span>セルをクリックして入力（空にすると削除）</span>
        <span>薄い数字 = ミラーからの自動入力。手入力すると上書きされなくなります</span>
        {adjust.enabled && <span className="text-gold/80">パワー補正値を表示中（編集は生値）</span>}
      </div>
    </div>
  )
}
