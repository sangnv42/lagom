// One-off maintenance: reset the business settings to the two current branches
// (Lagom Flower Dĩ An + Biên Hoà), then publish so /api/public/settings is not stale.
// Run: node scripts/set-store-addresses.mjs [--dry-run]

import { get } from '../server/db.ts';
import { saveDraft } from '../server/revisions.ts';
import { buildManifest, validateRelease, activateRelease } from '../server/releases.ts';

const DRY = process.argv.includes('--dry-run');

const STORES = [
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
];

const primary = STORES[0];
const row = get(`SELECT id, working_revision_id, version FROM entity WHERE type = 'settings' LIMIT 1`);
if (!row) {
  console.error('No settings entity — run pnpm seed first.');
  process.exit(1);
}
const revision = get(`SELECT payload FROM content_revision WHERE id = ?`, row.working_revision_id);
let payload;
try {
  payload = JSON.parse(revision.payload);
} catch {
  console.error(`Settings revision ${row.working_revision_id} payload is not valid JSON.`);
  process.exit(1);
}
payload.business = {
  ...payload.business,
  phone: primary.phone,
  phoneTxt: primary.phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3'),
  address: primary.address,
  mapUrl: primary.mapUrl,
  zaloUrl: `https://zalo.me/${primary.phone}`,
  reviewsCount: 80, // 74 Dĩ An + 6 Biên Hoà, matching src/data/business.ts
  reviewsScore: '4.7',
  stores: STORES,
};

if (DRY) {
  console.log(JSON.stringify(payload.business, null, 2));
  process.exit(0);
}

const saved = saveDraft({ entityId: row.id, payload, actor: null, expectedVersion: row.version, label: 'store addresses reset' });
const built = buildManifest([{ entityType: 'settings', entityId: row.id }], null);
const report = validateRelease(built.id);
if (!report.ok) {
  console.error('Validation failed:', report.entries.flatMap((e) => e.errors));
  process.exit(1);
}
activateRelease({ releaseId: built.id, actor: null, idempotencyKey: `store-addresses-${saved.revisionId}` });
console.log(`Saved revision ${saved.revisionId} and published release ${built.id}.`);
