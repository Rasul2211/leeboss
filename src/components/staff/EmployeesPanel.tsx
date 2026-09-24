'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { Permission, Role } from '@prisma/client';
import { setEmployeePermissions, setUserRole } from '@/app/actions/staff';
import {
  ASSIGNABLE_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_PRESETS,
} from '@/lib/staff-nav';
import { Button } from '@/components/ui/button';
import { formatPhone } from '@/lib/validation';
import { cn } from '@/lib/utils';

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  permissions: Permission[];
};

export function EmployeesPanel({ members, candidates }: { members: StaffMember[]; candidates: StaffMember[] }) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
        {members.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-10 text-center text-sm text-ink-faint">
            Сотрудников пока нет. Назначьте любого зарегистрированного клиента ниже.
          </p>
        ) : null}
      </section>

      {candidates.length > 0 ? (
        <section className="rounded-card border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Назначить сотрудником</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Клиент станет сотрудником без прав — права выдаются отдельно.
          </p>
          <ul className="mt-4 divide-y divide-line">
            {candidates.map((person) => (
              <CandidateRow key={person.id} person={person} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MemberCard({ member }: { member: StaffMember }) {
  const router = useRouter();
  const [granted, setGranted] = useState<Permission[]>(member.permissions);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = member.role === Role.ADMIN;
  const changed =
    granted.length !== member.permissions.length ||
    granted.some((p) => !member.permissions.includes(p));

  function toggle(permission: Permission) {
    setGranted((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission],
    );
  }

  function save() {
    setError(null);
    start(async () => {
      const result = await setEmployeePermissions({ userId: member.id, permissions: granted });
      if (result.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  function demote() {
    start(async () => {
      const result = await setUserRole(member.id, Role.CUSTOMER);
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            {member.name}
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">
                <ShieldCheck className="size-3" aria-hidden />
                Администратор
              </span>
            ) : null}
          </p>
          <p className="price-figures text-xs text-ink-faint">{formatPhone(member.phone)}</p>
        </div>

        {!isAdmin ? (
          <button
            type="button"
            onClick={demote}
            disabled={pending}
            className="text-xs text-ink-faint hover:text-brand disabled:opacity-50"
          >
            Снять с должности
          </button>
        ) : null}
      </div>

      {isAdmin ? (
        // the administrator implicitly holds everything; ticking boxes for them
        // would suggest rights could be taken away, which they cannot
        <p className="mt-3 text-xs text-ink-muted">
          У администратора есть все права, включая управление сотрудниками и настройками.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {PERMISSION_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setGranted(preset.permissions)}
                className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted hover:border-brand hover:text-brand"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {ASSIGNABLE_PERMISSIONS.map((permission) => (
              <li key={permission}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                    granted.includes(permission)
                      ? 'border-brand bg-brand-soft text-ink'
                      : 'border-line text-ink-muted hover:border-ink/30',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={granted.includes(permission)}
                    onChange={() => toggle(permission)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  {PERMISSION_LABELS[permission]}
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} disabled={pending || !changed} size="sm">
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Сохранить права
            </Button>
            {done ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3.5" aria-hidden />
                Сохранено
              </span>
            ) : null}
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-xs text-brand">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CandidateRow({ person }: { person: StaffMember }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span>
        <span className="block text-sm text-ink">{person.name}</span>
        <span className="price-figures block text-xs text-ink-faint">{formatPhone(person.phone)}</span>
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setUserRole(person.id, Role.EMPLOYEE);
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Сделать сотрудником
      </Button>
    </li>
  );
}
