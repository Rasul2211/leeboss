import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  PACKING: 'Собирается',
  READY_FOR_PICKUP: 'Готов к выдаче',
  IN_DELIVERY: 'В доставке',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: 'При получении',
  CARD_DEMO: 'Картой (демо)',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FAILED: 'Оплата не прошла',
  REFUNDED: 'Возвращён',
};

/**
 * Which statuses an order may move to next.
 *
 * Collection and delivery diverge after packing, and a finished or cancelled
 * order is final - restoring stock for a reopened order is a different
 * operation and should not hide behind a status dropdown.
 */
export function nextStatuses(current: OrderStatus, method: DeliveryMethod): OrderStatus[] {
  switch (current) {
    case OrderStatus.NEW:
      return [OrderStatus.CONFIRMED, OrderStatus.CANCELLED];
    case OrderStatus.CONFIRMED:
      return [OrderStatus.PACKING, OrderStatus.CANCELLED];
    case OrderStatus.PACKING:
      return method === DeliveryMethod.PICKUP
        ? [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED]
        : [OrderStatus.IN_DELIVERY, OrderStatus.CANCELLED];
    case OrderStatus.READY_FOR_PICKUP:
    case OrderStatus.IN_DELIVERY:
      return [OrderStatus.COMPLETED, OrderStatus.CANCELLED];
    default:
      return [];
  }
}

export function statusTone(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.NEW:
      return 'bg-brand-soft text-brand';
    case OrderStatus.COMPLETED:
      return 'bg-emerald-50 text-emerald-700';
    case OrderStatus.CANCELLED:
      return 'bg-surface-alt text-ink-faint';
    default:
      return 'bg-amber-50 text-amber-700';
  }
}
