import { Permission } from '@prisma/client';

/**
 * One description of the staff area, used for both panels.
 *
 * /admin and /employee render the same sections; what differs is who may open
 * them. Keeping the map in one place means a new section cannot accidentally
 * appear in one panel without a permission attached to it.
 */
export type StaffSection = {
  key: string;
  label: string;
  /** appended to the panel root, e.g. "/orders" under "/admin" */
  path: string;
  permission: Permission;
  icon: 'dashboard' | 'orders' | 'products' | 'categories' | 'stock' | 'looks' | 'customers' | 'employees' | 'reviews' | 'delivery';
};

export const STAFF_SECTIONS: StaffSection[] = [
  { key: 'dashboard', label: 'Сводка', path: '', permission: Permission.ANALYTICS_VIEW, icon: 'dashboard' },
  { key: 'orders', label: 'Заказы', path: '/orders', permission: Permission.ORDERS_VIEW, icon: 'orders' },
  { key: 'products', label: 'Товары', path: '/products', permission: Permission.PRODUCTS_VIEW, icon: 'products' },
  { key: 'stock', label: 'Остатки', path: '/stock', permission: Permission.STOCK_MANAGE, icon: 'stock' },
  { key: 'categories', label: 'Категории', path: '/categories', permission: Permission.CATEGORIES_MANAGE, icon: 'categories' },
  { key: 'looks', label: 'Образы', path: '/looks', permission: Permission.LOOKS_MANAGE, icon: 'looks' },
  { key: 'reviews', label: 'Отзывы', path: '/reviews', permission: Permission.PRODUCTS_MANAGE, icon: 'reviews' },
  { key: 'customers', label: 'Клиенты', path: '/customers', permission: Permission.CUSTOMERS_VIEW, icon: 'customers' },
  { key: 'employees', label: 'Сотрудники', path: '/employees', permission: Permission.EMPLOYEES_MANAGE, icon: 'employees' },
  { key: 'delivery', label: 'Доставка', path: '/delivery', permission: Permission.SETTINGS_MANAGE, icon: 'delivery' },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  ORDERS_VIEW: 'Видеть заказы',
  ORDERS_MANAGE: 'Управлять заказами',
  PRODUCTS_VIEW: 'Видеть товары',
  PRODUCTS_MANAGE: 'Управлять товарами',
  PRICING_MANAGE: 'Менять цены и скидки',
  STOCK_MANAGE: 'Управлять остатками',
  CATEGORIES_MANAGE: 'Управлять категориями',
  LOOKS_MANAGE: 'Управлять образами',
  CUSTOMERS_VIEW: 'Видеть клиентов',
  ANALYTICS_VIEW: 'Видеть статистику',
  EMPLOYEES_MANAGE: 'Управлять сотрудниками',
  SETTINGS_MANAGE: 'Менять настройки магазина',
};

/** Rights only an administrator may ever hold. */
export const ADMIN_ONLY: Permission[] = [Permission.EMPLOYEES_MANAGE, Permission.SETTINGS_MANAGE];

/** Starting sets so an administrator does not tick twelve boxes by hand. */
export const PERMISSION_PRESETS: { key: string; label: string; permissions: Permission[] }[] = [
  {
    key: 'orders',
    label: 'Менеджер заказов',
    permissions: [Permission.ORDERS_VIEW, Permission.ORDERS_MANAGE, Permission.CUSTOMERS_VIEW],
  },
  {
    key: 'content',
    label: 'Контент-менеджер',
    permissions: [
      Permission.PRODUCTS_VIEW,
      Permission.PRODUCTS_MANAGE,
      Permission.CATEGORIES_MANAGE,
      Permission.LOOKS_MANAGE,
    ],
  },
  {
    key: 'stock',
    label: 'Кладовщик',
    permissions: [Permission.PRODUCTS_VIEW, Permission.STOCK_MANAGE],
  },
  {
    key: 'senior',
    label: 'Старший менеджер',
    permissions: [
      Permission.ORDERS_VIEW,
      Permission.ORDERS_MANAGE,
      Permission.CUSTOMERS_VIEW,
      Permission.PRODUCTS_VIEW,
      Permission.PRODUCTS_MANAGE,
      Permission.CATEGORIES_MANAGE,
      Permission.LOOKS_MANAGE,
      Permission.STOCK_MANAGE,
      Permission.PRICING_MANAGE,
      Permission.ANALYTICS_VIEW,
    ],
  },
];

export const ASSIGNABLE_PERMISSIONS = (Object.keys(PERMISSION_LABELS) as Permission[]).filter(
  (permission) => !ADMIN_ONLY.includes(permission),
);
