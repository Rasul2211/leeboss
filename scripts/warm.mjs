/*
  Opens every public page once, so the first buyer after a deploy does not pay
  for building it.

  The shop window is built on first visit and then served from the CDN. Right
  after a deploy nothing has been visited yet; this walks the sitemap and does
  the visiting. Run it once the deploy is live:

      npm run warm                              (the live site)
      npm run warm -- http://localhost:3000     (a local build)

  A few pages at a time on purpose: each first visit is a handful of database
  queries, and the database is small.
*/

const site = (process.argv[2] ?? 'https://leeboss.vercel.app').replace(/\/$/, '');
const CONCURRENCY = 4;

const xml = await (await fetch(`${site}/sitemap.xml`)).text();

// the sitemap is written for the shop's own domain; visit the same paths here
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

if (paths.length === 0) {
  console.error('В карте сайта нет страниц — проверьте адрес:', site);
  process.exit(1);
}

let failed = 0;
let slowest = { path: '', ms: 0 };

async function visit(path) {
  const started = Date.now();
  try {
    const response = await fetch(site + path, { redirect: 'manual' });
    await response.arrayBuffer();
    const ms = Date.now() - started;
    if (ms > slowest.ms) slowest = { path, ms };
    if (response.status >= 400) {
      failed += 1;
      console.log(`${response.status}  ${path}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`ошибка  ${path}  ${error instanceof Error ? error.message : error}`);
  }
}

const queue = [...paths];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) await visit(path);
  }),
);

console.log(
  `Открыто страниц: ${paths.length - failed} из ${paths.length}. ` +
    `Самая долгая: ${slowest.path} — ${slowest.ms} мс.`,
);
process.exit(failed ? 1 : 0);
