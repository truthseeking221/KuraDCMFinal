/* Compact relative label for a draft's last-saved time. Client-only (reads the
   wall clock at render), so only call it where the draft has a real `updatedAt`
   — never during SSR/seed, where updatedAt is absent. */
export function draftSavedAgo(updatedAt: number | undefined): string | null {
  if (!updatedAt || typeof window === "undefined") return null;
  const seconds = Math.max(0, Math.floor((Date.now() - updatedAt) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
