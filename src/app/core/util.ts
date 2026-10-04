/** First year-like number in a label such as "1251-1300" – used to order periods chronologically. */
export function startYear(label: string): number {
  const match = /\d{3,4}/.exec(label);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Parses a `?page=` style value into a positive integer. */
export function toPage(value: unknown): number {
  return Math.max(1, toInt(value, 1));
}

export function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** The API defaults to lowercase keys but can be configured to upper case – accept both. */
export function lowerKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k.toLowerCase()] = v;
  return out;
}

/** "oil on canvas" -> "Oil on canvas". The source data is inconsistently cased. */
export function sentenceCase(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}

export function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
