import { formatDistanceToNow, format } from "date-fns";

export function formatMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / Math.pow(1024, i);
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function formatNumber(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatCompact(n: number | undefined | null): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatPercent(n: number | undefined | null, digits = 2): string {
  if (n === undefined || n === null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy HH:mm:ss");
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatDuration(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

export function truncateMiddle(value: string, head = 10, tail = 6): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Deterministic pseudo-random generator so SSR and client render identical data. */
export function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
