// Inline SVG icon set for the admin (stroke icons, currentColor — no emoji, per the UI style guide).
// One component, name-keyed, so nav items stay data-shaped.

const PATHS: Record<string, JSX.Element> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  page: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  product: <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  collection: <><rect x="3" y="3" width="18" height="7" rx="1.5" /><rect x="3" y="14" width="18" height="7" rx="1.5" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  navigation: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  promo: <><path d="M3 11l14-6v14L3 13z" /><path d="M17 8a4 4 0 0 1 0 8" /><path d="M7 15v4" /></>,
  star: <><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z" /></>,
  faq: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.4 1-1.4 2v.2" /><circle cx="12" cy="17" r="0.5" fill="currentColor" /></>,
  appearance: <><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h3a3 3 0 0 0 3-3c0-6-4-11-9-11z" /><circle cx="8" cy="10" r="0.8" fill="currentColor" /><circle cx="12" cy="7.5" r="0.8" fill="currentColor" /><circle cx="16" cy="10" r="0.8" fill="currentColor" /></>,
  business: <><path d="M4 10v10h16V10" /><path d="M3 6l2-3h14l2 3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z" /><path d="M9 20v-6h6v6" /></>,
  team: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.6 14.4A6.5 6.5 0 0 1 21.5 20" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  release: <><path d="M5 12l5 5L19 8" /><circle cx="12" cy="12" r="9" opacity="0.35" /></>,
  import: <><path d="M12 3v10M8 9l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" /></>,
  flower: <><circle cx="12" cy="12" r="2.2" /><path d="M12 9.8V5m0 14v-4.8M9.8 12H5m14 0h-4.8M9.4 9.4 6 6m12 12-3.4-3.4m0-5.2L18 6M6 18l3.4-3.4" /></>,
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.dashboard}
    </svg>
  );
}
