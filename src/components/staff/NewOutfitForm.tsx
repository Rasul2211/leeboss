'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { createOutfit } from '@/app/actions/catalog';
import { formatPrice } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { PhotoUpload } from '@/components/staff/PhotoUpload';

type Piece = { title: string; price: string };

const EMPTY: Piece = { title: '', price: '' };

export function NewOutfitForm() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pieces, setPieces] = useState<Piece[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // shown live, because the price of an outfit is the thing the shop checks
  const total = pieces.reduce((sum, piece) => sum + (Number(piece.price) || 0), 0);

  function update(index: number, patch: Partial<Piece>) {
    setPieces((current) => current.map((piece, i) => (i === index ? { ...piece, ...patch } : piece)));
    setMessage(null);
  }

  function submit() {
    startTransition(async () => {
      const result = await createOutfit({
        name,
        image: image ?? '',
        pieces: pieces
          .filter((piece) => piece.title.trim() || piece.price)
          .map((piece) => ({ title: piece.title, price: piece.price })),
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
        aspect={1}
        label="Фотография образа"
        hint="Снимок раскладки целиком — так, как выкладываете в инстаграм"
      />

      <label className="block">
        <span className="text-sm font-medium text-ink">Название образа</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Тёмно-синяя тениска"
          className="mt-1"
        />
      </label>

      <div>
        <p className="text-sm font-medium text-ink">Что входит и почём</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          Так же, как пишете в подписи: вещь и её цена отдельно
        </p>

        <ul className="mt-3 space-y-2">
          {pieces.map((piece, index) => (
            <li key={index} className="flex gap-2">
              <Input
                value={piece.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Тениска тёмно-синяя"
                aria-label={`Вещь ${index + 1}`}
                className="flex-1"
              />
              <Input
                value={piece.price}
                onChange={(event) => update(index, { price: event.target.value.replace(/[^\d]/g, '') })}
                inputMode="numeric"
                placeholder="200"
                aria-label={`Цена вещи ${index + 1}`}
                className="w-28"
              />
              <button
                type="button"
                onClick={() => {
                  setPieces((current) => current.filter((_, i) => i !== index));
                  setMessage(null);
                }}
                disabled={pieces.length <= 2}
                aria-label="Убрать вещь"
                className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:text-brand disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setPieces((current) => [...current, { ...EMPTY }])}
            disabled={pieces.length >= 6}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            Ещё вещь
          </button>

          <p className="text-sm text-ink-muted">
            Всего: <span className="price-figures font-semibold text-brand">{formatPrice(total)}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
          Добавить образ
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
