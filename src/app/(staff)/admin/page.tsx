import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { Dashboard } from '@/components/staff/Dashboard';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function DashboardPage() {
  await requirePermission(Permission.ANALYTICS_VIEW);
  return (
    <>
      <StaffHeader title="Сводка" description="Как идут дела в магазине прямо сейчас." />
      <Dashboard root="/admin" />
    </>
  );
}
