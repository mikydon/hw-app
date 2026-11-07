// 1.9.0: a locale's translations of the 1.9.0 texts live in t190/<lang>.js and are merged over the locale here
// (sections key by key: ui, pl, ach, ex, tour; whole arrays like news19 replace).
export function with190(L, T) {
  if (!T) return L;
  for (const [k, v] of Object.entries(T)) L[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(L[k] || {}), ...v } : v;
  return L;
}
