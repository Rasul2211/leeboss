import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { getTelegramSettings } from '@/lib/telegram';
import { StaffHeader } from '@/components/staff/StaffShell';
import { NotificationsPanel } from '@/components/staff/NotificationsPanel';

export default async function NotificationsPage() {
  await requirePermission(Permission.SETTINGS_MANAGE);
  const { token, chatId } = await getTelegramSettings();

  return (
    <>
      <StaffHeader
        title="Уведомления о заказах"
        description="Чтобы не пропустить заказ: бот напишет в Telegram, как только его оформят."
      />

      {/* the token itself is never sent to the browser - only whether one exists */}
      <NotificationsPanel hasToken={Boolean(token)} connectedChat={chatId} />
    </>
  );
}
