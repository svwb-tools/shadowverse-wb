import { useEffect, useState } from 'react'
import { Editor } from './components/Editor'
import { Home } from './components/Home'
import { StreamOverlay } from './components/StreamOverlay'
import { decodeTableFromHash } from './logic/share'
import { useStore } from './store'
import type { MatchupTable } from './types'

type View = { screen: 'home' } | { screen: 'editor'; tableId: string }

export default function App() {
  const importTable = useStore((s) => s.importTable)
  const [view, setView] = useState<View>({ screen: 'home' })
  const [shared, setShared] = useState<MatchupTable | null>(null)
  // 配信オーバーレイ用の別ウィンドウ（#overlay=<tableId>）
  const [overlayTableId] = useState(() => location.hash.match(/^#overlay=([\w-]+)$/)?.[1] ?? null)

  // 共有URL（#d=...）で開かれた場合、取り込み確認を出す
  useEffect(() => {
    if (!location.hash.startsWith('#d=')) return
    setShared(decodeTableFromHash(location.hash))
    history.replaceState(null, '', location.pathname + location.search)
  }, [])

  if (overlayTableId) {
    return <StreamOverlay tableId={overlayTableId} />
  }

  return (
    <>
      {view.screen === 'editor' ? (
        <Editor tableId={view.tableId} onBack={() => setView({ screen: 'home' })} />
      ) : (
        <Home onOpen={(tableId) => setView({ screen: 'editor', tableId })} />
      )}

      {shared && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50">
            <h2 className="font-display text-lg font-bold tracking-wide">共有された相性表を開く</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              共有された相性表
              <span className="mx-1 font-semibold text-fg">「{shared.name}」</span>
              （デッキ{shared.decks.length}個・入力{Object.keys(shared.cells).length}セル）
              を自分のコピーとして追加しますか？
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShared(null)}
                className="rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-muted hover:text-fg"
              >
                破棄
              </button>
              <button
                onClick={() => {
                  const id = importTable(shared)
                  setShared(null)
                  setView({ screen: 'editor', tableId: id })
                }}
                className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-abyss transition hover:bg-gold-bright"
              >
                追加して開く
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
