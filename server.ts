import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { createApiApp } from './src/server/app.ts';

const PORT = 3000;
const app = createApiApp();
const server = http.createServer(app);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: hmrDisabled ? false : { server },
        hmr: hmrDisabled ? false : true,
      },
      appType: 'spa',
    });
    if (hmrDisabled) {
      app.get('/@vite/client', (_req, res) => {
        res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.type = 'text/css';
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) style.parentNode.removeChild(style);
  sheetsMap.delete(id);
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    dispose() {},
    prune() {},
    invalidate() {},
    decline() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) { return url; }
export class ErrorOverlay extends HTMLElement {}
`);
      });
    }
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixel Front server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
