/*
  Catalogue addresses.

  Sorting and paging live in the path - /catalog/obuv/sort-cheap/page-2 - not in
  the query string. A page that reads its query string has to be rendered for
  every request; one addressed purely by its path is built once and served from
  the CDN, which is what makes the catalogue open at once on a phone.

  No server-only import here: the sort control and the pager build these links
  in the browser.
*/

export const SORT_KEYS = ['new', 'cheap', 'expensive', 'name'] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_SORT: SortKey = 'new';

export function isSortKey(value: string | undefined): value is SortKey {
  return value != null && (SORT_KEYS as readonly string[]).includes(value);
}

export type CatalogView = { category?: string; sort: SortKey; page: number };

export function catalogHref({ category, sort = DEFAULT_SORT, page = 1 }: Partial<CatalogView>): string {
  const parts = ['/catalog'];
  if (category) parts.push(category);
  if (sort !== DEFAULT_SORT) parts.push(`sort-${sort}`);
  if (page > 1) parts.push(`page-${page}`);
  return parts.join('/');
}

/** Reads the path back. Null means the address is not one this shop writes. */
export function parseCatalogPath(segments: string[] | undefined): CatalogView | null {
  const view: CatalogView = { sort: DEFAULT_SORT, page: 1 };

  for (const [index, part] of (segments ?? []).entries()) {
    const sort = /^sort-(.+)$/.exec(part)?.[1];
    const page = /^page-(\d{1,4})$/.exec(part)?.[1];

    if (sort) {
      if (!isSortKey(sort)) return null;
      view.sort = sort;
    } else if (page) {
      view.page = Number(page);
      if (view.page < 1) return null;
    } else if (index === 0) {
      view.category = part;
    } else {
      return null;
    }
  }

  // one spelling per page, so the same listing is never cached under two addresses
  const canonical = catalogHref(view);
  const given = ['/catalog', ...(segments ?? [])].join('/');
  return canonical === given ? view : null;
}
