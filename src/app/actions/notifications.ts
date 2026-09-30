'use server';

import { revalidatePath } from 'next/cache';
import { Permission } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import {
  TELEGRAM_CHAT_KEY,
  TELEGRAM_TOKEN_KEY,
  listTelegramChats,
  sendTelegram,
} from '@/lib/telegram';

export type NotifyResult =
  | { ok: true; message: string }
  | { ok: true; chats: { id: string; title: string }[] }
  | { ok: false; message: string };

async function allowed(): Promise<boolean> {
  return hasPermission(await getCurrentUser(), Permission.SETTINGS_MANAGE);
}

async function write(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/** Saves the bot token and reads back which chats have written to it. */
export async function saveBotToken(token: string): Promise<NotifyResult> {
  if (!(await allowed())) return { ok: false, message: 'Недостаточно прав' };

  const clean = token.trim();
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(clean)) {
    return { ok: false, message: 'Это не похоже на токен бота' };
  }

  const found = await listTelegramChats(clean);
  if (!found.ok) return { ok: false, message: found.message };

  await write(TELEGRAM_TOKEN_KEY, clean);
  revalidatePath('/admin/notifications');

  if (found.chats.length === 0) {
    return {
      ok: false,
      message: 'Токен принят, но боту ещё никто не писал. Напишите ему «привет» и нажмите ещё раз',
    };
  }
  return { ok: true, chats: found.chats };
}

export async function saveChat(chatId: string): Promise<NotifyResult> {
  if (!(await allowed())) return { ok: false, message: 'Недостаточно прав' };

  const clean = chatId.trim();
  if (!/^-?\d+$/.test(clean)) return { ok: false, message: 'Неверный адрес чата' };

  await write(TELEGRAM_CHAT_KEY, clean);
  revalidatePath('/admin/notifications');

  const sent = await sendTelegram(
    'Готово. Сюда будут приходить новые заказы с сайта LEEBOSS.',
  );
  return sent.ok
    ? { ok: true, message: 'Чат сохранён, проверочное сообщение отправлено' }
    : { ok: false, message: sent.message };
}

/** Sends one more message, so the shop can check the link is still alive. */
export async function sendTestMessage(): Promise<NotifyResult> {
  if (!(await allowed())) return { ok: false, message: 'Недостаточно прав' };

  const sent = await sendTelegram('Проверка связи: уведомления о заказах работают.');
  return sent.ok
    ? { ok: true, message: 'Сообщение отправлено' }
    : { ok: false, message: sent.message };
}

/** Turns notifications off without losing the token. */
export async function disconnectBot(): Promise<NotifyResult> {
  if (!(await allowed())) return { ok: false, message: 'Недостаточно прав' };

  await prisma.setting.deleteMany({ where: { key: TELEGRAM_CHAT_KEY } });
  revalidatePath('/admin/notifications');
  return { ok: true, message: 'Уведомления отключены' };
}
