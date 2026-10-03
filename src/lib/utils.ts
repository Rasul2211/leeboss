import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** plural(21, ['товар', 'товара', 'товаров']) -> "товар" */
export function plural(count: number, forms: [string, string, string]): string {
  const tens = Math.abs(count) % 100;
  const ones = tens % 10;
  if (tens > 10 && tens < 20) return forms[2];
  if (ones === 1) return forms[0];
  if (ones >= 2 && ones <= 4) return forms[1];
  return forms[2];
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
