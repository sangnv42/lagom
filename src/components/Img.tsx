import { useState } from 'react';
import { PLACEHOLDER_IMG, optUrl, originalUrl, srcsetFor } from '../lib/img';

// Mirrors the reference img() helper + imgErr fallback: webp rendition with srcset, JPEG original in
// data-o; on load error swap to the original, and if that fails too show the inline placeholder.
export function Img({
  src,
  alt,
  cls = '',
  eager = false,
  sizes,
  width = 800,
  height = 1000,
  fetchPriority,
}: {
  src: string | null;
  alt: string;
  cls?: string;
  eager?: boolean;
  sizes: string;
  width?: number;
  height?: number;
  fetchPriority?: 'high';
}) {
  const [stage, setStage] = useState(0); // 0 webp, 1 original jpg, 2 placeholder
  const ss = srcsetFor(src);
  const liveSrc =
    stage === 0
      ? ss
        ? optUrl(src, 800)
        : src
          ? originalUrl(src)
          : PLACEHOLDER_IMG
      : stage === 1 && src
        ? originalUrl(src)
        : PLACEHOLDER_IMG;
  const wantEager = eager || fetchPriority === 'high';
  return (
    <img
      src={liveSrc}
      {...(ss && stage === 0 ? { srcSet: ss, sizes } : {})}
      {...(stage === 0 && src && /\.(jpe?g|png)$/i.test(src) ? { 'data-o': originalUrl(src) } : {})}
      alt={alt}
      width={width}
      height={height}
      {...(wantEager ? { fetchPriority: 'high' as const } : { loading: 'lazy' })}
      decoding="async"
      className={cls}
      onError={() => setStage((s) => s + 1)}
    />
  );
}
