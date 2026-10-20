import { useEffect } from 'react';
import { SITE_URL } from '../data/business';

// Runtime head manager (SPA SEO layer): title, description, canonical, OG tags, optional JSON-LD.
// Product/collection pages pass `path`; canonical = SITE_URL + path (docs: canonicals use the
// reconstruction's deployment domain; og images stay on the captured asset origin).
export function Seo({
  title,
  description,
  path = '/',
  image,
  jsonLd,
  noindex = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  jsonLd?: unknown[];
  noindex?: boolean;
}) {
  useEffect(() => {
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', SITE_URL + path);
    if (image) setMeta('property', 'og:image', image);
    setMeta('name', 'robots', noindex ? 'noindex' : 'all');
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = SITE_URL + path;
  }, [title, description, path, image, noindex]);

  useEffect(() => {
    if (!jsonLd?.length) return;
    const nodes = jsonLd.map((obj) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });
    return () => nodes.forEach((n) => n.remove());
  }, [jsonLd]);

  return null;
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let m = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute(attr, key);
    document.head.appendChild(m);
  }
  m.content = value;
}
