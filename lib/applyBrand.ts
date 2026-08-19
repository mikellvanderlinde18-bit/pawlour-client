export function applyBrandColors(primary?: string | null, accent?: string | null) {
  if (typeof document === "undefined") return;
  if (primary) document.documentElement.style.setProperty("--brand-primary", primary);
  if (accent) document.documentElement.style.setProperty("--brand-accent", accent);
}
