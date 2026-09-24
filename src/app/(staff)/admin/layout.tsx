import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { StaffShell } from '@/components/staff/StaffShell';

export const metadata: Metadata = { title: 'Панель управления', robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // every admin route is gated here on the server, not by hiding links
  const user = await requireAdmin();
  return (
    <StaffShell root="/admin" title="Администратор" user={user}>
      {children}
    </StaffShell>
  );
}
