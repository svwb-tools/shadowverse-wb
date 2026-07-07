import { useMemo, useState, type Ref } from 'react'
import { FIVE_STEPS, fiveLabel, winTone } from '../constants'
import { cellEstimate } from '../logic/analysis'
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
  const { setPowerAdjust, setRecordBlend, updateTableMeta } = useStore()
  const [editing, setEditing] = useState<EditingPos | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showBlendHelp, setShowBlendHelp] = useState(false)
  // 行・列の並びはデッキ管理の並び順に従う
  const myDecks = table.decks.filter((d) => table.myDeckIds.includes(d.id))
  const fieldDecks = table.decks.filter((d) => table.fieldDeckIds.includes(d.id))

  const adjust = table.powerAdjust
  const blend = table.recordBlend
  const powerOf = useMemo(() => new Map(table.decks.map((d) => [d.id, d.power])), [table.decks])

  if (myDecks.length === 0 || fieldDecks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold text-muted">マトリクスはまだ空です</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted/80">
          デッキ管理でデッキを追加し、「自分が使う」（行）と「環境にいる」（列）にチェックを入れると、ここに相性マトリクスが表示されます。
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted">
        <div className="flex shrink-0 overflow-hidden rounded-md border border-line">
          {(
            [
              { key: 'percent', label: '%' },
              { key: 'five', label: '5段階' },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => updateTableMeta(table.id, { inputScale: s.key })}
              className={`px-3 py-1 transition ${
                table.inputScale === s.key
                  ? 'bg-gold font-bold text-abyss'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={adjust.enabled}
            onChange={(e) => setPowerAdjust(table.id, { enabled: e.target.checked })}
          />
          デッキパワー補正（表示と集計に反映）
        </label>
        <button
          onClick={() => setShowHelp((v) => !v)}
          title="デッキパワー補正とは"
          className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[10px] font-bold transition ${
            showHelp
              ? 'border-gold bg-gold/15 text-gold-bright'
              : 'border-line text-muted hover:border-muted hover:text-fg'
          }`}
        >
          ?
        </button>
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
              className="w-14 rounded border border-line bg-abyss px-1.5 py-0.5 text-center font-display text-fg focus:border-gold focus:outline-none"
            />
            %／パワー差1
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={blend.enabled}
            onChange={(e) => setRecordBlend(table.id, { enabled: e.target.checked })}
          />
          実績ブレンド（対戦記録を反映）
        </label>
        <button
          onClick={() => setShowBlendHelp((v) => !v)}
          title="実績ブレンドとは"
          className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[10px] font-bold transition ${
            showBlendHelp
              ? 'border-gold bg-gold/15 text-gold-bright'
              : 'border-line text-muted hover:border-muted hover:text-fg'
          }`}
        >
          ?
        </button>
        {blend.enabled && (
          <label className="flex items-center gap-1.5">
            主観の重み
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              value={blend.priorGames}
              onChange={(e) =>
                setRecordBlend(table.id, {
                  priorGames: Math.min(50, Math.max(1, Math.round(Number(e.target.value) || 1))),
                })
              }
              className="w-14 rounded border border-line bg-abyss px-1.5 py-0.5 text-center font-display text-fg focus:border-gold focus:outline-none"
            />
            戦分
          </label>
        )}
      </div>
      {showHelp && (
        <div className="mb-3 rounded-lg border border-gold/30 bg-panel-2 p-4 text-xs leading-relaxed text-muted">
          <p className="font-semibold text-fg">デッキパワー補正とは</p>
          <p className="mt-1">
            相性表の上では有利でも、デッキの地力（パワー）が足りず勝ち切れないことがあります。
            この補正をONにすると、デッキ登録時に付けたパワー値の差を勝率に反映した
            <span className="font-semibold text-fg">「デッキパワー補正値」</span>
            でマトリクスと集計（ランクマ・大会）を表示します。
          </p>
          <p className="mt-1.5 rounded bg-abyss px-2 py-1 font-display tracking-wide text-fg">
            補正値 = 相性値 + 係数 × (自分のパワー − 相手のパワー)
          </p>
          <p className="mt-1.5">
            例: 係数2のとき、自分のデッキがパワー8・相手がパワー5なら、相性値60%は
            <span className="font-semibold text-fg"> 66%</span>
            に補正されます（逆にパワーが低い側は下がります）。
            セルの編集はいつでも補正前の生値に対して行われ、元の入力値は変わりません。
          </p>
        </div>
      )}
      {showBlendHelp && (
        <div className="mb-3 rounded-lg border border-gold/30 bg-panel-2 p-4 text-xs leading-relaxed text-muted">
          <p className="font-semibold text-fg">実績ブレンドとは</p>
          <p className="mt-1">
            「対戦記録」タブで記録した勝敗を、相性値に自動で混ぜる機能です。
            主観の入力値を「主観の重み」戦分の実績とみなして加重平均するため、
            対戦数が少ないうちは主観寄り、対戦数が増えるほど実績寄りの値になります。
          </p>
          <p className="mt-1.5 rounded bg-abyss px-2 py-1 font-display tracking-wide text-fg">
            ブレンド値 = (重み × 主観値 + 勝利数 × 100) ÷ (重み + 対戦数)
          </p>
          <p className="mt-1.5">
            例: 重み10・主観60%のセルで20戦14勝（70%）なら、(10×60 + 14×100) ÷ 30 ≒
            <span className="font-semibold text-fg"> 67%</span> になります。
            主観が未入力で記録だけあるセルは、五分（50%）を出発点に推定します。
            セルの編集はいつでもブレンド前の主観値に対して行われます。
          </p>
        </div>
      )}
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
                  const record = table.records[cellKey(myDeck.id, fieldDeck.id)]
                  const est = cellEstimate(table, powerOf, myDeck.id, fieldDeck.id)
                  const shown = est.value === null ? null : Math.round(est.value)
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
                                'repeating-linear-gradient(45deg, rgb(var(--tone-flat) / 0.10) 0 4px, transparent 4px 9px)',
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
                            shown !== null ? { backgroundColor: winTone(shown) } : undefined
                          }
                        >
                          {shown !== null ? (
                            <span
                              className={
                                cell?.source === 'auto' || est.recordOnly ? 'opacity-55' : ''
                              }
                            >
                              {table.inputScale === 'five' ? (
                                <span className="text-[13px]">{fiveLabel(shown)}</span>
                              ) : (
                                shown
                              )}
                            </span>
                          ) : (
                            <span className="text-muted/40">—</span>
                          )}
                          {record && (
                            <span className="absolute bottom-0.5 left-1 font-display text-[8px] tracking-wider text-fg/45">
                              {record.wins}-{record.losses}
                            </span>
                          )}
                          {cell?.source === 'auto' ? (
                            <span className="absolute bottom-0.5 right-1 font-display text-[8px] tracking-widest text-fg/35">
                              AUTO
                            </span>
                          ) : (
                            est.recordOnly && (
                              <span className="absolute bottom-0.5 right-1 text-[8px] tracking-wider text-fg/45">
                                実績
                              </span>
                            )
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
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11px] text-muted">
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
        {blend.enabled && Object.keys(table.records).length > 0 && (
          <span>左下の小さな数字 = 対戦記録（勝-敗）。「実績」= 記録だけからの推定値</span>
        )}
        {adjust.enabled && (
          <span className="text-gold/80">デッキパワー補正値を表示中（編集は生値）</span>
        )}
      </div>
    </div>
  )
}
