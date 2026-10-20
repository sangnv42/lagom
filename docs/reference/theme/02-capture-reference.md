# Capturing the Actual Interface and Theme

This workflow is for an environment that can open the website in a browser. **It was not successfully executed against the website during this audit.** It supplies missing evidence for the token contract rather than replacing it with an invented theme.

## 1. Minimum reference set

Use the same website version, a logged-out session, and 100% browser zoom. Record viewport and devicePixelRatio. Wait for fonts and images. Capture desktop at 1440×1000 and mobile at 390×844 for:

1. Homepage: full page, top, middle, and footer.
2. Collection: default, open filters, filtered, empty, changed sort, and load-more.
3. PDP: top, each variant, delivery controls, gallery/zoom if present.
4. Mobile menu, empty/populated cart, and ordering steps before submission.
5. Both policy pages and the actual 404 page if present.

Identify each image as full-page or viewport-only. Do not use a resized full-page screenshot to measure absolute pixel dimensions.

## 2. Export computed styles from DevTools

Open DevTools → Console on the public page to inspect. Review and run the script below. It reads DOM/styles and downloads a JSON file locally. It does not submit forms, call order APIs, or read cookies, localStorage, or input values.

This is a DOM sampler. It can miss canvas content, shadow DOM, iframes, unopened interaction states, and CORS-protected stylesheets. Open each state manually and rerun it. Output selectors are generated rather than assuming source class names.

```javascript
(async () => {
  await document.fonts.ready;
  const properties = [
    'display','position','top','right','bottom','left','z-index',
    'color','background-color','background-image','opacity',
    'font-family','font-size','font-weight','font-style','line-height',
    'letter-spacing','text-transform','text-align','text-decoration',
    'width','height','min-width','max-width','min-height','max-height',
    'padding-top','padding-right','padding-bottom','padding-left',
    'margin-top','margin-right','margin-bottom','margin-left',
    'gap','row-gap','column-gap','grid-template-columns','grid-template-rows',
    'flex-direction','flex-wrap','align-items','justify-content',
    'border-top-width','border-top-style','border-top-color',
    'border-right-width','border-right-style','border-right-color',
    'border-bottom-width','border-bottom-style','border-bottom-color',
    'border-left-width','border-left-style','border-left-color',
    'border-top-left-radius','border-top-right-radius',
    'border-bottom-left-radius','border-bottom-right-radius',
    'box-shadow','outline','overflow','aspect-ratio','object-fit',
    'object-position','transform','transition','animation'
  ];
  function path(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    while (el && el.nodeType === 1) {
      const tag = el.localName;
      const siblings = el.parentElement
        ? [...el.parentElement.children].filter(x => x.localName === tag) : [el];
      parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(el) + 1})`);
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function styles(el, pseudo = null) {
    const c = getComputedStyle(el, pseudo);
    return Object.fromEntries(properties.map(p => [p, c.getPropertyValue(p)]));
  }
  const all = [...document.querySelectorAll('body, body *')];
  const visible = all.filter(el => {
    if (['SCRIPT','STYLE','LINK','META','NOSCRIPT'].includes(el.tagName)) return false;
    const r = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && c.display !== 'none'
      && c.visibility !== 'hidden';
  });
  const sheets = [];
  const variableNames = new Set();
  const media = new Set();
  function walk(rules) {
    for (const rule of rules) {
      if (rule.media?.mediaText) media.add(rule.media.mediaText);
      if (rule.style) for (const name of rule.style) {
        if (name.startsWith('--')) variableNames.add(name);
      }
      if (rule.cssRules) walk(rule.cssRules);
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules);
      sheets.push({ href: sheet.href, readable: true });
    } catch {
      sheets.push({ href: sheet.href, readable: false });
    }
  }
  for (const name of getComputedStyle(document.documentElement)) {
    if (name.startsWith('--')) variableNames.add(name);
  }
  const variableValues = el => Object.fromEntries([...variableNames].map(name =>
    [name, getComputedStyle(el).getPropertyValue(name).trim()]));
  const nodes = visible.slice(0, 3000).map(el => {
    const r = el.getBoundingClientRect();
    return {
      selector: path(el), tag: el.localName, role: el.getAttribute('role'),
      rect: { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height },
      styles: styles(el), before: styles(el, '::before'), after: styles(el, '::after'),
      variables: variableValues(el),
      image: el instanceof HTMLImageElement ? {
        src: el.currentSrc, srcset: el.getAttribute('srcset'),
        naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight,
        loading: el.loading
      } : null
    };
  });
  const data = {
    url: location.href, capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    scroll: { x: scrollX, y: scrollY },
    rootVariables: variableValues(document.documentElement),
    fontFaces: [...document.fonts].map(f => ({
      family: f.family, weight: f.weight, style: f.style, status: f.status
    })),
    stylesheets: sheets, mediaQueries: [...media],
    links: [...document.querySelectorAll('a[href]')].map(a => ({
      raw: a.getAttribute('href'), resolved: a.href
    })),
    baseURI: document.baseURI,
    visibleNodeCount: visible.length, truncated: visible.length > 3000, nodes
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `archflowers-${innerWidth}-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
```

`getComputedStyle` provides resolved values, which may differ from original declarations. Inspect Network/Sources and available stylesheets to identify font files, media/container queries, and original `clamp()` expressions. A transparent element can inherit its visible background from an ancestor; do not treat `transparent` as the final background color.

## 3. Collect every route

1. Open the homepage, navigation, footer, and all known collections.
2. In each collection, use load-more until no further products appear. Count unique SKUs and record differences between displayed totals and collected items.
3. Export all `a[href]` entries, retaining raw href, resolved URL, and `document.baseURI`.
4. Deduplicate by origin/path/relevant query. Treat fragments as states or anchors rather than separate pages.
5. Visit each collected product URL and record title, canonical URL, SKU, variants, and images. Every URL needs its own status.
6. Follow newly discovered internal links until no new URLs remain, or document the access limit that prevents completion.
7. For pagination/filtering, inspect the combinations needed to establish behavior; avoid unbounded combinations of query parameters.

A representative template does not count as verifying every URL. Representative screenshots are appropriate, but the inventory must distinguish which product URLs were actually opened.

## 4. Playwright capture example

This sample runs on a machine with a browser and appropriate network access. It navigates pages without submitting orders. Save it as `capture.mjs`, install Playwright following its official documentation, then run it with Node. If access is blocked, record the error and stop rather than switching proxies to evade the restriction.

```javascript
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const paths = [
  '/', '/collections/all/', '/collections/qua-20-10/',
  '/collections/hoa-khai-truong/', '/collections/hoa-sinh-nhat/',
  '/collections/bo-suu-tap-moi/', '/collections/hoa-bo/',
  '/collections/hoa-gio/', '/collections/hoa-hop/', '/collections/hoa-cuoi/',
  '/products/bo-hoa-mini-xinh/', '/products/bo-hoa-cuc-tana-20-10-a037/',
  '/pages/chinh-sach-doi-tra/', '/pages/chinh-sach-bao-mat/'
];
await mkdir('reference-capture', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
await context.route('**/*', route => {
  const method = route.request().method();
  return ['GET', 'HEAD', 'OPTIONS'].includes(method) ? route.continue() : route.abort();
});
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    for (const [index, path] of paths.entries()) {
      try {
        const response = await page.goto('https://archflowers.com' + path, {
          waitUntil: 'domcontentloaded', timeout: 30000
        });
        const status = response?.status() ?? null;
        if (status && status >= 400) {
          results.push({ path, viewport, status, finalUrl: page.url(), error: 'HTTP error' });
          continue;
        }
        await page.evaluate(async () => {
          await Promise.race([document.fonts.ready,
            new Promise(resolve => setTimeout(resolve, 10000))]);
          for (let step = 0, y = 0; step < 50 && y < document.documentElement.scrollHeight;
            step++, y += innerHeight) {
            scrollTo(0, y);
            await new Promise(resolve => setTimeout(resolve, 120));
          }
          scrollTo(0, 0);
          await Promise.race([
            Promise.all([...document.images].map(img => img.decode().catch(() => {}))),
            new Promise(resolve => setTimeout(resolve, 10000))
          ]);
        });
        const name = `${viewport.width}-${String(index).padStart(2, '0')}`;
        const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(a => a.href));
        await page.screenshot({ path: `reference-capture/${name}.png`, fullPage: true });
        results.push({ path, finalUrl: page.url(), status, viewport, links, screenshot: `${name}.png` });
      } catch (error) {
        results.push({ path, viewport, error: String(error) });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile('reference-capture/routes.json', JSON.stringify(results, null, 2));
}
```

This script captures the seed routes only. It does not crawl all 292 products, open overlays, or verify interactions. Blocking POST requests may prevent some content from loading; document that limitation instead of concluding the content does not exist. Check slow-loading images before using a screenshot as a reference.

## 5. Convert captures into a theme

Group recurring colors, fonts, and spacing by semantic role, while preserving component-specific exceptions. Every token must reference at least one measurement. Populate the theme contract, generate CSS variables, and compare screenshots at matching viewports. Do not derive interface colors from flower photography.
