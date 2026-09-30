/**
 * Locale-independent date formatting.
 *
 * `toLocaleDateString()` / `toLocaleString()` render differently in Node
 * (SSR, always en-US UTC-ish) than in the visitor's browser (their local
 * locale + timezone), so React throws hydration error #418 on the very
 * first paint. Formatting explicitly with UTC + `timeZone: "UTC"` makes
 * server and client produce byte-identical text.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "12 Mar 2025" — compact card footer date. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "2025-03-12 14:05 UTC" — run timestamps. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())} UTC`;
}
