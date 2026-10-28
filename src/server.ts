import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { Readable } from 'node:stream';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Relais de /api vers le backend, pour la pile Docker locale seulement
 * (API_PROXY_URL=http://backend:8081). Le site construit appelle /api sur sa
 * propre origine ; en production c'est Caddy qui relaie, et cette variable
 * reste vide.
 */
const apiProxyUrl = process.env['API_PROXY_URL'];
if (apiProxyUrl) {
  app.use('/api', async (req, res, next) => {
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string' && name !== 'host' && name !== 'connection') {
          headers.set(name, value);
        }
      }
      headers.set('x-forwarded-for', req.socket.remoteAddress ?? '');

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const upstream = await fetch(`${apiProxyUrl}${req.originalUrl}`, {
        method: req.method,
        headers,
        body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
        duplex: 'half',
      } as RequestInit);

      res.status(upstream.status);
      upstream.headers.forEach((value, name) => {
        // fetch a deja decompresse le corps : ces en-tetes ne le decrivent plus.
        if (name !== 'content-encoding' && name !== 'content-length' && name !== 'transfer-encoding') {
          res.setHeader(name, value);
        }
      });
      if (upstream.body) {
        Readable.fromWeb(upstream.body as never).pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      next(error);
    }
  });
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
