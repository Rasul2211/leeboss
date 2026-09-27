/**
 * Flat-lay outfit photographs from the shop's own Instagram.
 *
 * These are photographs of complete outfits, not of single products, so they
 * are not catalogue rows and deliberately do not live in the database: nothing
 * about them is per-customer or edited from the admin panel yet. They are cut
 * out of phone screenshots, which caps them at 588px square - fine for a tile
 * in a grid or a strip, too small to stretch across a desktop hero.
 */
export type GalleryOutfit = {
  file: string;
  /** describes only what is visible in the frame, for screen readers */
  alt: string;
};

export const GALLERY_OUTFITS: GalleryOutfit[] = [
  { file: '/looks/look-05.jpg', alt: 'Коричневая рубашка в полоску, белые брюки и замшевые сандалии' },
  { file: '/looks/look-13.jpg', alt: 'Тёмно-синее поло в оранжевую полоску, кремовые брюки и рыжие лоферы' },
  { file: '/looks/look-19.jpg', alt: 'Красная футболка, светлые джинсы и красные кеды' },
  { file: '/looks/look-08.jpg', alt: 'Кремовое поло в бордовую полоску, бежевые брюки и бордовые кроссовки' },
  { file: '/looks/look-01.jpg', alt: 'Футболка цвета хаки с принтом, кремовые джинсы, сумка и кроссовки' },
  { file: '/looks/look-06.jpg', alt: 'Тёмно-синее поло в белую полоску, белые брюки и синие кеды' },
  { file: '/looks/look-11.jpg', alt: 'Коричневое поло, кремовые брюки и коричневые лоферы' },
  { file: '/looks/look-02.jpg', alt: 'Белая футболка с принтом, чёрные джинсы и чёрная кепка' },
  { file: '/looks/look-15.jpg', alt: 'Молочное поло с тёмным воротом, тёмные джинсы и белые кеды' },
  { file: '/looks/look-09.jpg', alt: 'Белая рубашка в полоску, коричневые брюки и коричневые сандалии' },
  { file: '/looks/look-20.jpg', alt: 'Красная футболка, кремовые брюки и красные кеды' },
  { file: '/looks/look-12.jpg', alt: 'Тёмно-синий джемпер, белые брюки и синие лоферы' },
  { file: '/looks/look-03.jpg', alt: 'Молочная футболка с принтом, тёмные джинсы, бежевая кепка и сумка' },
  { file: '/looks/look-17.jpg', alt: 'Коричневое поло с белым воротом, кремовые брюки и коричневые лоферы' },
  { file: '/looks/look-07.jpg', alt: 'Чёрная рубашка в полоску, молочные брюки и замшевые сандалии' },
  { file: '/looks/look-14.jpg', alt: 'Бордовое поло в полоску, белые брюки и бежевые кеды' },
  { file: '/looks/look-04.jpg', alt: 'Чёрная футболка, тёмные джинсы, чёрная кепка и чёрные кеды' },
  { file: '/looks/look-18.jpg', alt: 'Тёмно-синее поло, белые брюки и синие лоферы' },
  { file: '/looks/look-10.jpg', alt: 'Поло цвета хаки с белыми вставками, светлые брюки и бежевые лоферы' },
  { file: '/looks/look-16.jpg', alt: 'Белое поло в тёмную полоску, белые брюки и тёмные кеды' },
];

/** The four that open the page: four different colour families, so the grid reads as a range. */
export const HERO_OUTFITS = GALLERY_OUTFITS.slice(0, 4);
