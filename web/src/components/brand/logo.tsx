import Image from 'next/image';
import { cn } from '@/lib/cn';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Render the mark on a soft tinted tile instead of bare. */
  tile?: boolean;
  priority?: boolean;
}

/**
 * The Quranki rehal mark. The source art is a transparent PNG trimmed to the glyph,
 * so it sits cleanly on any background without the white square showing through.
 */
export function LogoMark({ size = 32, className, tile = false, priority = false }: LogoMarkProps) {
  const glyph = Math.round(tile ? size * 0.72 : size);
  const img = (
    <Image
      src="/images/logo-mark.png"
      alt=""
      aria-hidden
      width={glyph}
      height={glyph}
      priority={priority}
      className="object-contain select-none pointer-events-none"
      style={{ width: glyph, height: glyph }}
    />
  );
  if (!tile) return <span className={cn('inline-flex shrink-0', className)}>{img}</span>;
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-[30%] bg-primary/10 ring-1 ring-inset ring-primary/20',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {img}
    </span>
  );
}

export function Wordmark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} tile priority />
      <span className="font-display text-[1.35rem] leading-none tracking-tight text-text">Quranki</span>
    </span>
  );
}
