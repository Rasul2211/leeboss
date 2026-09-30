'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import {
  disconnectBot,
  saveBotToken,
  saveChat,
  sendTestMessage,
  type NotifyResult,
} from '@/app/actions/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

type Chat = { id: string; title: string };

/**
 * Connecting the bot, in the order the shop actually does it.
 *
 * The chat id is never typed in: nobody knows their own, and looking it up
 * means a third-party bot. Instead the shop writes to its bot once, and the
 * chats that wrote are listed here to pick from.
 */
export function NotificationsPanel({
  hasToken,
  connectedChat,
}: {
  hasToken: boolean;
  connectedChat: string | null;
}) {
  const [token, setToken] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handle(run: () => Promise<NotifyResult>) {
    startTransition(async () => {
      const result = await run();
      if (result.ok && 'chats' in result) {
        setChats(result.chats);
        setNote({ ok: true, text: 'Токен принят. Выберите, куда слать заказы' });
        return;
      }
      setNote({ ok: result.ok, text: result.ok ? result.message : result.message });
      if (result.ok) setChats([]);
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {connectedChat ? (
        <div className="rounded-card border border-line bg-surface-alt p-5">
          <p className="text-sm font-medium text-ink">Уведомления подключены</p>
          <p className="mt-1 text-xs text-ink-muted">
            Каждый новый заказ приходит в Telegram: что взяли, телефон, адрес и сумма.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => handle(sendTestMessage)}
            >
              <Send className="size-4" aria-hidden />
              Отправить проверку
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => handle(disconnectBot)}
            >
              Отключить
            </Button>
          </div>
        </div>
      ) : null}

      <ol className="space-y-5">
        <Step
          number={1}
          title="Создайте бота"
          body={
            <p className="text-sm text-ink-muted">
              В Telegram напишите{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand hover:text-brand-hover"
              >
                @BotFather
              </a>
              , отправьте ему <code className="rounded bg-surface-alt px-1">/newbot</code> и
              придумайте имя. В ответ придёт строка вида{' '}
              <code className="rounded bg-surface-alt px-1">8123456789:AAG…</code> — это и есть
              токен.
            </p>
          }
        />

        <Step
          number={2}
          title="Вставьте токен"
          body={
            <div className="flex flex-wrap gap-2">
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={hasToken ? 'Токен уже сохранён — вставьте новый, чтобы заменить' : '8123456789:AAG…'}
                aria-label="Токен бота"
                className="min-w-0 flex-1"
              />
              <Button disabled={pending || !token.trim()} onClick={() => handle(() => saveBotToken(token))}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Проверить
              </Button>
            </div>
          }
        />

        <Step
          number={3}
          title="Напишите боту «привет»"
          body={
            <p className="text-sm text-ink-muted">
              Откройте своего бота в Telegram и отправьте любое сообщение — иначе он не имеет права
              вам писать. Если хотите, чтобы заказы видели все продавцы, добавьте бота в общую
              группу и напишите сообщение там.
            </p>
          }
        />

        {chats.length > 0 ? (
          <Step
            number={4}
            title="Выберите, куда слать заказы"
            body={
              <ul className="flex flex-wrap gap-2">
                {chats.map((chat) => (
                  <li key={chat.id}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => handle(() => saveChat(chat.id))}
                    >
                      <Check className="size-4" aria-hidden />
                      {chat.title}
                    </Button>
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}
      </ol>

      {note ? (
        <p role="status" className={cn('text-sm', note.ok ? 'text-ink-muted' : 'text-brand')}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}

function Step({ number, title, body }: { number: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="price-figures grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="mt-2">{body}</div>
      </div>
    </li>
  );
}
