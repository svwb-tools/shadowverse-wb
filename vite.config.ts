import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages はリポジトリ名がURLパスに入るため、CI ビルド時のみ base を設定する。
// リポジトリ名を変える場合はここを合わせること。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? '/shadowverse-wb/' : '/',
})
