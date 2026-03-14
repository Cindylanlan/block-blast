import { defineConfig } from 'vite'

function debugProfilerPlugin() {
  return {
    name: 'debug-profiler',
    configureServer(server: { middlewares: { use: (fn: (req: unknown, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((req: unknown, res: unknown, next: () => void) => {
        const r = req as { method?: string; url?: string; on: (e: string, fn: (chunk?: unknown) => void) => void }
        const w = res as { statusCode?: number; end: (chunk?: string) => void }
        if (!r.url?.startsWith('/__debug') || r.method !== 'POST') return next()
        let body = ''
        r.on('data', (chunk: unknown) => { body += String(chunk) })
        r.on('end', () => {
          try {
            const entry = JSON.parse(body)
            console.log('[DEBUG]', JSON.stringify(entry))
          } catch {
            console.log('[DEBUG]', body)
          }
          w.statusCode = 204
          w.end()
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/block-blast/', // GitHub Pages / Gitee Pages 子路径
  plugins: [debugProfilerPlugin()],
  server: {
    host: '0.0.0.0',
  },
})
