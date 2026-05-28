import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import { createApp } from '../server/dist/app.js';

const app = createApp();
const handler = serverless(app);

function restoreOriginalUrl(req: VercelRequest) {
  const raw =
    (req.headers['x-vercel-original-url'] as string) ||
    (req.headers['x-original-url'] as string) ||
    (req.headers['x-forwarded-uri'] as string);

  if (raw) {
    try {
      const pathname = raw.startsWith('http')
        ? new URL(raw).pathname
        : raw.split('?')[0];
      if (pathname && pathname !== '/api') {
        (req as VercelRequest & { url: string }).url = pathname;
      }
    } catch {
      /* ignore */
    }
  }
}

export default async function handlerFn(req: VercelRequest, res: VercelResponse) {
  try {
    restoreOriginalUrl(req);
    return await handler(req, res);
  } catch (err) {
    console.error('PrimeCell API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno do servidor',
    });
  }
}
