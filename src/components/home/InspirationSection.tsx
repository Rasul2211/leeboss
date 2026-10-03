import Image from 'next/image';
import { Marquee } from '@/components/home/Marquee';

/**
 * Two rows of photographs drifting in opposite directions.
 *
 * The files are public/inspiration/01.jpg and up, all 600x800. To change the
 * strip, replace the files and set COUNT to how many there are; where the
 * present ones came from is written down in _assets/inspiration-sources.json.
 */
const COUNT = 72;

const PHOTOS = Array.from({ length: COUNT }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return `/inspiration/${number}.jpg`;
});

/** Seconds a single photograph takes to cross its own width. */
const PACE = 6;

function Row({ photos, reverse }: { photos: string[]; reverse?: boolean }) {
  return (
    <Marquee seconds={photos.length * PACE} reverse={reverse}>
      {photos.map((src) => (
        <div
          key={src}
          className="relative mr-2.5 aspect-3/4 w-36 shrink-0 overflow-hidden rounded-card bg-surface-alt sm:mr-3 sm:w-52 lg:w-60"
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 208px, 144px"
            className="object-cover"
          />
        </div>
      ))}
    </Marquee>
  );
}

export function InspirationSection() {
  const half = Math.ceil(PHOTOS.length / 2);

  return (
    <section className="pb-2 pt-14 sm:pt-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Вдохновение</h2>
      </div>

      <div className="mt-8 space-y-2.5 sm:space-y-3">
        <Row photos={PHOTOS.slice(0, half)} />
        <Row photos={PHOTOS.slice(half)} reverse />
      </div>
    </section>
  );
}
