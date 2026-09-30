import { prisma } from '@/lib/prisma';

/**
 * Telling the shop that an order has arrived.
 *
 * Both the bot token and the chat live in the database rather than in the
 * environment, because the person who connects the bot is the shop owner on a
 * phone: they can open the admin panel, but not the hosting settings, and a
 * change there would need a redeploy.
 */
export const TELEGRAM_TOKEN_KEY = 'telegram.botToken';
export const TELEGRAM_CHAT_KEY = 'telegram.chatId';

export type TelegramSettings = { token: string | null; chatId: string | null };

export async function getTelegramSettings(): Promise<TelegramSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [TELEGRAM_TOKEN_KEY, TELEGRAM_CHAT_KEY] } },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((row) => [row.key, row.value.trim()]));
  return {
    token: map.get(TELEGRAM_TOKEN_KEY) || null,
    chatId: map.get(TELEGRAM_CHAT_KEY) || null,
  };
}

type SendResult = { ok: true } | { ok: false; message: string };

/** Posts one message. Never throws: a notification must not fail an order. */
export async function sendTelegram(text: string): Promise<SendResult> {
  const { token, chatId } = await getTelegramSettings();
  if (!token || !chatId) return { ok: false, message: 'Бот не подключён' };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      // an order must not wait on Telegram being slow
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { description?: string } | null;
      return { ok: false, message: body?.description ?? `Telegram ответил ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'неизвестная ошибка';
    return { ok: false, message: `Не удалось отправить: ${message}` };
  }
}

/**
 * Asks Telegram which chats have written to the bot.
 *
 * This is how the shop finds its own chat id without looking anything up: they
 * write to the bot once, press a button here, and pick their chat from the list.
 */
export async function listTelegramChats(
  token: string,
): Promise<{ ok: true; chats: { id: string; title: string }[] } | { ok: false; message: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: { message?: { chat?: { id: number; title?: string; username?: string; first_name?: string } } }[];
    };

    if (!body.ok) return { ok: false, message: body.description ?? 'Telegram отклонил токен' };

    const seen = new Map<string, string>();
    for (const update of body.result ?? []) {
      const chat = update.message?.chat;
      if (!chat) continue;
      const title = chat.title ?? chat.username ?? chat.first_name ?? String(chat.id);
      seen.set(String(chat.id), title);
    }

    return { ok: true, chats: [...seen].map(([id, title]) => ({ id, title })) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'неизвестная ошибка';
    return { ok: false, message: `Не удалось связаться с Telegram: ${message}` };
  }
}

type OrderLine = { name: string; size: string; colorName: string; quantity: number; price: number };

type OrderNotice = {
  number: string;
  customerName: string;
  customerPhone: string;
  total: number;
  deliveryLabel: string;
  address: string | null;
  comment: string | null;
  items: OrderLine[];
  siteUrl: string;
};

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The message the shop actually reads: what to pack, whom to call, where to take it. */
export function orderMessage(order: OrderNotice): string {
  const lines = order.items
    .map((item) => {
      const size = item.size && item.size !== 'ONE' ? `, ${item.size}` : '';
      const count = item.quantity > 1 ? ` × ${item.quantity}` : '';
      return `• ${escape(item.name)} (${escape(item.colorName)}${escape(size)})${count} — ${item.price * item.quantity} сомони`;
    })
    .join('\n');

  const parts = [
    `<b>Новый заказ ${escape(order.number)}</b>`,
    '',
    lines,
    '',
    `<b>Итого: ${order.total} сомони</b>`,
    '',
    `Покупатель: ${escape(order.customerName)}`,
    `Телефон: ${escape(order.customerPhone)}`,
    order.deliveryLabel ? `Доставка: ${escape(order.deliveryLabel)}` : null,
    order.address ? `Адрес: ${escape(order.address)}` : null,
    order.comment ? `Комментарий: ${escape(order.comment)}` : null,
    '',
    `${order.siteUrl}/admin/orders`,
  ];

  return parts.filter((part) => part !== null).join('\n');
}
