import { redirect } from 'next/navigation';
import { Permission } from '@prisma/client';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { Dashboard } from '@/components/staff/Dashboard';
import { StaffHeader } from '@/components/staff/StaffShell';
import { STAFF_SECTIONS } from '@/lib/staff-nav';

export default async function EmployeeHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/employee');

  // The panel root shows the dashboard, but a warehouse hand or an order
  // manager has no right to see figures. Rather than bounce them to a refusal
  // page, send them to the first section they can actually open.
  if (!hasPermission(user, Permission.ANALYTICS_VIEW)) {
    const first = STAFF_SECTIONS.find(
      (section) => section.path !== '' && hasPermission(user, section.permission),
    );
    if (first) redirect(`/employee${first.path}`);

    return (
      <div className="rounded-card border border-dashed border-line px-5 py-16 text-center">
        <h1 className="text-lg font-semibold text-ink">Права ещё не выданы</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Ваша учётная запись отмечена как сотрудник, но разделы пока не открыты. Попросите
          администратора выдать нужные права.
        </p>
      </div>
    );
  }

  return (
    <>
      <StaffHeader title="Сводка" description="Как идут дела в магазине прямо сейчас." />
      <Dashboard root="/employee" />
    </>
  );
}
