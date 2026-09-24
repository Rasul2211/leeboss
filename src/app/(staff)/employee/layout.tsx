import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { StaffShell } from '@/components/staff/StaffShell';

export const metadata: Metadata = { title: 'Панель сотрудника', robots: { index: false } };

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/employee');
  if (!isStaff(user)) redirect('/403');

  return (
    <StaffShell root="/employee" title="Сотрудник" user={user}>
      {children}
    </StaffShell>
  );
}
