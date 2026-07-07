import { useMemo, useRef, useState } from 'react'
import { formatDate } from '../constants'
import { parseTableJson } from '../logic/share'
import { useStore } from '../store'
import { ThemeToggle } from './ThemeToggle'

function CreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (tableId: string) => void
}) {
  const createTable = useStore((s) => s.createTable)
  const [name, setName] = useState('')

  const submit = () => {
    onCreated(createTable({ name }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold tracking-wide">新規相性表</h2>

        <label className="mt-4 block text-xs text-muted">相性表名</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="例: 7月環境ランクマ"
          className="mt-1 w-full rounded-md border border-line bg-abyss px-3 py-2 text-sm placeholder:text-muted/60 focus:border-gold focus:outline-none"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-muted hover:text-fg"
          >
            キャンセル
          </button>
          <button
            onClick={submit}
            className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-abyss transition hover:bg-gold-bright"
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  )
}

export function Home({ onOpen }: { onOpen: (tableId: string) => void }) {
  const tables = useStore((s) => s.tables)
  const tableOrder = useStore((s) => s.tableOrder)
  const setTableOrder = useStore((s) => s.setTableOrder)
  const deleteTable = useStore((s) => s.deleteTable)
  const importTable = useStore((s) => s.importTable)
  const [creating, setCreating] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 並び順に保存されたものを先頭に、未登録のもの（旧データ）は更新日時順で末尾に
  const sorted = useMemo(() => {
    const known = tableOrder.filter((id) => tables[id])
    const knownSet = new Set(known)
    const rest = Object.values(tables)
      .filter((t) => !knownSet.has(t.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => t.id)
    return [...known, ...rest].map((id) => tables[id])
  }, [tables, tableOrder])

  const moveDraggingBefore = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const ids = sorted.map((t) => t.id)
    ids.splice(ids.indexOf(draggingId), 1)
    ids.splice(ids.indexOf(targetId), 0, draggingId)
    setTableOrder(ids)
  }

  const importJsonFile = async (file: File) => {
    const table = parseTableJson(await file.text())
    if (!table) {
      alert('データを読み込めませんでした。このアプリの「データ保存」で作ったファイルか確認してください。')
      return
    }
    onOpen(importTable(table))
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <header className="pb-10 pt-14">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-[11px] font-semibold tracking-[0.35em] text-gold">
            <span className="inline-block h-2 w-2 rotate-45 bg-gold" />
            SHADOWVERSE: WORLDS BEYOND
          </p>
          <ThemeToggle />
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-wide">相性表メーカー</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          相性 × デッキパワーで環境を読むための自分専用マトリクス。データはこの端末のブラウザ（localStorage）に自動保存されます。
        </p>
        <div className="mt-6 flex items-center gap-2.5">
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-abyss shadow-lg shadow-gold/20 transition hover:-translate-y-0.5 hover:bg-gold-bright"
          >
            ＋ 新規相性表
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-muted hover:text-fg"
          >
            データ読み込み
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importJsonFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel px-6 py-16 text-center text-sm text-muted">
          まだ相性表がありません。「新規相性表」から最初の相性表を作りましょう。
        </div>
      ) : (
        <>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => (
            <li
              key={t.id}
              draggable
              onDragStart={(e) => {
                setDraggingId(t.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => moveDraggingBefore(t.id)}
              className={`group relative cursor-grab active:cursor-grabbing ${
                draggingId === t.id ? 'opacity-40' : ''
              }`}
            >
              <button
                onClick={() => onOpen(t.id)}
                className="w-full rounded-xl border border-line bg-panel p-5 text-left transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-panel-2"
              >
                <h3 className="min-w-0 truncate font-display text-lg font-semibold" title={t.name}>
                  {t.name}
                </h3>
                <p className="mt-3 text-xs text-muted">
                  自分 {t.myDeckIds.length} ・ 環境 {t.fieldDeckIds.length} ・ 入力{' '}
                  {Object.keys(t.cells).length} セル
                </p>
                <p className="mt-1 text-[11px] text-muted/70">更新 {formatDate(t.updatedAt)}</p>
              </button>
              <button
                onClick={() => {
                  if (confirm(`「${t.name}」を削除しますか？この操作は取り消せません。`)) {
                    deleteTable(t.id)
                  }
                }}
                title="削除"
                className="absolute bottom-3 right-3 rounded px-1.5 py-0.5 text-xs text-muted opacity-60 transition hover:text-lose group-hover:opacity-100"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-[11px] text-muted/80">カードはドラッグで並べ替えできます。</p>
        </>
      )}

      {creating && (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={(tableId) => {
            setCreating(false)
            onOpen(tableId)
          }}
        />
      )}
    </div>
  )
}
