import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['ATRIO_STORAGE', 'ATRIO_DATA_DIR', 'BLOB_STORE_ID', 'BLOB_READ_WRITE_TOKEN', 'VERCEL_OIDC_TOKEN']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  function serveApi(server) {
    server.middlewares.use('/api/clinic', async (req, res) => {
      const { default: handler } = await import('./api/clinic.js')
      await handler(req, res)
    })
  }
  return {
    plugins: [react(), { name: 'atrio-api', configureServer: serveApi, configurePreviewServer: serveApi }],
    server: { fs: { deny: ['.env', '.env.*', '**/.git/**', '**/.data/**', '**/*.sqlite*', '**/server/**', '**/api/**', '**/*.pem', '**/*.crt'] } }
  }
})
