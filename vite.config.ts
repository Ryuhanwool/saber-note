/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { cheerApi } from './server/vitePlugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env의 DATABASE_URL은 서버 쪽(응원방 API)에만 넘긴다. VITE_ 접두사가 없어 브라우저 코드에는 들어가지 않는다.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), cheerApi(env.DATABASE_URL || undefined)],
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'server/**/*.test.ts'],
    },
  }
})
