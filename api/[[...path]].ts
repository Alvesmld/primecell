import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import { createApp } from '../server/dist/app.js';

const app = createApp();
const handler = serverless(app);

function normalizeUrl(req: VercelRequest): void {
  let url = req.url || '/';

  // Alguns ambientes enviam só o path após /api
  if (url.startsWith('/auth') || url.startsWith('/dashboard')) {
    url = `/api${url}`;
  }

  // Uploads: rewrite envia /api/uploads/... mas o Express serve em /uploads/...
  if (url.startsWith('/api/uploads')) {
    (req as VercelRequest & { url: string }).url = url.replace(/^\/api/, '');
    return;
  }
  if (url.startsWith('/uploads/') || url === '/uploads') {
    (req as VercelRequest & { url: string }).url = url;
    return;
  }

  if (!url.startsWith('/api')) {
    const pathParam = (req.query as { path?: string | string[] }).path;
    const segments = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;
    if (segments) {
      url = `/api/${segments}`;
    } else if (!url.startsWith('/')) {
      url = `/api/${url}`;
    } else {
      url = `/api${url}`;
    }
  }

  (req as VercelRequest & { url: string }).url = url;
}

export default async function (req: VercelRequest, res: VercelResponse) {
  try {
    normalizeUrl(req);
    return await handler(req, res);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro interno do servidor',
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};
