// SVG icons captured verbatim from docs/reference/captures/app.js ICON map.
type IconProps = { className?: string; 'aria-hidden'?: boolean };
const wrap = (path: JSX.Element, cls?: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden className={cls}>
    {path}
  </svg>
);
export const IconPhone = (p: IconProps) =>
  wrap(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />, p.className);
export const IconBag = (p: IconProps) =>
  wrap(
    <>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>,
    p.className
  );
export const IconMenu = (p: IconProps) => wrap(<path d="M3 7h18M3 12h18M3 17h12" />, p.className);
export const IconClose = (p: IconProps) => wrap(<path d="M5 5l14 14M19 5L5 19" />, p.className);
// promise icons (stroke-width 1.3, from home capture)
export const IconPen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);
export const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const IconCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
    <rect x="2" y="5" width="20" height="14" rx="1" />
    <path d="M2 10h20M6 15h4" />
  </svg>
);
export const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3}>
    <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z" />
  </svg>
);
export const IconZalo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z" />
    <path d="M8.5 10.5h7M8.5 13.5h4.5" />
  </svg>
);
