'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadPhoto } from '@/app/actions/media';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** 3/4 for a product card, 1 for an outfit, which is shot square. */
  aspect?: number;
  label?: string;
  hint?: string;
};

/** What the catalogue stores; anything larger is wasted on a card this size. */
const WIDTH = 900;

/**
 * Pick a photograph, see it, and have it stored.
 *
 * The crop and the resize happen here rather than on the server. The shop
 * uploads straight from a phone, where a photograph is four or five megabytes,
 * and sending that to be resized would be slow on a Dushanbe connection and
 * would need an image library on a server that has none. A canvas does it in
 * the browser in a moment, and what leaves the phone is a few hundred kilobytes
 * already the right shape.
 */
export function PhotoUpload({ value, onChange, aspect = 3 / 4, label = 'Фотография', hint }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function prepare(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const height = Math.round(WIDTH / aspect);

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas недоступен');

    // fill the frame and crop what does not fit, centred - the same thing the
    // card itself does, decided once here so the stored file already matches
    const scale = Math.max(WIDTH / bitmap.width, height / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.drawImage(bitmap, (WIDTH - w) / 2, (height - h) / 2, w, h);
    bitmap.close();

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('не удалось подготовить файл'))),
        'image/jpeg',
        0.88,
      );
    });
  }

  function onPick(file: File | undefined) {
    if (!file) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const prepared = await prepare(file);
        const form = new FormData();
        form.append('file', new File([prepared], 'photo.jpg', { type: 'image/jpeg' }));

        const result = await uploadPhoto(form);
        if (result.ok) {
          onChange(result.url);
        } else {
          setMessage(result.message);
        }
      } catch {
        setMessage('Не удалось прочитать файл. Попробуйте другой');
      }
    });
  }

  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}

      <div className="mt-2 flex items-start gap-4">
        <div
          className="relative shrink-0 overflow-hidden rounded-lg border border-line bg-surface-alt"
          style={{ width: 96, height: Math.round(96 / aspect) }}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-ink-faint">
              <ImagePlus className="size-5" aria-hidden />
            </div>
          )}

          {pending ? (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <Loader2 className="size-5 animate-spin text-ink-muted" aria-hidden />
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              // let the same file be picked again after a failure
              event.target.value = '';
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => input.current?.click()}
            >
              {value ? 'Заменить' : 'Выбрать файл'}
            </Button>

            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setMessage(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
              >
                <X className="size-3.5" aria-hidden />
                Убрать
              </button>
            ) : null}
          </div>

          <p className={cn('mt-2 text-xs', message ? 'text-brand' : 'text-ink-faint')}>
            {message ?? 'Подойдёт снимок с телефона — обрежется сам'}
          </p>
        </div>
      </div>
    </div>
  );
}
