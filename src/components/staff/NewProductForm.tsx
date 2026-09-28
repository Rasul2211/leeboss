'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { createProduct } from '@/app/actions/catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { PhotoUpload } from '@/components/staff/PhotoUpload';
import { cn } from '@/lib/utils';

export type CategoryOption = { id: string; name: string; parentName: string | null; sizeType: string };

const LETTER_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['39', '40', '41', '42', '43', '44', '45'];

/** Colours the shop actually sells, so the admin picks rather than types a hex. */
const COLOURS: { name: string; hex: string }[] = [
  { name: 'Чёрный', hex: '#1a1a1d' },
  { name: 'Белый', hex: '#f2f1ed' },
  { name: 'Молочный', hex: '#efe9dc' },
  { name: 'Кремовый', hex: '#e8e0cd' },
  { name: 'Бежевый', hex: '#d8cfb8' },
  { name: 'Серый', hex: '#9b9b9e' },
  { name: 'Коричневый', hex: '#6b5a48' },
  { name: 'Хаки', hex: '#6e6a5a' },
  { name: 'Тёмно-синий', hex: '#242c46' },
  { name: 'Синий', hex: '#3c5a80' },
  { name: 'Голубой', hex: '#7b93b8' },
  { name: 'Бордовый', hex: '#6b1f2c' },
  { name: 'Красный', hex: '#b5121f' },
];

export function NewProductForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [price, setPrice] = useState('');
  const [colour, setColour] = useState(COLOURS[0]!);
  const [sizes, setSizes] = useState<string[]>(['M']);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const category = categories.find((c) => c.id === categoryId);
  const sizeList = category?.sizeType === 'EU' ? SHOE_SIZES : category?.sizeType === 'ONE_SIZE' ? ['ONE'] : LETTER_SIZES;

  function toggleSize(size: string) {
    setSizes((current) =>
      current.includes(size) ? current.filter((s) => s !== size) : [...current, size],
    );
    setMessage(null);
  }

  function submit() {
    startTransition(async () => {
      const result = await createProduct({
        name,
        brand,
        categoryId,
        price,
        colorName: colour.name,
        colorHex: colour.hex,
        sizes: category?.sizeType === 'ONE_SIZE' ? ['ONE'] : sizes,
        image: image ?? '',
      });

      if (result.ok) {
        router.push(`/product/${result.slug}`);
      } else {
        setMessage(result.message);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PhotoUpload
        value={image}
        onChange={(url) => {
          setImage(url);
          setMessage(null);
        }}
        hint="Снимите вещь целиком — кадр обрежется под карточку сам"
      />

      <label className="block">
        <span className="text-sm font-medium text-ink">Название</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Тениска тёмно-синяя"
          className="mt-1"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink">Раздел</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parentName ? `${c.parentName} · ${c.name}` : c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-ink">Цена, сомони</span>
          <Input
            value={price}
            onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="270"
            className="mt-1"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">
            Бренд <span className="font-normal text-ink-faint">— если есть</span>
          </span>
          <Input
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            placeholder="Nike"
            className="mt-1"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">
          Цвет: <span className="font-normal text-ink-muted">{colour.name}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOURS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setColour(c)}
              aria-label={c.name}
              title={c.name}
              aria-pressed={c.hex === colour.hex}
              className={cn(
                'size-9 rounded-full ring-1 ring-black/10 transition-transform',
                c.hex === colour.hex && 'ring-2 ring-brand ring-offset-2',
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {category?.sizeType !== 'ONE_SIZE' ? (
        <div>
          <p className="text-sm font-medium text-ink">Размеры в наличии</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizeList.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                aria-pressed={sizes.includes(size)}
                className={cn(
                  'h-10 min-w-12 rounded-lg border px-3 text-sm transition-colors',
                  sizes.includes(size)
                    ? 'border-brand bg-brand text-white'
                    : 'border-line text-ink hover:border-ink/40',
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            Остаток по каждому размеру поставится 3 — поправьте на странице остатков
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Добавить в каталог
        </Button>
        {message ? (
          <p role="alert" className="text-sm text-brand">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
