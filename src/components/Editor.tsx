import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { encodeTableToHash, serializeTable } from '../logic/share'
import { useStore } from '../store'
import type { TabKind } from '../types'
import { DeckManager } from './DeckManager'
import { LadderPanel } from './LadderPanel'
import { MatrixGrid } from './MatrixGrid'
import { RecordsPanel } from './RecordsPanel'
import { ThemeToggle } from './ThemeToggle'
import { TournamentPanel } from './TournamentPanel'

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

export function Editor({ tableId, onBack }: { tableId: string; onBack: () => void }) {
  const table = useStore((s) => s.tables[tableId])
  const updateTableMeta = useStore((s) => s.updateTableMeta)
  const [tab, setTab] = useState<TabKind | 'records'>(table?.defaultTab ?? 'ladder')
  const matrixRef = useRef<HTMLTableElement>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])
  const showToast = (message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  if (!table) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        相性表が見つかりません。
        <button onClick={onBack} className="ml-2 text-gold underline">
          一覧へ戻る
        </button>
      </div>
    )
  }

  const exportPng = async () => {
    if (!matrixRef.current) {
      showToast('マトリクスが空のためPNGを出力できません')
      return
    }
    try {
      const dataUrl = await toPng(matrixRef.current, {
        backgroundColor:
          getComputedStyle(document.documentElement).getPropertyValue('--bg-abyss').trim() ||
          '#0a0f1c',
        pixelRatio: 2,
      })
      download(dataUrl, `${table.name || '相性表'}.png`)
      showToast('PNGを保存しました')
    } catch {
      showToast('PNGの出力に失敗しました')
    }
  }

  const copyShareUrl = async () => {
    const url = location.origin + location.pathname + encodeTableToHash(table)
    try {
      await navigator.clipboard.writeText(url)
      showToast('共有URLをコピーしました（開いた人のブラウザにコピーが追加されます）')
    } catch {
      window.prompt('このURLをコピーして共有してください', url)
    }
  }

  const exportJson = () => {
    const blob = new Blob([serializeTable(table)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    download(url, `${table.name || '相性表'}.json`)
    URL.revokeObjectURL(url)
    showToast('データファイルを保存しました')
  }

  return (
    <div className="pb-16">
      <header className="sticky top-0 z-40 border-b border-line bg-abyss">
        <div className="mx-auto flex max-w-350 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5">
          <button
            onClick={onBack}
            className="shrink-0 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-muted hover:text-fg"
          >
            ← 一覧
          </button>
          <input
            value={table.name}
            onChange={(e) => updateTableMeta(table.id, { name: e.target.value })}
            className="min-w-32 flex-1 border-b border-transparent bg-transparent font-display text-lg font-semibold tracking-wide focus:border-gold focus:outline-none"
          />
          <div className="flex shrink-0 gap-1.5 text-xs">
            <button
              onClick={exportPng}
              className="rounded-md border border-line px-2.5 py-1.5 text-muted transition hover:border-muted hover:text-fg"
            >
              PNG
            </button>
            <button
              onClick={copyShareUrl}
              className="rounded-md border border-line px-2.5 py-1.5 text-muted transition hover:border-muted hover:text-fg"
            >
              URL共有
            </button>
            <button
              onClick={exportJson}
              className="rounded-md border border-line px-2.5 py-1.5 text-muted transition hover:border-muted hover:text-fg"
            >
              データ保存
            </button>
          </div>
          <ThemeToggle />
          <span className="hidden shrink-0 text-[10px] tracking-wider text-muted/70 sm:inline">
            自動保存
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-350 flex-col gap-6 px-5 pt-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-80">
          <DeckManager table={table} />
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          <MatrixGrid table={table} exportRef={matrixRef} />

          <section className="rounded-xl border border-line bg-panel p-5">
            <nav className="mb-4 flex gap-1 border-b border-line">
              {(
                [
                  { key: 'records', label: '対戦記録' },
                  { key: 'ladder', label: 'ランクマダッシュボード' },
                  { key: 'tournament', label: '大会ダッシュボード' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px border-b-2 px-3.5 py-2 font-display text-sm font-semibold tracking-wide transition ${
                    tab === t.key
                      ? 'border-gold text-gold-bright'
                      : 'border-transparent text-muted hover:text-fg'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            {tab === 'ladder' ? (
              <LadderPanel table={table} />
            ) : tab === 'tournament' ? (
              <TournamentPanel table={table} />
            ) : (
              <RecordsPanel table={table} />
            )}
          </section>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-gold/40 bg-panel-2 px-4 py-2 text-sm shadow-xl shadow-black/40">
          {toast}
        </div>
      )}
    </div>
  )
}
