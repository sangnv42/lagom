// Small shared admin UI pieces. Kept separate so screens stay short and consistent.

import type { ReactNode } from 'react';
import type { ApiFieldError } from './api';

export function fmtVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || value <= 0) return 'Liên hệ';
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('vi-VN', { hour12: false });
}

export type BadgeTone = 'draft' | 'published' | 'error' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`ad-badge ad-badge--${tone}`}>{children}</span>;
}

export function visibilityTone(visibility: string): BadgeTone {
  if (visibility === 'published') return 'published';
  if (visibility === 'archived') return 'error';
  return 'draft';
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="ad-field">
      <span>{label}</span>
      {children}
      {hint && !error ? <div className="ad-field-err" style={{ color: 'var(--ad-text-muted)' }}>{hint}</div> : null}
      {error ? <div className="ad-field-err">{error}</div> : null}
    </label>
  );
}

/** Field errors coming from the API, matched to the field they affect. */
export function errorsFor(fields: ApiFieldError[], prefix: string): string | undefined {
  const hit = fields.find((f) => f.path === prefix || f.path.startsWith(`${prefix}.`) || f.path.startsWith(`${prefix}[`));
  return hit?.message;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="ad-empty">{children}</div>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ad-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/**
 * Notes the server sends about what is deliberately absent (§2.2). Shown verbatim rather than
 * paraphrased, so the UI cannot overstate what this build does.
 */
export function NotConfiguredNote({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="ad-note ad-note--warn">
      <strong>Not configured in this build</strong>
      <ul className="ad-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
