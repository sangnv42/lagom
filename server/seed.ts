// Seed step: guarantees one Owner, and optionally imports the owner's price list as drafts.
// Run with: pnpm seed            (owner only)
//           pnpm seed --catalog  (owner + 60 products as unpublished drafts)
//
// The catalog import deliberately leaves everything unpublished, so a fresh install shows the
// setup tasks the requirements ask for (DASH-05) instead of pretending content is live.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { closeDb, db, get } from './db.ts';
import { createUser, listUsers } from './auth.ts';
import { applyImport, planImport, DEFAULT_NAMESPACE } from './importer.ts';
import { createEntity } from './revisions.ts';

const DEFAULT_OWNER_EMAIL = 'owner@lagom.test';
const BOOTSTRAP_NOTE = 'Change this after signing in. It is generated once and never stored in the repository.';

export function ensureOwner(): { created: boolean; email: string; password: string | null } {
  db();
  if (listUsers().length) {
    const first = listUsers()[0];
    return { created: false, email: first.email, password: null };
  }
  const email = (process.env.LAGOM_ADMIN_EMAIL ?? DEFAULT_OWNER_EMAIL).toLowerCase();
  const fromEnv = process.env.LAGOM_ADMIN_PASSWORD;
  const password = fromEnv ?? randomBootstrapPassword();
  createUser({ email, name: 'Store Owner', role: 'owner', password, actor: null });
  // A generated password is returned once for the operator log; an env password is never echoed.
  return { created: true, email, password: fromEnv ? null : password };
}

/** Seeds the business settings singleton so the storefront has real contact details to read. */
export function ensureSettings(): boolean {
  const existing = get<{ id: string }>(`SELECT id FROM entity WHERE type = 'settings' LIMIT 1`);
  if (existing) return false;
  createEntity({
    type: 'settings',
    slug: 'site',
    payload: {
      business: {
        name: 'Lagom Flower',
        phone: '0353198089',
        phoneTxt: '0353 198 089',
        address: '63 Trần Hưng Đạo, Dĩ An',
        mapUrl: 'https://maps.google.com/?q=63+Tr%E1%BA%A7n+H%C6%B0ng+%C4%90%E1%BA%A1o+D%E1%BB%8B+An',
        zaloUrl: 'https://zalo.me/0353198089',
        reviewsCount: 80,
        reviewsScore: '4.7',
        stores: [
          {
            name: 'Lagom Flower Dĩ An',
            address: '63 Trần Hưng Đạo, Dĩ An',
            phone: '0353198089',
            mapUrl: 'https://maps.google.com/?q=63+Tr%E1%BA%A7n+H%C6%B0ng+%C4%90%E1%BA%A1o+D%E1%BB%8B+An',
          },
          {
            name: 'Lagom Flower Biên Hoà',
            address: 'Đồng Nai',
            phone: '0353198072',
            mapUrl: 'https://maps.google.com/?q=Lagom+Flower+Bi%C3%AAn+Ho%C3%A0',
          },
        ],
      },
      delivery: {
        slots: ['08:00 – 11:00', '11:00 – 14:00', '15:00 – 18:00'],
        holidaySlot: '18:00 – 20:00 (ngày lễ)',
        leadHours: 2,
        holidays: ['01-01', '02-14', '03-08', '04-30', '05-01', '09-02', '10-20', '11-20', '12-24', '12-25'],
      },
      orderingMode: 'open',
      timezone: 'Asia/Ho_Chi_Minh',
      canonicalOrigin: process.env.VITE_SITE_URL ?? 'http://localhost:5173',
    },
    actor: null,
    label: 'seed',
  });
  return true;
}

/** Imports flower_prices.json plus the photo set into drafts, ready for owner review. */
export function importCatalog(): { created: number; updated: number; skipped: number } {
  const source = [
    join(process.cwd(), 'src', 'data', 'flower-prices.json'),
    join(process.cwd(), 'flower_prices.json'),
  ].find((p) => existsSync(p));
  if (!source) {
    process.stdout.write('No price list found (src/data/flower-prices.json). Skipping catalog import.\n');
    return { created: 0, updated: 0, skipped: 0 };
  }
  const text = readFileSync(source, 'utf8');
  const imageDir = join(process.cwd(), 'public', 'img', 'hoa');
  const plan = planImport({
    text,
    filename: 'flower-prices.json',
    namespace: DEFAULT_NAMESPACE,
    actor: null,
    dryRun: false,
    imageDir: existsSync(imageDir) ? imageDir : null,
  });
  process.stdout.write(
    `Plan: ${plan.total} rows — ${plan.counts.new} new, ${plan.counts.modified} modified, ${plan.counts.unchanged} unchanged, ${plan.counts.invalid} invalid\n`,
  );
  const applied = applyImport({ jobId: plan.jobId, actor: null, imageDir: existsSync(imageDir) ? imageDir : null });
  return { created: applied.created, updated: applied.updated, skipped: applied.skipped };
}

function randomBootstrapPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxy z23456789';
  let out = '';
  while (out.length < 20) {
    const byte = new Uint8Array(1);
    globalThis.crypto.getRandomValues(byte);
    const ch = alphabet[byte[0] % alphabet.length];
    if (ch && ch !== ' ') out += ch;
  }
  return out;
}

function main(): void {
  const owner = ensureOwner();
  if (owner.created) {
    process.stdout.write(`Created Owner account: ${owner.email}\n`);
    if (owner.password) process.stdout.write(`Temporary password: ${owner.password}\n${BOOTSTRAP_NOTE}\n`);
  } else {
    process.stdout.write(`Owner already exists (${owner.email}).\n`);
  }
  const wantCatalog = process.argv.includes('--catalog') || process.argv.includes('--with-catalog');
  if (wantCatalog) {
    const result = importCatalog();
    process.stdout.write(`Catalog drafts — created ${result.created}, updated ${result.updated}, unchanged/skipped ${result.skipped}.\n`);
  } else {
    process.stdout.write('Pass --catalog to import the 60-item price list as reviewable drafts.\n');
  }
  const settings = ensureSettings();
  process.stdout.write(settings ? 'Seeded business settings.\n' : 'Business settings already present.\n');
  closeDb();
}

// Run when executed directly (pnpm seed). pathToFileURL is required because process.argv[1] is a
// Windows path with backslashes, which never matches a file:// URL as a raw string.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
