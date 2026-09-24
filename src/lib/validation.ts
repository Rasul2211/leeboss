import { z } from 'zod';

/**
 * Tajik mobile numbers are +992 followed by nine digits. People type them with
 * spaces, dashes, brackets and sometimes a leading 8 or 992 without the plus,
 * so everything is normalised to one canonical form before it reaches the
 * database - otherwise the same person ends up with several accounts.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 9) return `+992${digits}`;
  if (digits.length === 12 && digits.startsWith('992')) return `+${digits}`;
  // a local habit carried over from Russian numbering
  if (digits.length === 10 && digits.startsWith('8')) return `+992${digits.slice(1)}`;

  return null;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-9);
  if (digits.length !== 9) return phone;
  return `+992 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Укажите номер телефона')
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Номер в формате +992 XX XXX XX XX' });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(6, 'Пароль не короче 6 символов')
  .max(72, 'Пароль слишком длинный'); // bcrypt silently truncates past 72 bytes

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Укажите имя')
  .max(60, 'Слишком длинное имя');

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Введите пароль'),
});

export const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const checkoutSchema = z
  .object({
    name: nameSchema,
    phone: phoneSchema,
    comment: z.string().trim().max(500).optional(),
    deliveryMethod: z.enum(['PICKUP', 'COURIER_DUSHANBE', 'REGIONAL']),
    pickupPointId: z.string().optional(),
    deliveryZoneId: z.string().optional(),
    address: z.string().trim().max(200).optional(),
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CARD_DEMO']),
  })
  .superRefine((value, ctx) => {
    if (value.deliveryMethod === 'PICKUP' && !value.pickupPointId) {
      ctx.addIssue({ path: ['pickupPointId'], code: z.ZodIssueCode.custom, message: 'Выберите магазин' });
    }
    if (value.deliveryMethod !== 'PICKUP') {
      if (!value.deliveryZoneId) {
        ctx.addIssue({ path: ['deliveryZoneId'], code: z.ZodIssueCode.custom, message: 'Выберите город' });
      }
      if (!value.address || value.address.length < 5) {
        ctx.addIssue({ path: ['address'], code: z.ZodIssueCode.custom, message: 'Укажите адрес доставки' });
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Turns a ZodError into the flat { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
