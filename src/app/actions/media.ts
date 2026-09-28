'use server';

import { put } from '@vercel/blob';
import { Permission } from '@prisma/client';
import { getCurrentUser, hasPermission } from '@/lib/auth';

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

/** Vercel serves the site's own folder read-only, so photographs live in Blob. */
const FOLDER = 'products';

/**
 * Generous, because the browser has already resized the picture to the size a
 * card uses; anything much larger than this is a sign something went wrong.
 */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Store a photograph and hand back its address.
 *
 * The browser crops and resizes before sending, so what arrives is already the
 * right shape and a few hundred kilobytes. That keeps this side simple and
 * avoids an image library on the server.
 */
export async function uploadPhoto(form: FormData): Promise<UploadResult> {
  const user = await getCurrentUser();
  if (!hasPermission(user, Permission.PRODUCTS_MANAGE)) {
    return { ok: false, message: 'Недостаточно прав' };
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Файл не выбран' };
  }

  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Это не изображение' };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'Файл слишком большой' };
  }

  try {
    const stamp = Date.now().toString(36);
    const blob = await put(`${FOLDER}/${stamp}.jpg`, file, {
      access: 'public',
      contentType: 'image/jpeg',
      // the name already carries a timestamp; a second suffix makes the address
      // unreadable without making it any safer
      addRandomSuffix: true,
    });
    return { ok: true, url: blob.url };
  } catch (error) {
    console.error('не удалось загрузить фото', error);
    return { ok: false, message: 'Не удалось загрузить. Попробуйте ещё раз' };
  }
}
