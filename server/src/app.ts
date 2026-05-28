import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, uploadsDir } from './db.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import financesRoutes from './routes/finances.js';
import clientsRoutes from './routes/clients.js';
import servicesRoutes from './routes/services.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initDatabase();

export function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  if (process.env.VERCEL || !isProduction) {
    app.use(cors());
  } else if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN }));
  }

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/finances', financesRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/settings', settingsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      name: 'PrimeCell API',
      platform: process.env.VERCEL ? 'vercel' : 'node',
    });
  });

  const clientDist =
    process.env.CLIENT_DIST_PATH ||
    (isProduction || process.env.VERCEL
      ? path.join(__dirname, '../../client/dist')
      : null);

  if (clientDist && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    if (process.env.VERCEL) {
      console.log(`Vercel: servindo frontend de ${clientDist}`);
    }
  } else if (process.env.VERCEL) {
    console.warn('Vercel: pasta client/dist não encontrada em', clientDist);
  }

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(400).json({ error: err.message || 'Erro na requisição' });
    }
  );

  return app;
}
