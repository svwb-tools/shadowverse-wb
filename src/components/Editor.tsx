import { useState } from 'react'
import { useStore } from '../store'
import type { TabKind } from '../types'
import { DeckManager } from './DeckManager'
import { LadderPanel } from './LadderPanel'
import { MatrixGrid } from './MatrixGrid'
import { TournamentPanel } from './TournamentPanel'

export function Editor({ tableId, onBack }: { tableId: string; onBack: () => void }) {
  const table = useStore((s) => s.tables[tableId])
  const updateTableMeta = useStore((s) => s.updateTableMeta)
  const [tab, setTab] = useState<TabKind>(table?.defaultTab ?? 'ladder')

  if (!table) {
    return (
      <div className="p-10 text-center text-sm text-muted">
        テーブルが見つかりません。
        <button onClick={onBack} className="ml-2 text-gold underline">
          一覧へ戻る
        </button>
      </div>
    )
  }

  return (
    <div className="pb-16">
      <header className="sticky top-0 z-40 border-b border-line bg-abyss/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
          <button
            onClick={onBack}
            className="shrink-0 rounded-md border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-muted hover:text-fg"
          >
            ← 一覧
          </button>
          <input
            value={table.name}
            onChange={(e) => updateTableMeta(table.id, { name: e.target.value })}
            className="min-w-0 flex-1 border-b border-transparent bg-transparent font-display text-lg font-semibold tracking-wide focus:border-gold focus:outline-none"
          />
          <div className="flex shrink-0 overflow-hidden rounded-md border border-line text-xs">
            {(
              [
                { key: 'percent', label: '%' },
                { key: 'five', label: '5段階' },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                onClick={() => updateTableMeta(table.id, { inputScale: s.key })}
                className={`px-3 py-1.5 transition ${
                  table.inputScale === s.key
                    ? 'bg-gold font-bold text-abyss'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="hidden shrink-0 text-[10px] tracking-wider text-muted/70 sm:inline">
            自動保存
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 pt-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:w-80">
          <DeckManager table={table} />
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <MatrixGrid table={table} />

          <section className="rounded-xl border border-line bg-panel p-3.5">
            <nav className="mb-3 flex gap-1 border-b border-line">
              {(
                [
                  { key: 'ladder', label: 'ランクマ集計' },
                  { key: 'tournament', label: '大会集計' },
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
            {tab === 'ladder' ? <LadderPanel table={table} /> : <TournamentPanel table={table} />}
          </section>
        </main>
      </div>
    </div>
  )
}
