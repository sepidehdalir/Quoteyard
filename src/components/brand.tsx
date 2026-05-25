import Image from 'next/image';

/**
 * The QuoteYard mark — chat bubble with quote ticks inside.
 * Source of truth: /public/brand/mark/mark-dark.svg
 *
 * Use `BrandMark` for icon-sized placements (header logo slot,
 * favicon-adjacent uses). Pair it with a text "QuoteYard"
 * wordmark next to it for full lockup behaviour.
 *
 * `BrandLockup` returns the full designer-built lockup (mark +
 * wordmark + tagline) — use it for the website hero, README,
 * and OG share images. It's deliberately larger and shouldn't
 * sit in a 28px header slot.
 */
interface BrandMarkProps {
  /** Square pixel size; defaults to 28 for header slots. */
  size?: number;
  /** Dark mark for light backgrounds (default) or white mark for dark. */
  variant?: 'dark' | 'light';
  className?: string;
}

export function BrandMark({
  size = 28,
  variant = 'dark',
  className,
}: BrandMarkProps) {
  const src =
    variant === 'light'
      ? '/brand/mark/mark-light.svg'
      : '/brand/mark/mark-dark.svg';
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}

interface BrandLockupProps {
  /** Pixel height; the lockup scales width proportionally. */
  height?: number;
  variant?: 'light-bg' | 'dark-bg';
  className?: string;
}

export function BrandLockup({
  height = 64,
  variant = 'light-bg',
  className,
}: BrandLockupProps) {
  const src =
    variant === 'dark-bg'
      ? '/brand/lockup/lockup-dark.svg'
      : '/brand/lockup/lockup-light.svg';
  // Lockup SVG viewBox is 1600x700, so the aspect ratio is 1600/700.
  const width = Math.round((height * 1600) / 700);
  return (
    <Image
      src={src}
      alt="QuoteYard — Lead & Quote Management"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
