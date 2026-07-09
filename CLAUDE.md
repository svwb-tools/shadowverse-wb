# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Shadowverse: Worlds Beyond の「自分専用」相性表Webアプリ。完全クライアントサイド（サーバー・DB・認証なし）で、全データはlocalStorageに保存される。mainへのpushでGitHub Actionsが自動デプロイする（公開: https://svwb-tools.github.io/shadowverse-wb/ ）。

## コマンド

```sh
pnpm dev                              # 開発サーバー
pnpm test                             # 全テスト（vitest）
pnpm vitest run src/logic/share.test.ts   # 単一ファイルのテスト
pnpm build                            # 型チェック(tsc --noEmit) + 本番ビルド。完了報告前に必ず通すこと
```

## アーキテクチャ

- **データモデルの核**（src/types.ts）: `MatchupTable` が1つの相性表。相性値セルは `cells[`${myDeckId}:${fieldDeckId}`]` で、値の意味は「自分が行のデッキを使って列のデッキに当たったときの勝率」＝**非対称・使い手の練度込み**（理論相性表ではない）。`decks` 配列の並びが正準の表示順（ドラッグ並べ替えの対象）、`myDeckIds`/`fieldDeckIds` は役割の集合で、マトリクスの行・列の順序は常に `decks` から導出する。
- **値の算出パイプライン**（src/logic/analysis.ts）: `cellEstimate` = 生の主観値 → 実績ブレンド（`records`＋`recordBlend`、主観をpriorGames戦分として加重平均）→ デッキパワー補正（`powerAdjust`）。マトリクス表示・ランキング・大会持ち込み計算・散布図のすべてが `buildCtx` 経由でこの値を使う。**セル編集は常にブレンド前の生値に対して行う**（src/logic/matchup.ts）。
- **ミラー自動補完**（src/logic/matchup.ts）: 双方向登録デッキのセル編集時、相手側セルを100−値で自動補完するが、`source: 'manual'` のセルは絶対に上書きしない。
- **永続化**（src/store.ts）: zustand persist（キー `svwb-matchup-v1`、version 3）。`MatchupTable` にフィールドを追加したら **versionを上げてmigrateに既定値を追加**すること（既存ユーザーのデータが壊れる）。
- **共有と外部入力の検証**（src/logic/share.ts）: URL共有（`#d=` + lz-string）とJSONファイルの入口はすべて `normalizeTable` を通る。ここが唯一の検証ゲートで、上限（ペイロード5MB・解凍前400KB・デッキ100個・名前100文字・IDに`:`禁止）を持つ。**端末ローカル設定（`overlayBaseline`・`overlayTextColor`）は `toShareable` で共有から除外**する——新しいローカル設定を足すときも同様に。
- **配信オーバーレイ**（src/components/StreamOverlay.tsx）: `#overlay=<tableId>` ルートで開く別ウィンドウ。localStorageの `storage` イベント＋3秒ポーリングで `useStore.persist.rehydrate()` を呼んで同期する。背景はクロマキー用の緑一色、文字は完全不透明・テーマ非依存で描く（半透明はキーイングで壊れる）。
- **テーマ**（src/index.css）: ライトが既定。CSS変数を `:root` / `:root[data-theme='dark']` で切り替え、Tailwind v4 の `@theme inline` でユーティリティに接続。描画前に index.html のインラインスクリプトが data-theme を設定する（FOUC防止）。

## 不変条件・注意点

- **クラスカラー**（src/constants.ts の CLASS_COLORS）はライト/ダーク両方の背景で色覚多様性・コントラスト検証済み。変更する場合は再検証が必要。
- **UI文言は非エンジニア向け**に統一している: 「相性表」（テーブルと言わない）、「データ保存/データ読み込み」（JSONと言わない）、「デッキの遭遇率」「デッキパワー補正」。localStorage等の技術用語をUIに出さない。
- **IME対応**: テキスト入力のEnterハンドラは必ず `!e.nativeEvent.isComposing` を確認する（変換確定のEnterで送信される事故の防止）。
- **権利方針（重要）**: ゲームの画像・カードイラスト・ロゴ・スクリーンショットは使用禁止。**自作のキャラクターイラストも翻案物として不可**（Cygamesガイドラインで明文禁止）。使ってよいのはテキストでの名称言及とオリジナル意匠のみ。
- **コミット**: メッセージは日本語。このリポジトリの作者情報はrepo-localのnoreplyアドレスに設定済みで、**ユーザーの実メールアドレスを履歴に入れない**。
- テストはロジック層（src/logic/、store）のみ。UIの自動テストはないため、UI変更時は `pnpm test && pnpm build` を通した上で、ブラウザ確認が必要な点を報告に明記する。
