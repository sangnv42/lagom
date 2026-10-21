// Permission evaluation (docs/admin/permission-matrix.md). Pure functions over plain data so the
// matrix is testable without a database or HTTP layer.
//
// PERM-01: a decision is (resource, action, scope, field group) — never the role name alone.
// PERM-04: callers enforce this on the server for every request, including bulk, import, preview
// and asset reads. Hiding a control in the admin UI is not enforcement.

export type Role = 'owner' | 'admin' | 'content-editor' | 'catalog-manager' | 'publisher' | 'viewer';

export type Action =
  | 'read'
  | 'create'
  | 'edit'
  | 'price'
  | 'availability'
  | 'request_review'
  | 'approve'
  | 'publish'
  | 'schedule'
  | 'archive'
  | 'restore'
  | 'export'
  | 'manage_settings'
  | 'manage_users'
  | 'manage_ownership';

export type ResourceType =
  | 'product'
  | 'collection'
  | 'taxonomy'
  | 'media'
  | 'page'
  | 'template'
  | 'section'
  | 'theme'
  | 'navigation'
  | 'global'
  | 'settings'
  | 'ui-string'
  | 'route'
  | 'release'
  | 'review'
  | 'import'
  | 'audit'
  | 'user';

export type FieldGroup = 'content' | 'price' | 'availability' | 'operations' | 'protected';

export type Actor = {
  userId: string;
  role: Role;
  status: 'active' | 'disabled';
  /** Extra rows from permission_grant; NULL resource means "every resource of that type". */
  grants?: Grant[];
};

export type Grant = {
  resourceType: ResourceType;
  resourceId: string | null;
  action: Action;
  fieldGroup?: FieldGroup | null;
};

export type Decision =
  | { allowed: true }
  | { allowed: false; reason: string };

const ALLOW: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

/** Role defaults. F = full, D = draft only, R = read, [] = listed resources, {} = scoped draft. */
const ALL_RESOURCES: ResourceType[] = [
  'product', 'collection', 'taxonomy', 'media', 'page', 'template', 'section', 'theme',
  'navigation', 'global', 'settings', 'ui-string', 'route', 'release', 'review', 'import',
  'audit', 'user',
];

const READ_ONLY_MEDIA: ResourceType[] = ['media'];

type RoleRule = {
  /** resources the role may read */
  read: '*' | ResourceType[];
  write: { resources: ResourceType[]; actions: Action[]; scoped?: boolean };
  fieldGroups: FieldGroup[];
  workflow: Action[];
};

const ROLE_RULES: Record<Role, RoleRule> = {
  owner: {
    read: '*',
    write: { resources: ALL_RESOURCES, actions: ['create', 'edit', 'price', 'availability', 'archive', 'restore'] },
    fieldGroups: ['content', 'price', 'availability', 'operations'],
    workflow: ['request_review', 'approve', 'publish', 'schedule', 'export', 'manage_settings', 'manage_users', 'manage_ownership'],
  },
  admin: {
    read: '*',
    write: { resources: ALL_RESOURCES.filter((r) => r !== 'user'), actions: ['create', 'edit', 'price', 'availability', 'archive', 'restore'] },
    fieldGroups: ['content', 'price', 'availability', 'operations'],
    workflow: ['request_review', 'approve', 'publish', 'schedule', 'manage_settings'],
  },
  'content-editor': {
    read: '*',
    // Draft only: page/editorial surfaces, never catalog prices, theme or templates (PERM-05).
    write: { resources: ['page', 'ui-string', 'navigation', 'global', 'section'], actions: ['create', 'edit', 'restore', 'archive'] },
    fieldGroups: ['content'],
    workflow: ['request_review'],
  },
  'catalog-manager': {
    read: '*',
    // Scope-limited: the caller's grants decide which products/collections (PERM-01).
    write: { resources: ['product', 'collection', 'taxonomy', 'media'], actions: ['create', 'edit', 'price', 'availability', 'archive', 'restore'], scoped: true },
    fieldGroups: ['content', 'price', 'availability'],
    workflow: ['request_review'],
  },
  publisher: {
    read: '*',
    write: { resources: READ_ONLY_MEDIA, actions: [] },
    fieldGroups: [],
    workflow: ['approve', 'publish', 'schedule', 'restore'],
  },
  viewer: {
    read: '*',
    write: { resources: [], actions: [] },
    fieldGroups: [],
    workflow: [],
  },
};

/** Field groups that may never be written from a content payload, whatever the role (API-02). */
export const PROTECTED_FIELDS = [
  'id',
  'entityId',
  'version',
  'visibility',
  'workingRevisionId',
  'publishedRevisionId',
  'role',
  'status',
  'import',
];

export function can(
  actor: Actor,
  action: Action,
  resourceType: ResourceType,
  resourceId: string | null = null,
  fieldGroup: FieldGroup | null = null,
): Decision {
  if (actor.status !== 'active') return deny('Account is disabled.'); // PERM-08
  if (fieldGroup === 'protected') return deny('Field group "protected" is not writable from content.');

  const rule = ROLE_RULES[actor.role];
  if (!rule) return deny(`Unknown role ${actor.role}.`);

  if (actor.role === 'viewer') {
    if (action === 'read') {
      // A Viewer may read content surfaces but not the audit log or staff records (§4.1).
      if (resourceType === 'audit' || resourceType === 'user') return deny('Viewer cannot read this surface.');
      return ALLOW;
    }
    return deny(`Role ${actor.role} may not ${action}.`);
  }

  const allowedByGrant = checkGrants(actor.grants ?? [], action, resourceType, resourceId, fieldGroup);
  if (allowedByGrant) return ALLOW;

  if (action === 'read') {
    if (rule.read === '*') {
      if ((resourceType === 'user' || resourceType === 'audit') && !canWorkflow(rule, 'manage_users') && rule.workflow.includes('manage_settings') === false && actor.role !== 'owner' && actor.role !== 'admin') {
        return deny(`${actor.role} may not read ${resourceType}.`);
      }
      return ALLOW;
    }
    return rule.read.includes(resourceType) ? ALLOW : deny(`${actor.role} may not read ${resourceType}.`);
  }

  if (canWorkflow(rule, action)) {
    // Publisher scope: a publisher holding only page-scoped grants cannot publish a price change
    // (PERM-03). The release layer passes the field group of every entry.
    if (fieldGroup && !rule.fieldGroups.includes(fieldGroup)) {
      return deny(`Publishing requires permission over the "${fieldGroup}" field group.`);
    }
    return ALLOW;
  }

  if (fieldGroup && !rule.fieldGroups.includes(fieldGroup)) {
    return deny(`Field group "${fieldGroup}" is not writable by ${actor.role}.`); // PERM-05
  }

  const w = rule.write;
  if (!w.resources.includes(resourceType) || !w.actions.includes(action)) {
    return deny(`Role ${actor.role} may not ${action} ${resourceType}.`);
  }
  if (w.scoped && resourceId) {
    const scoped = (actor.grants ?? []).some(
      (g) => g.resourceType === resourceType && (g.resourceId === null || g.resourceId === resourceId) && (g.action === action || g.action === 'edit'),
    );
    if (!scoped) return deny(`Not scoped to ${resourceType} ${String(resourceId)}.`);
  }
  return ALLOW;
}

function canWorkflow(rule: RoleRule, action: Action): boolean {
  return rule.workflow.includes(action);
}

function checkGrants(
  grants: Grant[],
  action: Action,
  resourceType: ResourceType,
  resourceId: string | null,
  fieldGroup: FieldGroup | null,
): boolean {
  for (const g of grants) {
    if (g.resourceType !== resourceType) continue;
    if (g.resourceId !== null && g.resourceId !== resourceId) continue;
    const actionOk = g.action === action || (action !== 'read' && g.action === 'edit');
    if (!actionOk) continue;
    // A grant naming a field group widens only that group; it must never open a protected group.
    if (fieldGroup && g.fieldGroup && g.fieldGroup !== fieldGroup) continue;
    return true;
  }
  return false;
}

/** Field groups touched by a product payload change, used for PERM-05 and PERM-03. */
export function productFieldGroupsTouched(before: Record<string, unknown> | null, after: Record<string, unknown>): FieldGroup[] {
  const groups = new Set<FieldGroup>();
  const beforeVars = asVariants(before?.variants);
  const afterVars = asVariants(after.variants);
  groups.add('content');

  const priceFields = ['priceVnd', 'compareAtVnd', 'salePriceVnd', 'saleStart', 'saleEnd'] as const;
  for (const v of afterVars) {
    const old = beforeVars.find((b) => b.id === v.id);
    for (const f of priceFields) {
      if (!old || old[f] !== v[f]) groups.add('price');
    }
    if (!old || old.availability !== v.availability || old.leadHours !== v.leadHours) groups.add('availability');
  }
  if (beforeVars.length !== afterVars.length) groups.add('price');
  return [...groups];
}

function asVariants(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** Strips protected keys before validation so they cannot be mass-assigned (API-02). */
export function stripProtected(payload: Record<string, unknown>): { payload: Record<string, unknown>; attempted: string[] } {
  const out: Record<string, unknown> = {};
  const attempted: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (PROTECTED_FIELDS.includes(k)) {
      attempted.push(k);
      continue;
    }
    out[k] = v;
  }
  return { payload: out, attempted };
}
