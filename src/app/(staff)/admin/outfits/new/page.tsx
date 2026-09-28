import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Permission } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { StaffHeader } from '@/components/staff/StaffShell';
import { NewOutfitForm } from '@/components/staff/NewOutfitForm';

export default async function NewOutfitPage() {
  await requirePermission(Permission.PRODUCTS_MANAGE);

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Все товары
      </Link>

      <StaffHeader
        title="Новый образ"
        description="Фотография раскладки целиком и список вещей с ценами — покупатель берёт образ одной кнопкой."
      />

      <NewOutfitForm />
    </>
  );
}
