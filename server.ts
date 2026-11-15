import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerErpApiRoutes } from './api/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WithCoder ERP] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

process.on('unhandledRejection', (reason) => {
  console.error('[WithCoder ERP] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[WithCoder ERP] Uncaught Exception:', err);
});

async function startServer() {
  const app = express();
  registerErpApiRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WithCoder ERP] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
