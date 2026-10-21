// Server entry: serves the built storefront and admin SPA plus the /api surface, from one Node
// process. Run with `pnpm api` (dev, with vite proxying /api here) or `pnpm start` after a build.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './db.ts';
import { routes } from './routes.ts';
import { createHandler, startServer } from './http.ts';
import { ensureOwner, ensureSettings } from './seed.ts';

const PORT = Number(process.env.PORT ?? process.env.LAGOM_PORT ?? 8787);

function main(): void {
  db(); // opens the file and applies migrations before the first request
  const owner = ensureOwner();
  if (owner.created) {
    process.stdout.write(`Seeded Owner account: ${owner.email}\n`);
    if (owner.password) process.stdout.write(`Temporary password (shown once): ${owner.password}\n`);
  }
  ensureSettings();

  const staticRoot = resolve(process.cwd(), 'dist');
  if (!existsSync(resolve(staticRoot, 'index.html'))) {
    process.stdout.write('No dist/index.html yet — the API works, but pages need `pnpm build` first.\n');
  }
  const handler = createHandler(routes(), staticRoot);
  startServer(handler, PORT);
}

main();
