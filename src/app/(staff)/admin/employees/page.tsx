import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { EmployeesPanel } from '@/components/staff/EmployeesPanel';
import { StaffHeader } from '@/components/staff/StaffShell';

export default async function EmployeesPage() {
  // employees and their rights are the administrator's alone
  await requireAdmin();

  const [staff, customers] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.EMPLOYEE] } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        permissions: { select: { permission: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, phone: true, role: true },
    }),
  ]);

  return (
    <>
      <StaffHeader
        title="Сотрудники"
        description="Права проверяются на сервере: раздел, на который прав нет, просто не откроется."
      />
      <EmployeesPanel
        members={staff.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          role: s.role,
          permissions: s.permissions.map((p) => p.permission),
        }))}
        candidates={customers.map((c) => ({ ...c, permissions: [] }))}
      />
    </>
  );
}
