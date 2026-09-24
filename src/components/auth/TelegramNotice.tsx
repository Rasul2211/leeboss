import { Send } from 'lucide-react';

/**
 * Telegram's login widget only runs on a domain bound to the bot through
 * BotFather; it cannot work on localhost. Rather than render a button that
 * would do nothing, the state is stated plainly and the button appears only
 * once the bot name is configured.
 */
export function TelegramNotice() {
  const botName = process.env.TELEGRAM_BOT_NAME;

  return (
    <div className="mt-8 border-t border-line pt-6">
      <p className="text-center text-xs uppercase tracking-wider text-ink-faint">или</p>

      {botName ? (
        <div className="mt-4 flex justify-center">
          {/* the widget injects its own button and posts back to /api/auth/telegram */}
          <div id="telegram-login" data-bot={botName} />
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-surface-alt px-4 py-3">
          <Send className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
          <p className="text-xs leading-relaxed text-ink-muted">
            Вход через Telegram заработает после публикации сайта на домене: виджет Telegram не
            запускается на локальном адресе. Пока пользуйтесь входом по номеру.
          </p>
        </div>
      )}
    </div>
  );
}
