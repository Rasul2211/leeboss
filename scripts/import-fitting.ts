/**
 * Load a processed photo session into the database.
 *
 * Reads public/fitting/<body>/manifest.json, which extract_layers.py writes,
 * matches each layer file to a product by its slug and records it. Re-running
 * is safe: a layer already there is updated rather than duplicated.
 *
 *   npm run fitting:import slim
 *   npm run fitting:import            (every body found)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BodyType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LABELS: Record<BodyType, string> = {
  SLIM: 'Худощавое',
  AVERAGE: 'Среднее',
  HEAVY: 'Плотное',
};

const ORDER: Record<BodyType, number> = { SLIM: 1, AVERAGE: 2, HEAVY: 3 };

type Manifest = {
  bodyType: string;
  width: number;
  height: number;
  layers: { slug: string; file: string; box: number[] | null }[];
};

function isBodyType(value: string): value is BodyType {
  return value in LABELS;
}

async function importBody(folder: string) {
  const dir = join(process.cwd(), 'public', 'fitting', folder);
  const manifestPath = join(dir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    console.log(`${folder}: нет manifest.json, пропускаю`);
    return;
  }

  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const bodyType = manifest.bodyType.toUpperCase();
  if (!isBodyType(bodyType)) {
    console.log(`${folder}: неизвестное телосложение "${manifest.bodyType}"`);
    return;
  }

  const body = await prisma.fittingBody.upsert({
    where: { bodyType },
    update: {
      label: LABELS[bodyType],
      imageUrl: `/fitting/${folder}/base.jpg`,
      width: manifest.width,
      height: manifest.height,
      sortOrder: ORDER[bodyType],
      isActive: true,
    },
    create: {
      bodyType,
      label: LABELS[bodyType],
      imageUrl: `/fitting/${folder}/base.jpg`,
      width: manifest.width,
      height: manifest.height,
      sortOrder: ORDER[bodyType],
    },
  });

  let linked = 0;
  const unmatched: string[] = [];

  for (const layer of manifest.layers) {
    const product = await prisma.product.findUnique({
      where: { slug: layer.slug },
      select: { id: true },
    });

    // a frame whose name matches no product is almost always a typo in the
    // file name, so it is reported rather than silently dropped
    if (!product) {
      unmatched.push(layer.slug);
      continue;
    }

    await prisma.fittingLayer.upsert({
      where: {
        productId_bodyId_colorKey: { productId: product.id, bodyId: body.id, colorKey: '' },
      },
      update: { imageUrl: layer.file },
      create: { productId: product.id, bodyId: body.id, colorKey: '', imageUrl: layer.file },
    });
    linked += 1;
  }

  console.log(`${LABELS[bodyType]}: кадр ${manifest.width}x${manifest.height}, слоёв привязано ${linked}`);
  if (unmatched.length) {
    console.log(`  без товара в каталоге: ${unmatched.join(', ')}`);
  }
}

async function main() {
  const requested = process.argv[2];
  const root = join(process.cwd(), 'public', 'fitting');

  if (!existsSync(root)) {
    console.log('папки public/fitting нет — сначала выполните npm run fitting:extract');
    return;
  }

  const folders = requested
    ? [requested.toLowerCase()]
    : readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

  for (const folder of folders) {
    await importBody(folder);
  }

  const bodies = await prisma.fittingBody.count();
  const layers = await prisma.fittingLayer.count();
  console.log(`\nв базе: телосложений ${bodies}, слоёв ${layers}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
