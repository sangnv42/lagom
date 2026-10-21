// Route table. Everything under /api/admin requires a session; /api/public is the published
// resolver. Patterns use ':name' captures (see server/http.ts compile()).
//
// ORDER MATTERS: compile() returns the first match, so every literal route is registered before the
// generic '/api/admin/:type' routes. Otherwise GET /api/admin/media would be read as a content list
// of type "media" and the media, import, release and settings routes would all be unreachable.

import * as content from './api/content.ts';
import * as media from './api/media.ts';
import * as platform from './api/platform.ts';
import * as publicApi from './api/public.ts';
import type { Route } from './http.ts';

export function routes(): Route[] {
  return [
    // ---- session ----
    { method: 'POST', pattern: '/api/session', handler: platform.loginRoute, public: true },
    { method: 'DELETE', pattern: '/api/session', handler: platform.logoutRoute },
    { method: 'GET', pattern: '/api/session', handler: platform.sessionRoute },

    // ---- overview, search, audit, staff, settings (literal) ----
    { method: 'GET', pattern: '/api/admin/dashboard', handler: platform.dashboardRoute },
    { method: 'GET', pattern: '/api/admin/search', handler: platform.searchRoute },
    { method: 'GET', pattern: '/api/admin/audit', handler: platform.auditRoute },
    { method: 'GET', pattern: '/api/admin/users', handler: platform.listUsersRoute },
    { method: 'POST', pattern: '/api/admin/users', handler: platform.createUserRoute },
    { method: 'PATCH', pattern: '/api/admin/users/:id', handler: platform.updateUserRoute },
    { method: 'GET', pattern: '/api/admin/settings', handler: platform.settingsRoute },

    // ---- releases (literal) ----
    { method: 'POST', pattern: '/api/admin/releases', handler: content.buildReleaseRoute },
    { method: 'GET', pattern: '/api/admin/releases', handler: content.releasesRoute },
    { method: 'POST', pattern: '/api/admin/releases/:id/validate', handler: content.validateReleaseRoute },
    { method: 'POST', pattern: '/api/admin/releases/:id/activate', handler: content.activateReleaseRoute },

    // ---- media (literal prefix; more specific patterns first) ----
    { method: 'GET', pattern: '/api/admin/media/counts', handler: media.mediaCountsRoute },
    { method: 'GET', pattern: '/api/admin/media', handler: media.listMediaRoute },
    { method: 'POST', pattern: '/api/admin/media', handler: media.uploadRoute, raw: true },
    { method: 'PUT', pattern: '/api/admin/media/:id/version', handler: media.replaceMediaRoute, raw: true },
    { method: 'GET', pattern: '/api/admin/media/:id/usages', handler: media.usagesRoute },
    { method: 'GET', pattern: '/api/admin/media/:id', handler: media.mediaDetailRoute },
    { method: 'PATCH', pattern: '/api/admin/media/:id', handler: media.patchMediaRoute },
    { method: 'DELETE', pattern: '/api/admin/media/:id', handler: media.deleteMediaRoute },

    // ---- imports ----
    { method: 'POST', pattern: '/api/admin/imports/validate', handler: media.validateImportRoute, raw: true },
    { method: 'POST', pattern: '/api/admin/imports/apply', handler: media.applyImportRoute },
    { method: 'GET', pattern: '/api/admin/imports/:id/report', handler: media.importReportRoute },
    { method: 'GET', pattern: '/api/admin/imports/:id', handler: media.importStatusRoute },

    // ---- public resolver and stored media bytes ----
    { method: 'GET', pattern: '/api/public/catalog', handler: publicApi.publicCatalogRoute, public: true },
    { method: 'GET', pattern: '/api/public/settings', handler: publicApi.publicSettingsRoute, public: true },
    { method: 'GET', pattern: '/api/public/site', handler: publicApi.publicSiteRoute, public: true },
    { method: 'GET', pattern: '/api/public/release', handler: publicApi.publicReleaseRoute, public: true },
    { method: 'GET', pattern: '/api/media/:id', handler: media.mediaBytesRoute, public: true },

    // ---- generic content CRUD, registered last so literal routes win ----
    { method: 'GET', pattern: '/api/admin/product/:id/price-mismatch', handler: content.priceMismatchRoute },
    { method: 'POST', pattern: '/api/admin/:type/:id/revisions/:revisionId/restore', handler: content.restoreRoute },
    { method: 'GET', pattern: '/api/admin/:type/:id/revisions', handler: content.revisionsRoute },
    { method: 'GET', pattern: '/api/admin/:type/:id/diff', handler: content.diffRoute },
    { method: 'POST', pattern: '/api/admin/:type/:id/duplicate', handler: content.duplicateRoute },
    { method: 'POST', pattern: '/api/admin/:type/:id/archive', handler: content.archiveRoute },
    { method: 'GET', pattern: '/api/admin/:type/:id', handler: content.detailRoute },
    { method: 'PATCH', pattern: '/api/admin/:type/:id', handler: content.saveRoute },
    { method: 'GET', pattern: '/api/admin/:type', handler: content.listRoute },
    { method: 'POST', pattern: '/api/admin/:type', handler: content.createRoute },
  ];
}
