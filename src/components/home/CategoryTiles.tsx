import Image from 'next/image';
import Link from 'next/link';

/**
 * Only sections that actually hold products get a tile. OUTERWEAR and ACCESSORY
 * are still empty, so showing them here would send the buyer to a dead page.
 */
const TILES = [
  { slug: 'verh', name: 'Футболки и тениски', image: '/products/teniska-korichnevaya.jpg' },
  { slug: 'niz', name: 'Брюки и джинсы', image: '/products/dzhinsy-golubye-baggy.jpg' },
  { slug: 'obuv', name: 'Кроссовки и кеды', image: '/products/nike-cortez.jpg' },
  { slug: 'golovnye-ubory', name: 'Кепки и шапки', image: '/products/kepki-klassicheskie.jpg' },
];

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Категории</h2>

      <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILES.map((tile) => (
          <li key={tile.slug}>
            <Link
              href={`/catalog/${tile.slug}`}
              className="group block overflow-hidden rounded-card bg-surface-alt"
            >
              <div className="relative aspect-4/5">
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-10">
                  <span className="text-sm font-semibold text-white">{tile.name}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
