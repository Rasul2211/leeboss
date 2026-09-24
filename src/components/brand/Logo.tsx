import { cn } from '@/lib/utils';

/*
  The LEEBOSS mark, rebuilt from measurements taken off the original artwork:

    badge aspect ratio     3.62 : 1
    corner radius          0.20 x badge height
    cap height             0.376 x badge height
    wordmark width         0.86 x badge width
    fill                   #790505   (sampled, deep burgundy - not a bright red)
    lettering              white, heavy extended grotesque

  Archivo Black has a cap height of roughly 0.73em, so the font size that lands
  on a 0.376 cap height is 0.376 / 0.73 = 0.515 of the badge height.
*/
const ASPECT = 3.62;
const RADIUS_RATIO = 0.2;
const FONT_RATIO = 0.515;
const TRACKING_RATIO = 0.012;

type LogoProps = {
  /** Badge height in pixels. Everything else is derived from it. */
  height?: number;
  className?: string;
  /** Renders the mark without the badge, for tight spaces such as a mobile bar. */
  bare?: boolean;
};

export function Logo({ height = 28, className, bare = false }: LogoProps) {
  const style = {
    height,
    width: bare ? undefined : height * ASPECT,
    borderRadius: bare ? undefined : height * RADIUS_RATIO,
    fontSize: height * FONT_RATIO,
    letterSpacing: height * TRACKING_RATIO,
  } as const;

  return (
    <span
      aria-label="LEEBOSS"
      role="img"
      style={style}
      className={cn(
        'inline-flex select-none items-center justify-center font-logo leading-none',
        bare ? 'text-brand' : 'bg-brand text-white',
        className,
      )}
    >
      LEEBOSS
    </span>
  );
}
