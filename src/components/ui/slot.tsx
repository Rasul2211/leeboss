import { Children, cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal `asChild` helper: merges the parent's props onto its single child
 * element, so a styled component can wrap a <Link> without emitting a nested
 * <button>. Replaces the Radix Slot dependency, which is all we needed from it.
 */
export function Slot({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const child = Children.only(children);
  if (!isValidElement<React.HTMLAttributes<HTMLElement>>(child)) return null;

  return cloneElement(child, {
    ...props,
    ...child.props,
    className: cn(className, child.props.className),
  });
}
