/** The six taxonomies an artwork belongs to (names match the API's `{dimension}` path segment). */
export const DIMENSIONS = ['author', 'form', 'location', 'school', 'timeframe', 'type'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export interface DimensionMeta {
  key: Dimension;
  /** Query-string name used by /api/filter and /api/search. */
  param: 'au' | 'fo' | 'lo' | 'sc' | 'ti' | 'ty';
  singular: string;
  plural: string;
  blurb: string;
}

export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
  author: { key: 'author', param: 'au', singular: 'Artist', plural: 'Artists', blurb: 'Painters, sculptors and architects, A to Z.' },
  timeframe: { key: 'timeframe', param: 'ti', singular: 'Period', plural: 'Periods', blurb: 'Travel through art, half a century at a time.' },
  form: { key: 'form', param: 'fo', singular: 'Art form', plural: 'Art forms', blurb: 'Painting, sculpture, architecture and more.' },
  type: { key: 'type', param: 'ty', singular: 'Subject', plural: 'Subjects', blurb: 'Portraits, landscapes, religious scenes and more.' },
  school: { key: 'school', param: 'sc', singular: 'School', plural: 'Schools', blurb: 'National and regional traditions.' },
  location: { key: 'location', param: 'lo', singular: 'Place', plural: 'Places', blurb: 'Museums and sites that hold the works.' },
};

export function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value);
}

export interface Artwork {
  id: number;
  title: string;
  date: string;
  technique: string;
  /** Relative to `imageBaseUrl`, or absolute. */
  url: string;
  authorId: number;
  author: string;
  bornDied: string;
  formId: number;
  form: string;
  locationId: number;
  location: string;
  schoolId: number;
  school: string;
  timeframeId: number;
  timeframe: string;
  typeId: number;
  type: string;
}

/** One row of any taxonomy, in a uniform shape. */
export interface Collection {
  dimension: Dimension;
  id: number;
  name: string;
  count: number;
  /** Feature artwork URL (not for authors – the API has none yet). */
  image: string | null;
  /** Authors: life dates. */
  subtitle: string | null;
  /** Authors: their most common school. */
  school: string | null;
  schoolId: number | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paged<T> {
  items: T[];
  pagination: Pagination;
}

/** Taxonomy filters, keyed by dimension. */
export type Filters = Partial<Record<Dimension, number>>;
