'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { updateCategory } from '@/app/actions/staff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  productCount: number;
  children: CategoryNode[];
};

export function CategoriesPanel({ tree }: { tree: CategoryNode[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Слоты манекена привязаны к разделам и не меняются: от них зависит, куда вещь садится в
        примерочной. Здесь можно переименовать раздел и скрыть его с сайта.
      </p>

      <div className="space-y-3">
        {tree.map((section) => (
          <div key={section.id} className="rounded-card border border-line bg-white p-5">
            <Row node={section} />
            {section.children.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-line pt-3">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <Row node={child} nested />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-xs text-ink-faint">
                Подкатегорий нет
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ node, nested = false }: { node: CategoryNode; nested?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(node.name);
  const [isActive, setIsActive] = useState(node.isActive);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name !== node.name || isActive !== node.isActive;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', nested && 'pl-1')}>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label={`Название раздела ${node.name}`}
        className={cn('h-9 max-w-64 flex-1', nested && 'text-sm')}
      />

      <span className="price-figures shrink-0 text-xs text-ink-faint">
        {node.productCount} тов.
      </span>

      <label className="inline-flex shrink-0 items-center gap-2 text-xs text-ink-muted">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="size-4 accent-[var(--color-brand)]"
        />
        Показывать
      </label>

      <Button
        size="sm"
        variant="outline"
        disabled={pending || !dirty}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await updateCategory({ categoryId: node.id, name, isActive });
            if (result.ok) {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
              router.refresh();
            } else {
              setError(result.message);
            }
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {done ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : 'Сохранить'}
      </Button>

      {error ? (
        <span role="alert" className="text-xs text-brand">
          {error}
        </span>
      ) : null}
    </div>
  );
}
