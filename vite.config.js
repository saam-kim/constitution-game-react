import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/constitution-game-react/', // 👈 이 줄 추가!
  plugins: [react()],
})
