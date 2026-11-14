// 서버 전용: 응원방 API를 Vite 개발 서버(npm run dev)와 미리 보기 서버(npm run preview)에 붙이는 플러그인.
// vite build 결과물(dist/)에는 들어가지 않는다. dist/를 정적 호스팅에만 올리면 API가 없어 브라우저 저장으로 돌아간다.
import type { Plugin } from 'vite'
import { cheerApiMiddleware } from './cheerApi.ts'
import { createQuery } from './db.ts'

export function cheerApi(databaseUrl: string | undefined): Plugin {
  const middleware = () => cheerApiMiddleware(databaseUrl ? createQuery(databaseUrl) : null)
  return {
    name: 'saber-note-cheer-api',
    configureServer(server) {
      server.middlewares.use(middleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware())
    },
  }
}
