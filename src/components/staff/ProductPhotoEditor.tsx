'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProductPhoto } from '@/app/actions/catalog';
import { PhotoUpload } from '@/components/staff/PhotoUpload';

/**
 * Replaces the photograph on a product that already exists.
 *
 * It saves as soon as a picture is chosen rather than waiting for a button:
 * there is one field here, and a save button next to a single field is a step
 * that only exists to be forgotten.
 */
export function ProductPhotoEditor({
  productId,
  current,
  isOutfit,
}: {
  productId: string;
  current: string | null;
  isOutfit: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(current);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(next: string | null) {
    if (!next) return; // a product without a photograph is worse than the old one
    setUrl(next);
    setMessage(null);

    startTransition(async () => {
      const result = await setProductPhoto(productId, next);
      if (result.ok) {
        setMessage('Фотография заменена');
        router.refresh();
      } else {
        setMessage(result.message);
        setUrl(current);
      }
    });
  }

  return (
    <div className="rounded-card border border-line p-5">
      <PhotoUpload
        value={url}
        onChange={onChange}
        aspect={isOutfit ? 1 : 3 / 4}
        label="Фотография товара"
        hint={
          isOutfit
            ? 'Снимок раскладки целиком'
            : 'Новый снимок заменит текущий сразу, как загрузится'
        }
      />

      {message ? (
        <p role="status" className="mt-3 text-xs text-ink-muted">
          {pending ? 'Сохраняю…' : message}
        </p>
      ) : null}
    </div>
  );
}
