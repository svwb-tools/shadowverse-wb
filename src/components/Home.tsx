import { useMemo, useRef, useState } from 'react'
import { formatDate } from '../constants'
import { parseTableJson } from '../logic/share'
import { useStore } from '../store'
import type { TabKind, TournamentRule } from '../types'

function CreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (tableId: string) => void
}) {
  const createTable = useStore((s) => s.createTable)
  const [name, setName] = useState('')
  const [tab, setTab] = useState<TabKind>('ladder')
  const [rule, setRule] = useState<TournamentRule>({ deckCount: 2, matchType: 'bo1' })

  const submit = () => {
    const id = createTable({ name, defaultTab: tab, tournamentRule: rule })
    onCreated(id)
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
        <h2 className="font-display text-lg font-bold tracking-wide">新規テーブル</h2>

        <label className="mt-4 block text-xs text-muted">テーブル名</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="例: 7月環境ランクマ"
          className="mt-1 w-full rounded-md border border-line bg-abyss/60 px-3 py-2 text-sm placeholder:text-muted/60 focus:border-gold focus:outline-none"
        />

        <label className="mt-4 block text-xs text-muted">主な用途（最初に開く集計タブ。後から切替可能）</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(
            [
              { key: 'ladder', label: 'ランクマ', desc: '対環境の期待勝率を見る' },
              { key: 'tournament', label: '大会', desc: '持ち込みセットを検討する' },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setTab(m.key)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                tab === m.key
                  ? 'border-gold bg-gold/10'
                  : 'border-line bg-panel-2/40 hover:border-muted/60'
              }`}
            >
              <span className={`font-display text-sm font-semibold ${tab === m.key ? 'text-gold-bright' : ''}`}>
                {m.label}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted">{m.desc}</span>
            </button>
          ))}
        </div>

        {tab === 'tournament' && (
          <>
            <label className="mt-4 block text-xs text-muted">大会形式</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(
                [
                  { deckCount: 2, matchType: 'bo1', label: '2デッキ BO1' },
                  { deckCount: 3, matchType: 'bo1', label: '3デッキ BO1' },
                  { deckCount: 2, matchType: 'bo3', label: '2デッキ BO3' },
                ] as const
              ).map((r) => {
                const selected = r.deckCount === rule.deckCount && r.matchType === rule.matchType
                return (
                  <button
                    key={r.label}
                    onClick={() => setRule({ deckCount: r.deckCount, matchType: r.matchType })}
                    className={`rounded-md border px-2 py-1.5 text-xs transition ${
                      selected
                        ? 'border-gold bg-gold/10 text-gold-bright'
                        : 'border-line text-muted hover:border-muted/60'
                    }`}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </>
        )}

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
  const deleteTable = useStore((s) => s.deleteTable)
  const importTable = useStore((s) => s.importTable)
  const [creating, setCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sorted = useMemo(
    () => Object.values(tables).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [tables],
  )

  const importJsonFile = async (file: File) => {
    const table = parseTableJson(await file.text())
    if (!table) {
      alert('JSONを読み込めませんでした。このアプリからエクスポートしたファイルか確認してください。')
      return
    }
    onOpen(importTable(table))
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-16">
      <header className="pb-8 pt-14">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold tracking-[0.35em] text-gold">
          <span className="inline-block h-2 w-2 rotate-45 bg-gold" />
          SHADOWVERSE: WORLDS BEYOND
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-wide">相性表メーカー</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          相性 × デッキパワーで環境を読むための自分専用マトリクス。データはこの端末のブラウザ（localStorage）に自動保存されます。
        </p>
        <div className="mt-6 flex items-center gap-2.5">
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-abyss shadow-lg shadow-gold/20 transition hover:-translate-y-0.5 hover:bg-gold-bright"
          >
            ＋ 新規テーブル
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted transition hover:border-muted hover:text-fg"
          >
            JSONインポート
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
        <div className="rounded-xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center text-sm text-muted">
          まだテーブルがありません。「新規テーブル」から最初の相性表を作りましょう。
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => (
            <li key={t.id} className="group relative">
              <button
                onClick={() => onOpen(t.id)}
                className="w-full rounded-xl border border-line bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-panel-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 truncate font-display text-lg font-semibold" title={t.name}>
                    {t.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                      t.defaultTab === 'ladder'
                        ? 'border-win/40 text-win'
                        : 'border-gold/40 text-gold'
                    }`}
                  >
                    {t.defaultTab === 'ladder' ? 'ランクマ' : '大会'}
                  </span>
                </div>
                <p className="mt-2.5 text-xs text-muted">
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
                className="absolute bottom-3 right-3 rounded px-1.5 py-0.5 text-xs text-muted opacity-0 transition hover:text-lose group-hover:opacity-100"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
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
