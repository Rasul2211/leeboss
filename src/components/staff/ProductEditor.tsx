'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { updatePricing, updateProduct, updateStock } from '@/app/actions/staff';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/money';
import { cn } from '@/lib/utils';

type Variant = { id: string; size: string; stock: number; colorName: string };

type Props = {
  product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    material: string | null;
    care: string | null;
    sizeNote: string | null;
    isActive: boolean;
    price: number;
    salePrice: number | null;
  };
  variants: Variant[];
  can: { content: boolean; pricing: boolean; stock: boolean };
};

export function ProductEditor({ product, variants, can }: Props) {
  const router = useRouter();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {can.content ? <ContentCard product={product} onSaved={() => router.refresh()} /> : null}
      {can.pricing ? <PricingCard product={product} onSaved={() => router.refresh()} /> : null}
      {can.stock ? <StockCard variants={variants} onSaved={() => router.refresh()} /> : null}

      {!can.content && !can.pricing && !can.stock ? (
        <p className="text-sm text-ink-muted">
          У вас нет прав на редактирование этого товара — только просмотр.
        </p>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Saved({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
      <Check className="size-3.5" aria-hidden />
      Сохранено
    </span>
  );
}

function ContentCard({ product, onSaved }: { product: Props['product']; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? '',
    material: product.material ?? '',
    care: product.care ?? '',
    sizeNote: product.sizeNote ?? '',
    isActive: product.isActive,
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const result = await updateProduct({ productId: product.id, ...form });
      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
        onSaved();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Card title="Карточка товара">
      <Field id="name" label="Название">
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>

      <Field id="description" label="Описание">
        <Textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      {/* these two are empty on purpose in the seed: the source photos never
          stated them, so they are for the shop to fill in, not for us to invent */}
      <Field id="material" label="Состав" hint="Не заполнено — данных на фото не было">
        <Input
          id="material"
          value={form.material}
          placeholder="Например, хлопок 100%"
          onChange={(e) => setForm({ ...form, material: e.target.value })}
        />
      </Field>

      <Field id="care" label="Уход">
        <Input
          id="care"
          value={form.care}
          placeholder="Например, стирка при 30°"
          onChange={(e) => setForm({ ...form, care: e.target.value })}
        />
      </Field>

      <Field id="sizeNote" label="Примечание к размеру">
        <Input
          id="sizeNote"
          value={form.sizeNote}
          placeholder="Например, чуть маломерят"
          onChange={(e) => setForm({ ...form, sizeNote: e.target.value })}
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="size-4 accent-[var(--color-brand)]"
        />
        Показывать в каталоге
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Сохранить
        </Button>
        <Saved shown={done} />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-brand">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function PricingCard({ product, onSaved }: { product: Props['product']; onSaved: () => void }) {
  const [price, setPrice] = useState(String(product.price));
  const [sale, setSale] = useState(product.salePrice ? String(product.salePrice) : '');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const result = await updatePricing({
        productId: product.id,
        price: Number(price),
        salePrice: sale.trim() === '' ? null : Number(sale),
      });
      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
        onSaved();
      } else {
        setError(result.message);
      }
    });
  }

  const preview = sale.trim() === '' ? Number(price) : Number(sale);

  return (
    <Card title="Цена">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="price" label="Цена, сомони">
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field id="salePrice" label="Со скидкой" hint="Пусто — скидки нет">
          <Input
            id="salePrice"
            type="number"
            inputMode="numeric"
            min={1}
            value={sale}
            onChange={(e) => setSale(e.target.value)}
          />
        </Field>
      </div>

      <p className="text-xs text-ink-muted">
        На карточке покупатель увидит{' '}
        <span className="price-figures font-medium text-ink">
          {Number.isFinite(preview) && preview > 0 ? formatPrice(preview) : '—'}
        </span>
        . Скидка включит блок «Специальные предложения» на главной.
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Сохранить цену
        </Button>
        <Saved shown={done} />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-brand">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function StockCard({ variants, onSaved }: { variants: Variant[]; onSaved: () => void }) {
  return (
    <Card title="Остатки по цвету и размеру">
      <ul className="divide-y divide-line">
        {variants.map((variant) => (
          <StockRow key={variant.id} variant={variant} onSaved={onSaved} />
        ))}
      </ul>
    </Card>
  );
}

function StockRow({ variant, onSaved }: { variant: Variant; onSaved: () => void }) {
  const [value, setValue] = useState(String(variant.stock));
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const dirty = Number(value) !== variant.stock;

  function save() {
    start(async () => {
      const result = await updateStock(variant.id, Number(value));
      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 1500);
        onSaved();
      }
    });
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1 text-sm text-ink">
        {variant.colorName}
        {variant.size !== 'ONE' ? <span className="text-ink-muted"> · {variant.size}</span> : null}
      </span>

      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={`Остаток ${variant.colorName} ${variant.size}`}
        className={cn(
          'price-figures h-9 w-20 rounded-lg border bg-white px-2 text-center text-sm focus:outline-none',
          dirty ? 'border-brand' : 'border-line',
        )}
      />

      <Button size="sm" variant="outline" onClick={save} disabled={pending || !dirty}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {done ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : null}
        {done ? '' : 'ОК'}
      </Button>
    </li>
  );
}
