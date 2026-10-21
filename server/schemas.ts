// Registered payload schemas. Every revision write passes through validatePayload, so an unknown
// entity type or an unregistered option cannot be injected through JSON (BLOCK-02).
//
// Draft mode allows incomplete publication fields (EDIT-05); publish mode is the strict gate (PUB-06).

import type { FieldError } from './errors.ts';
import { validateVariantPricing } from './pricing.ts';
import type { EntityType } from './revisions.ts';

type ValidationMode = 'draft' | 'publish';

export type ValidationContext = {
  mode: ValidationMode;
  /** Existing collection entity ids, for referential checks (DATA-04). */
  collectionIds?: string[];
  /** Stored media asset ids. */
  mediaIds?: string[];
  /** Variant SKUs used by other products, for uniqueness (CAT-02). */
  takenSkus?: string[];
  /** Published-or-draft product entity ids, for selectors in pages and sections. */
  productIds?: string[];
  selfEntityId?: string;
};

export type Validated = { payload: Record<string, unknown>; slug: string | null; errors: FieldError[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const AVAILABILITY = ['available', 'unavailable', 'preorder'] as const;
const SORTS = ['featured', 'new', 'asc', 'desc', 'off'] as const;
const RULE_FIELDS = ['occasion', 'flowerTypes', 'colors', 'priceVnd', 'availability'] as const;
const RULE_OPERATORS = ['in', 'not_in', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte'] as const;
// COPY-03: typed placeholders a UI string template may reference.
const KNOWN_PLACEHOLDERS = ['productName', 'productCode', 'amount', 'total', 'deliveryDate', 'slot', 'recipient', 'address', 'district', 'phone', 'shopName'];

const VALIDATORS: Record<string, (p: Record<string, unknown>, ctx: ValidationContext) => { payload: Record<string, unknown>; slug: string | null; errors: FieldError[] }> = {
  product: validateProduct,
  collection: validateCollection,
  settings: validateSettings,
  'ui-string': validateUiString,
  page: validatePage,
  theme: validateTheme,
  navigation: validateNavigation,
  promotion: validatePromotion,
  testimonial: validateTestimonial,
  faq: validateFaq,
};

export function validatePayload(type: EntityType, payload: Record<string, unknown>, ctx: ValidationContext): Validated {
  const validator = VALIDATORS[type];
  if (!validator) {
    return { payload, slug: null, errors: [{ path: 'type', message: `Entity type "${type}" has no registered schema.` }] };
  }
  return validator(payload, ctx);
}

function validateProduct(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  const title = asString(p.title);
  if (!title) errors.push({ path: 'title', message: 'A product needs a name.' });
  else if (title.length > 200) errors.push({ path: 'title', message: 'Name must be 200 characters or fewer.' });

  // A payload may omit the slug entirely — the entity keeps its existing one. A malformed slug is a
  // draft error; a missing one is only a publication blocker (EDIT-05 allows incomplete drafts).
  const rawSlug = typeof p.slug === 'string' ? p.slug.trim() : '';
  const slug = rawSlug ? slugOf(p.slug) : null;
  if (rawSlug && slug === null) errors.push({ path: 'slug', message: 'Slug must be lowercase words separated by single hyphens.' });
  if (strict && !slug) errors.push({ path: 'slug', message: 'A published product needs a slug.' });

  const sku = asString(p.sku);
  if (strict && !sku) errors.push({ path: 'sku', message: 'A published product needs a SKU.' });
  if (sku && !SKU_PATTERN.test(sku)) errors.push({ path: 'sku', message: 'SKU must be 1-32 letters, digits, dot, underscore or hyphen.' });
  if (sku && ctx.takenSkus?.includes(sku)) errors.push({ path: 'sku', message: `SKU ${sku} is used by another product.` });

  const printed = p.printedNumber;
  if (printed !== undefined && printed !== null && !Number.isInteger(printed)) {
    errors.push({ path: 'printedNumber', message: 'Printed catalog number must be a whole number.' });
  }

  for (const key of ['description', 'careNotes', 'substitutionNote']) {
    const v = p[key];
    if (v !== undefined && v !== null && typeof v !== 'string') errors.push({ path: key, message: `${key} must be plain text.` });
  }

  for (const key of ['collectionIds', 'gallery', 'badges', 'occasion', 'flowerTypes', 'colors', 'relatedIds'] as const) {
    const v = p[key];
    if (v !== undefined && !Array.isArray(v)) errors.push({ path: key, message: `${key} must be a list.` });
  }

  for (const id of asStringList(p.collectionIds)) {
    if (ctx.collectionIds && !ctx.collectionIds.includes(id)) errors.push({ path: 'collectionIds', message: `Collection ${id} does not exist.` });
  }

  const variants = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
  if (!variants.length) {
    // CAT-01: one default variant even when the product has no visible options.
    errors.push({ path: 'variants', message: 'A product needs at least one variant.' });
  }
  const seenVariantIds = new Set<string>();
  const seenSku = new Set<string>();
  variants.forEach((v, i) => {
    const path = `variants[${i}]`;
    const id = asString(v.id);
    if (!id) errors.push({ path: `${path}.id`, message: 'Variant id is required.' });
    else if (seenVariantIds.has(id)) errors.push({ path: `${path}.id`, message: `Duplicate variant id ${id}.` });
    else seenVariantIds.add(id);

    const vsku = asString(v.sku);
    if (vsku) {
      if (seenSku.has(vsku)) errors.push({ path: `${path}.sku`, message: `Duplicate variant SKU ${vsku}.` });
      seenSku.add(vsku);
      if (!SKU_PATTERN.test(vsku)) errors.push({ path: `${path}.sku`, message: `Variant SKU ${vsku} is not a valid SKU.` });
    }
    if (!asString(v.label)) errors.push({ path: `${path}.label`, message: 'Variant needs a label, e.g. "Tiêu chuẩn".' });

    const availability = asString(v.availability) || 'available';
    if (!AVAILABILITY.includes(availability as (typeof AVAILABILITY)[number])) {
      errors.push({ path: `${path}.availability`, message: `Availability must be one of ${AVAILABILITY.join(', ')}.` });
    }
    if (v.leadHours !== undefined && v.leadHours !== null && (!Number.isFinite(Number(v.leadHours)) || Number(v.leadHours) < 0)) {
      errors.push({ path: `${path}.leadHours`, message: 'Lead time must be zero or more hours.' });
    }

    for (const problem of validateVariantPricing(
      {
        priceVnd: numOrNull(v.priceVnd),
        compareAtVnd: numOrNull(v.compareAtVnd),
        salePriceVnd: numOrNull(v.salePriceVnd),
        saleStart: asString(v.saleStart) || null,
        saleEnd: asString(v.saleEnd) || null,
      },
      path,
    )) {
      errors.push({ path: problem.split(':')[0], message: problem.split(': ')[1] ?? problem });
    }
  });

  if (strict && !variants.some((v) => numOrNull(v.priceVnd))) {
    errors.push({ path: 'variants', message: 'A published product needs at least one priced or explicitly quote-only variant.' });
  }

  for (const id of [...asStringList(p.coverAssetId ? [p.coverAssetId] : []), ...variants.flatMap((v) => asStringList(v.imageIds))]) {
    if (ctx.mediaIds && !ctx.mediaIds.includes(id)) errors.push({ path: 'media', message: `Media asset ${id} does not exist.` });
  }

  return { payload: p, slug: slug || null, errors };
}

function validateCollection(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  if (!asString(p.title)) errors.push({ path: 'title', message: 'A collection needs a name.' });
  const rawCollectionSlug = typeof p.slug === 'string' ? p.slug.trim() : '';
  const slug = rawCollectionSlug ? slugOf(p.slug) : null;
  if (rawCollectionSlug && slug === null) errors.push({ path: 'slug', message: 'Slug must be lowercase words separated by single hyphens.' });
  if (strict && !slug) errors.push({ path: 'slug', message: 'A published collection needs a slug.' });

  const mode = asString(p.membershipMode) || 'manual';
  if (mode !== 'manual' && mode !== 'rules') errors.push({ path: 'membershipMode', message: 'Membership mode must be manual or rules.' });

  if (mode === 'manual') {
    if (!Array.isArray(p.manualIds)) errors.push({ path: 'manualIds', message: 'Manual membership needs a list of products.' });
  }
  if (mode === 'rules') {
    const rules = (p.rules ?? {}) as Record<string, unknown>;
    const combine = asString(rules.mode);
    // COL-03: ALL or ANY must be explicit, never implicit.
    if (combine !== 'ALL' && combine !== 'ANY') errors.push({ path: 'rules.mode', message: 'Rule mode must be ALL or ANY.' });
    const conditions = Array.isArray(rules.conditions) ? (rules.conditions as Record<string, unknown>[]) : [];
    if (!conditions.length) errors.push({ path: 'rules.conditions', message: 'A rule-based collection needs at least one condition.' });
    conditions.forEach((c, i) => {
      const path = `rules.conditions[${i}]`;
      if (!RULE_FIELDS.includes(asString(c.field) as (typeof RULE_FIELDS)[number])) {
        errors.push({ path: `${path}.field`, message: `Field must be one of ${RULE_FIELDS.join(', ')}.` });
      }
      if (!RULE_OPERATORS.includes(asString(c.op) as (typeof RULE_OPERATORS)[number])) {
        errors.push({ path: `${path}.op`, message: `Operator must be one of ${RULE_OPERATORS.join(', ')}.` });
      }
      if (c.value === undefined) errors.push({ path: `${path}.value`, message: 'Condition needs a value.' });
    });
  }

  const emptyMode = asString(p.emptyStateMode) || 'empty-state';
  if (!['empty-state', 'recommend', 'omit'].includes(emptyMode)) {
    errors.push({ path: 'emptyStateMode', message: 'Empty behaviour must be empty-state, recommend or omit.' }); // COL-07
  }
  const sort = asString(p.defaultSort);
  if (sort && !SORTS.includes(sort as (typeof SORTS)[number])) errors.push({ path: 'defaultSort', message: `Default sort must be one of ${SORTS.join(', ')}.` });
  const pageSize = p.pageSize;
  if (pageSize !== undefined && (!Number.isInteger(pageSize) || Number(pageSize) < 1 || Number(pageSize) > 96)) {
    errors.push({ path: 'pageSize', message: 'Page size must be between 1 and 96.' });
  }
  if (p.navVisible !== undefined && typeof p.navVisible !== 'boolean') errors.push({ path: 'navVisible', message: 'navVisible must be true or false.' });

  return { payload: p, slug: slug || null, errors };
}

function validateSettings(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  const business = (p.business ?? {}) as Record<string, unknown>;
  if (!asString(business.name)) errors.push({ path: 'business.name', message: 'Business name is required.' });
  const phone = asString(business.phone);
  if (strict && !phone) errors.push({ path: 'business.phone', message: 'A contact number is required before publishing.' });
  if (phone && !/^0\d{9}$/.test(phone.replace(/[\s.]/g, ''))) errors.push({ path: 'business.phone', message: 'Phone must be a 10-digit Vietnamese number, e.g. 0384790349.' });

  const delivery = (p.delivery ?? {}) as Record<string, unknown>;
  const slots = asStringList(delivery.slots);
  if (strict && !slots.length) errors.push({ path: 'delivery.slots', message: 'At least one delivery slot is required.' });
  const lead = delivery.leadHours;
  if (lead !== undefined && (!Number.isFinite(Number(lead)) || Number(lead) < 0)) errors.push({ path: 'delivery.leadHours', message: 'Lead time must be zero or more hours.' });
  for (const s of slots) {
    if (!/^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}/.test(s)) errors.push({ path: 'delivery.slots', message: `Slot "${s}" must look like 08:00 – 11:00.` });
  }

  const mode = asString(p.orderingMode) || 'open';
  if (!['open', 'paused'].includes(mode)) errors.push({ path: 'orderingMode', message: 'Ordering mode must be open or paused.' });
  if (mode === 'paused' && strict && !asString(p.orderingPausedMessage)) {
    // BIZ-06: disabling ordering needs customer-facing guidance.
    errors.push({ path: 'orderingPausedMessage', message: 'Paused ordering needs a customer-facing message.' });
  }

  const tz = asString(p.timezone) || 'Asia/Ho_Chi_Minh';
  if (!/^[A-Za-z_]+(?:\/[A-Za-z_0-9]+)+$/.test(tz)) errors.push({ path: 'timezone', message: 'Timezone must look like Asia/Ho_Chi_Minh.' });

  const origin = asString(p.canonicalOrigin);
  if (origin && !/^https?:\/\/[^\s]+$/.test(origin)) errors.push({ path: 'canonicalOrigin', message: 'Canonical origin must be an http(s) URL.' });

  return { payload: p, slug: 'site', errors };
}

function validateUiString(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  const key = asString(p.key);
  if (!key || !/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(key)) errors.push({ path: 'key', message: 'Key must be dot-separated lowercase words, e.g. cart.empty.' });
  const template = asString(p.template);
  if (strict && !template) errors.push({ path: 'template', message: 'Published copy cannot be empty.' });
  // COPY-03: reject unknown placeholders; missing or extra ones fail publication.
  for (const match of String(template ?? '').matchAll(/\{([^}]*)\}/g)) {
    if (!KNOWN_PLACEHOLDERS.includes(match[1])) {
      errors.push({ path: 'template', message: `Unknown placeholder {${match[1]}}. Allowed: ${KNOWN_PLACEHOLDERS.join(', ')}.` });
    }
  }
  const locale = asString(p.locale) || 'vi-VN';
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) errors.push({ path: 'locale', message: 'Locale must look like vi-VN.' });
  return { payload: p, slug: key || null, errors };
}

// ---- page / appearance / navigation / editorial micro-content ----

// The section component system (§4): admins compose pages from these approved types only; new
// component types require development, content within them is CMS-managed.
export const SECTION_TYPES = [
  'hero', 'benefits', 'category-cards', 'featured-collection', 'featured-products', 'budget-cards',
  'image-text', 'testimonials', 'delivery-info', 'custom-cta', 'brand-story', 'faq-accordion', 'promo-banner',
] as const;

const PROMO_PLACEMENTS = ['header-strip', 'home-hero', 'home-banner', 'footer'] as const;
const NAV_LINK_KINDS = ['page', 'product', 'collection', 'anchor', 'url'] as const;
const THEME_FONTS = ['brand', 'system'] as const;
const THEME_SPACING = ['compact', 'normal', 'loose'] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validatePage(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  if (!asString(p.title)) errors.push({ path: 'title', message: 'A page needs a title.' });
  const rawSlug = typeof p.slug === 'string' ? p.slug.trim() : '';
  const slug = rawSlug ? slugOf(p.slug) : null;
  if (rawSlug && slug === null) errors.push({ path: 'slug', message: 'Slug must be lowercase words separated by single hyphens.' });
  if (strict && !slug) errors.push({ path: 'slug', message: 'A published page needs a slug.' });
  if (p.navVisible !== undefined && typeof p.navVisible !== 'boolean') errors.push({ path: 'navVisible', message: 'navVisible must be true or false.' });

  const sections = Array.isArray(p.sections) ? (p.sections as Record<string, unknown>[]) : null;
  if (!sections) errors.push({ path: 'sections', message: 'A page holds a list of sections.' });
  if (strict && sections && sections.length === 0) errors.push({ path: 'sections', message: 'A published page needs at least one section.' });
  const seenIds = new Set<string>();
  for (const [i, s] of (sections ?? []).entries()) {
    const path = `sections[${i}]`;
    const id = asString(s.id);
    if (!id) errors.push({ path: `${path}.id`, message: 'Section id is required.' });
    else if (seenIds.has(id)) errors.push({ path: `${path}.id`, message: `Duplicate section id ${id}.` });
    else seenIds.add(id);
    const type = asString(s.type);
    if (!SECTION_TYPES.includes(type as (typeof SECTION_TYPES)[number])) {
      errors.push({ path: `${path}.type`, message: `Section type must be one of: ${SECTION_TYPES.join(', ')}.` });
    }
    if (s.hidden !== undefined && typeof s.hidden !== 'boolean') errors.push({ path: `${path}.hidden`, message: 'hidden must be true or false.' });
    if (strict && !asString(s.heading)) errors.push({ path: `${path}.heading`, message: 'Every published section needs a heading.' });
    for (const key of ['description', 'buttonLabel', 'layout'] as const) {
      if (s[key] !== undefined && typeof s[key] !== 'string') errors.push({ path: `${path}.${key}`, message: `${key} must be plain text.` });
    }
    const imageAssetId = asString(s.imageAssetId);
    if (imageAssetId && ctx.mediaIds && !ctx.mediaIds.includes(imageAssetId)) {
      errors.push({ path: `${path}.imageAssetId`, message: `Media asset ${imageAssetId} does not exist.` });
    }
    const collectionId = asString(s.collectionId);
    if (collectionId && ctx.collectionIds && !ctx.collectionIds.includes(collectionId)) {
      errors.push({ path: `${path}.collectionId`, message: `Collection ${collectionId} does not exist.` });
    }
    for (const pid of asStringList(s.productIds)) {
      if (ctx.productIds && !ctx.productIds.includes(pid)) errors.push({ path: `${path}.productIds`, message: `Product ${pid} does not exist.` });
    }
    for (const item of Array.isArray(s.items) ? (s.items as Record<string, unknown>[]) : []) {
      if (!asString(item.label)) errors.push({ path: `${path}.items`, message: 'Every list entry needs a label.' });
    }
  }
  return { payload: p, slug: slug || null, errors };
}

function validateTheme(p: Record<string, unknown>, _ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const colors = (p.colors ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
      errors.push({ path: `colors.${key}`, message: 'Colors are 6-digit hex values, e.g. #1a7a5e.' });
    }
  }
  const radius = p.radiusPx;
  if (radius !== undefined && (!Number.isInteger(radius) || Number(radius) < 0 || Number(radius) > 24)) {
    errors.push({ path: 'radiusPx', message: 'Corner radius is a whole number of pixels between 0 and 24.' });
  }
  const width = p.contentMaxPx;
  if (width !== undefined && (!Number.isInteger(width) || Number(width) < 900 || Number(width) > 1600)) {
    errors.push({ path: 'contentMaxPx', message: 'Content width is a whole number of pixels between 900 and 1600.' });
  }
  if (p.font !== undefined && !THEME_FONTS.includes(asString(p.font) as (typeof THEME_FONTS)[number])) {
    errors.push({ path: 'font', message: `Font must be one of: ${THEME_FONTS.join(', ')}.` });
  }
  if (p.spacing !== undefined && !THEME_SPACING.includes(asString(p.spacing) as (typeof THEME_SPACING)[number])) {
    errors.push({ path: 'spacing', message: `Section spacing must be one of: ${THEME_SPACING.join(', ')}.` });
  }
  return { payload: p, slug: 'site', errors };
}

function validateNavigation(p: Record<string, unknown>, _ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const checkItems = (items: unknown, path: string, depth: number) => {
    if (!Array.isArray(items)) {
      errors.push({ path, message: 'Menu needs a list of links.' });
      return;
    }
    for (const [i, item] of (items as Record<string, unknown>[]).entries()) {
      const itemPath = `${path}[${i}]`;
      if (!asString(item.label)) errors.push({ path: `${itemPath}.label`, message: 'A menu link needs a label.' });
      const kind = asString(item.kind);
      if (!NAV_LINK_KINDS.includes(kind as (typeof NAV_LINK_KINDS)[number])) {
        errors.push({ path: `${itemPath}.kind`, message: `Link kind must be one of: ${NAV_LINK_KINDS.join(', ')}.` });
      }
      const value = asString(item.value);
      if (!value) errors.push({ path: `${itemPath}.value`, message: 'A link needs a target.' });
      else if (kind === 'url' && !/^https?:\/\/.+/.test(value)) errors.push({ path: `${itemPath}.value`, message: 'External links must start with http:// or https://.' });
      else if (kind === 'anchor' && !value.startsWith('#')) errors.push({ path: `${itemPath}.value`, message: 'Anchors must start with #.' });
      if (item.visible !== undefined && typeof item.visible !== 'boolean') errors.push({ path: `${itemPath}.visible`, message: 'visible must be true or false.' });
      if (item.children !== undefined) {
        if (depth >= 1) errors.push({ path: `${itemPath}.children`, message: 'Menus nest at most one level deep.' });
        else checkItems(item.children, `${itemPath}.children`, depth + 1);
      }
    }
  };
  if (p.header !== undefined) checkItems(p.header, 'header', 0);
  if (p.footerGroups !== undefined) {
    if (!Array.isArray(p.footerGroups)) errors.push({ path: 'footerGroups', message: 'Footer needs a list of link groups.' });
    else {
      for (const [gi, group] of (p.footerGroups as Record<string, unknown>[]).entries()) {
        if (!asString(group.title)) errors.push({ path: `footerGroups[${gi}].title`, message: 'A footer group needs a title.' });
        checkItems(group.items, `footerGroups[${gi}].items`, 1);
      }
    }
  }
  return { payload: p, slug: 'site', errors };
}

function validatePromotion(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  if (!asString(p.title)) errors.push({ path: 'title', message: 'A promotion needs a title.' });
  const placement = asString(p.placement) || 'home-banner';
  if (!PROMO_PLACEMENTS.includes(placement as (typeof PROMO_PLACEMENTS)[number])) {
    errors.push({ path: 'placement', message: `Placement must be one of: ${PROMO_PLACEMENTS.join(', ')}.` });
  }
  const priority = p.priority;
  if (priority !== undefined && (!Number.isInteger(priority) || Number(priority) < 0 || Number(priority) > 100)) {
    errors.push({ path: 'priority', message: 'Priority is a whole number between 0 and 100.' });
  }
  const start = asString(p.startAt);
  const end = asString(p.endAt);
  for (const [key, value] of [['startAt', start], ['endAt', end]] as const) {
    if (value && Number.isNaN(Date.parse(value))) errors.push({ path: key, message: `${key} must be a full date-time, e.g. 2026-10-19T17:00:00Z.` });
  }
  if (start && end && !Number.isNaN(Date.parse(start)) && !Number.isNaN(Date.parse(end)) && Date.parse(end) <= Date.parse(start)) {
    errors.push({ path: 'endAt', message: 'The end must be after the start.' });
  }
  const image = asString(p.imageAssetId);
  if (image && ctx.mediaIds && !ctx.mediaIds.includes(image)) errors.push({ path: 'imageAssetId', message: `Media asset ${image} does not exist.` });
  const link = asString(p.link);
  if (link && !/^(https?:\/\/|#|\/)/.test(link)) errors.push({ path: 'link', message: 'Destination must be an internal path, #anchor, or full http(s) URL.' });
  if (p.visible !== undefined && typeof p.visible !== 'boolean') errors.push({ path: 'visible', message: 'visible must be true or false.' });
  return { payload: p, slug: null, errors };
}

function validateTestimonial(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  if (!asString(p.name) && strict) errors.push({ path: 'name', message: 'A published testimonial needs the customer display name.' });
  if (!asString(p.quote)) errors.push({ path: 'quote', message: 'A testimonial needs the quote.' });
  const rating = p.rating;
  if (rating !== undefined && rating !== null && (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5)) {
    errors.push({ path: 'rating', message: 'Rating is a whole number of stars between 1 and 5.' });
  }
  const sourceUrl = asString(p.sourceUrl);
  if (sourceUrl && !/^https?:\/\/.+/.test(sourceUrl)) errors.push({ path: 'sourceUrl', message: 'Source URL must start with http:// or https://.' });
  return { payload: p, slug: null, errors };
}

function validateFaq(p: Record<string, unknown>, ctx: ValidationContext): Validated {
  const errors: FieldError[] = [];
  const strict = ctx.mode === 'publish';
  if (!asString(p.question)) errors.push({ path: 'question', message: 'An FAQ needs the question.' });
  if (!asString(p.category)) errors.push({ path: 'category', message: 'An FAQ needs a category.' });
  if (!asString(p.answer) && strict) errors.push({ path: 'answer', message: 'A published FAQ needs the answer.' });
  const sort = p.sort;
  if (sort !== undefined && (!Number.isInteger(sort) || Number(sort) < 0)) errors.push({ path: 'sort', message: 'Order must be zero or more.' });
  return { payload: p, slug: null, errors };
}

function slugOf(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim().toLowerCase();
  return SLUG_PATTERN.test(s) ? s : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
