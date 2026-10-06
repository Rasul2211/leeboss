import Image from 'next/image';
import Link from 'next/link';
import type { Stack } from '@/lib/home';
import { plural } from '@/lib/utils';

/** How the cards under the top one sit: turned a little either way. */
const UNDER = ['-rotate-6 -translate-x-2', 'rotate-6 translate-x-2'];

/**
 * Four piles of photographs, one per kind of thing. The newest piece is on
 * top; the two before it peek out underneath and fan out when pointed at.
 */
export function Stacks({ stacks }: { stacks: Stack[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-8">
      {stacks.map((stack) => (
        <li key={stack.href}>
          <Link href={stack.href} className="group block">
            <div className="relative mx-auto aspect-3/4 w-[86%]">
              {stack.images
                .slice(1)
                .reverse()
                .map((src, index) => (
                  <div
                    key={src}
                    className={`absolute inset-0 overflow-hidden rounded-card bg-surface-alt shadow-sm transition-transform duration-500 ${UNDER[index] ?? ''} group-hover:scale-[1.02]`}
                  >
                    <Image src={src} alt="" fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
                  </div>
                ))}
              {stack.images[0] ? (
                <div className="absolute inset-0 overflow-hidden rounded-card bg-surface-alt shadow-md transition-transform duration-500 group-hover:-translate-y-1">
                  <Image
                    src={stack.images[0]}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1024px) 20vw, 40vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>

            <p className="mt-5 text-center text-sm font-medium text-ink group-hover:text-brand">
              {stack.title}
            </p>
            <p className="price-figures text-center text-xs text-ink-faint">
              {stack.count} {plural(stack.count, ['вещь', 'вещи', 'вещей'])}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
