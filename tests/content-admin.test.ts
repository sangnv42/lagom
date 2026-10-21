// Focused tests for the admin CMS content areas added in the admin rework: the new payload
// schemas (§4/§8/§9/§10 of the product spec) and the draft/publish isolation of the public
// /api/public/site resolver. Uses the in-memory SQLite so no temp files are left behind.

process.env.LAGOM_DB = ':memory:';

import { beforeAll, describe, expect, it } from 'vitest';
import { validatePayload } from '../server/schemas.ts';
import { createEntity, saveDraft, getEntity, setVisibility } from '../server/revisions.ts';
import { buildManifest, activateRelease, publicSite, getActiveRelease } from '../server/releases.ts';
import { can } from '../server/permissions.ts';
import type { Actor } from '../server/permissions.ts';

const owner: Actor = { userId: 'u-owner', role: 'owner', status: 'active' };
const editor: Actor = { userId: 'u-editor', role: 'content-editor', status: 'active' };

beforeAll(() => {
  // touch the DB so migrations run against the memory file
  publicSite();
});

describe('page schema', () => {
  it('rejects unregistered section types and duplicate section ids', () => {
    const { errors } = validatePayload('page', {
      title: 'Trang chủ',
      slug: 'home',
      sections: [
        { id: 'a', type: 'iframe-embed', heading: 'x' },
        { id: 'a', type: 'hero', heading: 'y' },
      ],
    }, { mode: 'draft' });
    expect(errors.some((e) => e.path === 'sections[0].type')).toBe(true);
    expect(errors.some((e) => e.path === 'sections[1].id')).toBe(true);
  });

  it('blocks publication without a slug, without sections, or with a section missing a heading', () => {
    const noSlug = validatePayload('page', { title: 'x', sections: [{ id: 'a', type: 'hero', heading: 'h' }] }, { mode: 'publish' });
    expect(noSlug.errors.some((e) => e.path === 'slug')).toBe(true);
    const noSections = validatePayload('page', { title: 'x', slug: 'a-page' }, { mode: 'publish' });
    expect(noSections.errors.some((e) => e.path === 'sections')).toBe(true);
    const noHeading = validatePayload('page', { title: 'x', slug: 'a-page', sections: [{ id: 'a', type: 'hero' }] }, { mode: 'publish' });
    expect(noHeading.errors.some((e) => e.path === 'sections[0].heading')).toBe(true);
  });

  it('accepts a well-formed composed page', () => {
    const { errors } = validatePayload('page', {
      title: 'Trang chủ',
      slug: 'home',
      sections: [
        { id: 'h1', type: 'hero', heading: 'Lagom', description: 'hoa tuoi' },
        { id: 'b1', type: 'benefits', heading: 'Cam ket', items: [{ label: 'Giao nhanh' }] },
      ],
    }, { mode: 'publish' });
    expect(errors).toEqual([]);
  });
});

describe('theme / navigation / micro-content schemas', () => {
  it('rejects out-of-range theme tokens', () => {
    const { errors } = validatePayload('theme', { colors: { accent: 'red' }, radiusPx: 99 }, { mode: 'draft' });
    expect(errors.some((e) => e.path === 'colors.accent')).toBe(true);
    expect(errors.some((e) => e.path === 'radiusPx')).toBe(true);
  });

  it('rejects malformed navigation links and over-nested menus', () => {
    const { errors } = validatePayload('navigation', {
      header: [
        { label: 'Ngoai', kind: 'url', value: 'ftp://x' },
        { label: 'Neo', kind: 'anchor', value: 'neo' },
        { label: 'Cha', kind: 'page', value: 'a', children: [{ label: 'Con', kind: 'page', value: 'b', children: [] }] },
      ],
    }, { mode: 'draft' });
    expect(errors.some((e) => e.path === 'header[0].value')).toBe(true);
    expect(errors.some((e) => e.path === 'header[1].value')).toBe(true);
    expect(errors.some((e) => e.path === 'header[2].children[0].children')).toBe(true);
  });

  it('rejects a promotion whose end precedes its start', () => {
    const { errors } = validatePayload('promotion', {
      title: '20-10',
      startAt: '2026-10-19T17:00:00Z',
      endAt: '2026-10-01T00:00:00Z',
    }, { mode: 'draft' });
    expect(errors.some((e) => e.path === 'endAt')).toBe(true);
  });

  it('requires display name and answer only at publication for testimonials and FAQs', () => {
    expect(validatePayload('testimonial', { quote: 'x' }, { mode: 'draft' }).errors).toEqual([]);
    expect(validatePayload('testimonial', { quote: 'x' }, { mode: 'publish' }).errors.some((e) => e.path === 'name')).toBe(true);
    expect(validatePayload('faq', { question: 'q', category: 'c' }, { mode: 'publish' }).errors.some((e) => e.path === 'answer')).toBe(true);
  });
});

describe('public site isolation', () => {
  let pageId: string;
  let promoActiveId: string;
  let promoExpiredId: string;

  beforeAll(() => {
    const page = createEntity({
      type: 'page',
      slug: 'home',
      payload: { title: 'Trang chu', slug: 'home', sections: [{ id: 'h', type: 'hero', heading: 'Live' }, { id: 'x', type: 'benefits', heading: 'Hidden', hidden: true }] },
      actor: owner,
    });
    pageId = page.entityId;
    promoActiveId = createEntity({ type: 'promotion', slug: null, payload: { title: 'Đang chạy', priority: 5 }, actor: owner }).entityId;
    promoExpiredId = createEntity({ type: 'promotion', slug: null, payload: { title: 'Hết hạn', startAt: '2020-01-01T00:00:00Z', endAt: '2020-01-02T00:00:00Z' }, actor: owner }).entityId;
    const built = buildManifest(
      [
        { entityType: 'page', entityId: pageId },
        { entityType: 'promotion', entityId: promoActiveId },
        { entityType: 'promotion', entityId: promoExpiredId },
      ],
      owner,
    );
    activateRelease({ releaseId: built.id, actor: owner, idempotencyKey: 'test-release' });
  });

  it('serves only published content, drops hidden sections and expired promotions', () => {
    const site = publicSite(new Date('2026-03-01T00:00:00Z'));
    expect(site.releaseId).toBeTruthy();
    const home = site.pages.find((p) => p.slug === 'home');
    expect(home).toBeTruthy();
    expect((home!.sections as { id: string }[]).map((s) => s.id)).toEqual(['h']);
    expect(site.promotions.map((p) => p.title)).toEqual(['Đang chạy']);
  });

  it('a draft edit never changes the public payload until publish', () => {
    const before = publicSite().pages.find((p) => p.slug === 'home')!.title;
    saveDraft({ entityId: pageId, payload: { title: 'Draft title', slug: 'home', sections: [] }, actor: owner, expectedVersion: getEntityVersion(pageId) });
    expect(publicSite().pages.find((p) => p.slug === 'home')!.title).toBe(before);
  });

  it('publishing a new revision swaps the public payload atomically for a fresh manifest', () => {
    saveDraft({ entityId: pageId, payload: { title: 'Live v2', slug: 'home', sections: [{ id: 'h', type: 'hero', heading: 'Live' }] }, actor: owner, expectedVersion: getEntityVersion(pageId) });
    const built = buildManifest([{ entityType: 'page', entityId: pageId }], owner);
    activateRelease({ releaseId: built.id, actor: owner, idempotencyKey: 'test-release-2' });
    // A single-entity manifest replaces the previous active release entirely (compare-and-swap pointer).
    const site = publicSite(new Date('2026-03-01T00:00:00Z'));
    expect(site.pages.find((p) => p.slug === 'home')!.title).toBe('Live v2');
    expect(site.promotions).toEqual([]);
    expect(getActiveRelease()!.releaseId).toBe(built.id);
  });
});

function getEntityVersion(id: string): number {
  return getEntity(id)!.version;
}

describe('permission guard for the new surfaces', () => {
  it('a content-editor may draft promotions but may never publish them', () => {
    expect(can(editor, 'create', 'global').allowed).toBe(true);
    expect(can(editor, 'publish', 'release').allowed).toBe(false);
    expect(can(owner, 'publish', 'release').allowed).toBe(true);
  });
});
