import { useState } from 'react'
import { useStore } from '../store'
import { CLASS_NAMES, type ClassName, type Deck, type MatchupTable } from '../types'
import { ClassDot } from './ClassDot'

interface DeckFormValue {
  name: string
  className: ClassName
  power: number
}

function DeckForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: DeckFormValue
  submitLabel: string
  onSubmit: (value: DeckFormValue) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initial)
  const canSubmit = value.name.trim().length > 0

  return (
    <form
      className="space-y-2.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({ ...value, name: value.name.trim() })
        setValue((v) => ({ ...v, name: '' }))
      }}
    >
      <input
        value={value.name}
        onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
        placeholder="デッキ名（例: 秘術ウィッチ）"
        className="w-full rounded-md border border-line bg-abyss/60 px-2.5 py-1.5 text-sm placeholder:text-muted/60 focus:border-gold focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <ClassDot className={value.className} />
        <select
          value={value.className}
          onChange={(e) => setValue((v) => ({ ...v, className: e.target.value as ClassName }))}
          className="flex-1 rounded-md border border-line bg-abyss/60 px-2 py-1.5 text-sm focus:border-gold focus:outline-none"
        >
          {CLASS_NAMES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-muted">パワー</span>
        <input
          type="range"
          min={1}
          max={10}
          value={value.power}
          onChange={(e) => setValue((v) => ({ ...v, power: Number(e.target.value) }))}
          className="flex-1"
        />
        <span className="w-8 text-right font-display text-base font-semibold text-gold">
          {value.power}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-abyss transition hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition hover:border-muted hover:text-fg"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  )
}

interface DragHandlers {
  isDragging: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

function DeckRow({ table, deck, drag }: { table: MatchupTable; deck: Deck; drag: DragHandlers }) {
  const { updateDeck, setDeckRoles, removeDeck } = useStore()
  const [editing, setEditing] = useState(false)
  const roles = {
    my: table.myDeckIds.includes(deck.id),
    field: table.fieldDeckIds.includes(deck.id),
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-gold/50 bg-panel-2/60 p-2.5">
        <DeckForm
          initial={{ name: deck.name, className: deck.className, power: deck.power }}
          submitLabel="保存"
          onSubmit={(v) => {
            updateDeck(table.id, { ...deck, ...v })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        drag.onDragStart()
      }}
      onDragEnter={drag.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={drag.onDragEnd}
      className={`group cursor-grab rounded-lg border border-line bg-panel-2/40 px-2.5 py-2 transition hover:border-line/80 hover:bg-panel-2/70 active:cursor-grabbing ${
        drag.isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <ClassDot className={deck.className} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={deck.name}>
          {deck.name}
        </span>
        <span className="font-display text-sm font-semibold text-gold">P{deck.power}</span>
        <button
          onClick={() => setEditing(true)}
          title="編集"
          className="rounded px-1 text-muted opacity-0 transition hover:text-fg group-hover:opacity-100"
        >
          ✎
        </button>
        <button
          onClick={() => {
            if (confirm(`「${deck.name}」を削除しますか？入力済みの相性値も消えます。`)) {
              removeDeck(table.id, deck.id)
            }
          }}
          title="削除"
          className="rounded px-1 text-muted opacity-0 transition hover:text-lose group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 flex gap-4 text-xs text-muted">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={roles.my}
            onChange={(e) => setDeckRoles(table.id, deck.id, { ...roles, my: e.target.checked })}
          />
          自分が使う
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={roles.field}
            onChange={(e) => setDeckRoles(table.id, deck.id, { ...roles, field: e.target.checked })}
          />
          環境にいる
        </label>
      </div>
    </li>
  )
}

export function DeckManager({ table }: { table: MatchupTable }) {
  const { addDeck, setDeckOrder } = useStore()
  const [addRoles, setAddRoles] = useState({ my: false, field: true })
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const moveDraggingBefore = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const ids = table.decks.map((d) => d.id)
    ids.splice(ids.indexOf(draggingId), 1)
    ids.splice(ids.indexOf(targetId), 0, draggingId)
    setDeckOrder(table.id, ids)
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-3.5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-base font-semibold tracking-wide">デッキ管理</h2>
        <span className="text-xs text-muted">
          自分 {table.myDeckIds.length} ・ 環境 {table.fieldDeckIds.length}
        </span>
      </div>

      <DeckForm
        initial={{ name: '', className: 'エルフ', power: 5 }}
        submitLabel="デッキを追加"
        onSubmit={(v) => addDeck(table.id, v, addRoles)}
      />
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={addRoles.my}
            onChange={(e) => setAddRoles((r) => ({ ...r, my: e.target.checked }))}
          />
          自分が使う
        </label>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={addRoles.field}
            onChange={(e) => setAddRoles((r) => ({ ...r, field: e.target.checked }))}
          />
          環境にいる
        </label>
      </div>

      {table.decks.length > 0 && (
        <>
          <ul className="mt-3.5 max-h-[52vh] space-y-1.5 overflow-y-auto border-t border-line pt-3">
            {table.decks.map((deck) => (
              <DeckRow
                key={deck.id}
                table={table}
                deck={deck}
                drag={{
                  isDragging: draggingId === deck.id,
                  onDragStart: () => setDraggingId(deck.id),
                  onDragEnter: () => moveDraggingBefore(deck.id),
                  onDragEnd: () => setDraggingId(null),
                }}
              />
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted/80">
            ドラッグで並べ替え（マトリクスの行・列にも反映されます）
          </p>
        </>
      )}
    </div>
  )
}
