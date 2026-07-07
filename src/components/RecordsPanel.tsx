import { useState } from 'react'
import { cellKey } from '../logic/matchup'
import { useStore } from '../store'
import type { MatchupTable } from '../types'
import { ClassDot } from './ClassDot'

export function RecordsPanel({ table }: { table: MatchupTable }) {
  const { addGameResult, adjustRecord, resetOverlayBaseline } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fixMode, setFixMode] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const myDecks = table.decks.filter((d) => table.myDeckIds.includes(d.id))
  const fieldDecks = table.decks.filter((d) => table.fieldDeckIds.includes(d.id))
  const active = myDecks.find((d) => d.id === selectedId) ?? myDecks[0]

  if (!active || fieldDecks.length === 0) {
    return (
      <p className="px-1 py-6 text-sm text-muted">
        「自分が使う」デッキと「環境にいる」デッキを登録すると、ここで対戦結果を記録できます。
      </p>
    )
  }

  const activeTotal = fieldDecks.reduce(
    (acc, f) => {
      const rec = table.records[cellKey(active.id, f.id)]
      return rec ? { wins: acc.wins + rec.wins, losses: acc.losses + rec.losses } : acc
    },
    { wins: 0, losses: 0 },
  )
  const grandGames = Object.values(table.records).reduce((n, r) => n + r.wins + r.losses, 0)

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium">いま使っているデッキ</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {myDecks.map((deck) => {
          const selected = deck.id === active.id
          return (
            <button
              key={deck.id}
              onClick={() => setSelectedId(deck.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                selected
                  ? 'border-gold bg-gold/10 font-semibold text-gold-bright'
                  : 'border-line text-muted hover:border-muted hover:text-fg'
              }`}
            >
              <ClassDot className={deck.className} size={7} />
              {deck.name}
            </button>
          )
        })}
      </div>

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[11px] leading-relaxed text-muted">
          対戦が終わるたびに、相手デッキの行で勝敗を1クリックで記録します。
        </p>
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted">
          <input type="checkbox" checked={fixMode} onChange={(e) => setFixMode(e.target.checked)} />
          修正モード（クリックで1つ減らす）
        </label>
      </div>

      <ul className="space-y-2">
        {fieldDecks.map((fieldDeck) => {
          const rec = table.records[cellKey(active.id, fieldDeck.id)]
          const games = rec ? rec.wins + rec.losses : 0
          return (
            <li
              key={fieldDeck.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3.5 py-2.5"
            >
              <ClassDot className={fieldDeck.className} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={fieldDeck.name}>
                {fieldDeck.name}
              </span>
              {fixMode ? (
                <>
                  <button
                    onClick={() => adjustRecord(table.id, active.id, fieldDeck.id, -1, 0)}
                    disabled={!rec || rec.wins === 0}
                    className="rounded-md border border-win/50 px-3 py-1.5 text-xs font-semibold text-win transition hover:bg-win/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    勝ち −1
                  </button>
                  <button
                    onClick={() => adjustRecord(table.id, active.id, fieldDeck.id, 0, -1)}
                    disabled={!rec || rec.losses === 0}
                    className="rounded-md border border-lose/50 px-3 py-1.5 text-xs font-semibold text-lose transition hover:bg-lose/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    負け −1
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => addGameResult(table.id, active.id, fieldDeck.id, true)}
                    className="rounded-md border border-win/50 px-4 py-1.5 text-xs font-bold text-win transition hover:bg-win/10"
                  >
                    勝ち
                  </button>
                  <button
                    onClick={() => addGameResult(table.id, active.id, fieldDeck.id, false)}
                    className="rounded-md border border-lose/50 px-4 py-1.5 text-xs font-bold text-lose transition hover:bg-lose/10"
                  >
                    負け
                  </button>
                </>
              )}
              <span className="w-28 shrink-0 text-right font-display text-sm font-semibold">
                {rec ? (
                  <>
                    {rec.wins}勝{rec.losses}敗
                    <span className="ml-1 text-xs text-muted">
                      ({Math.round((rec.wins / games) * 100)}%)
                    </span>
                  </>
                ) : (
                  <span className="text-muted/50">—</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
        「{active.name}」の合計: {activeTotal.wins + activeTotal.losses}戦 {activeTotal.wins}勝
        {activeTotal.losses}敗
        {activeTotal.wins + activeTotal.losses > 0 &&
          `（勝率 ${Math.round((activeTotal.wins / (activeTotal.wins + activeTotal.losses)) * 100)}%）`}
        ／ この相性表全体: {grandGames}戦。記録は通算の勝敗数だけ保存され、実績ブレンドONのとき相性値に反映されます。
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 text-sm font-semibold tracking-wide">配信者向け</h3>
          <button
            onClick={() =>
              window.open(
                `${location.origin}${location.pathname}#overlay=${table.id}`,
                `svwb-overlay-${table.id}`,
                'width=420,height=360,popup=yes',
              )
            }
            className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-muted hover:text-fg"
          >
            配信オーバーレイを開く
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  '「今日の分」の戦績カウントをリセットします（通算の記録は消えません）。よろしいですか？',
                )
              ) {
                resetOverlayBaseline(table.id)
              }
            }}
            className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-muted hover:text-fg"
          >
            今日の分をリセット
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-muted hover:text-fg"
          >
            使い方
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          専用ウィンドウに「デッキごとの今日の勝敗と合計」を表示します。ここで記録するたびに自動で更新されます。OBSでの設定手順は「使い方」を見てください。
        </p>
      </div>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-sm"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold tracking-wide">配信オーバーレイの使い方</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>
                <span className="font-semibold">「配信オーバーレイを開く」</span>
                を押して専用ウィンドウを開きます。配信中はこのウィンドウを開いたままにしてください（最小化すると取り込めないことがあります）。
              </li>
              <li>
                配信を始めるタイミングで
                <span className="font-semibold">「今日の分をリセット」</span>
                を押します。以降に記録した勝敗だけがオーバーレイに表示されます（通算の記録は消えません）。
              </li>
              <li>
                OBSの「ソース」で
                <span className="font-semibold">「ウィンドウキャプチャ」</span>
                を追加し、オーバーレイのウィンドウ（タイトル「配信オーバーレイ - 相性表名」）を選択します。
              </li>
              <li>
                追加したソースを右クリック →「フィルタ」→ 効果フィルタに
                <span className="font-semibold">「クロマキー」</span>
                を追加します（「色キーの種類」は既定の「緑」のまま）。緑の背景が消えて文字だけが残ります。文字の縁に緑が残る場合は「類似性」「滑らかさ」を少し調整してください。
              </li>
              <li>
                ソースを<span className="font-semibold">Alt（Macは⌥）+ドラッグでクロップ</span>
                すると、映す範囲を行単位で選べます（例: TOTAL行だけ表示）。あとは好きな位置・サイズに配置して完成です。
              </li>
            </ol>
            <p className="mt-4 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
              うまく映らないとき（Windowsでキャプチャが真っ黒になる場合）:
              まずウィンドウキャプチャのプロパティで「キャプチャ方法」を「自動」から「Windows
              10」に変更してみてください。直らない場合は、Chromeの設定（システム）で「グラフィック
              アクセラレーションが使用可能な場合は使用する」をOFFにするか、「画面キャプチャ」で代用してください。
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-md bg-gold px-4 py-2 text-sm font-bold text-abyss transition hover:bg-gold-bright"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
