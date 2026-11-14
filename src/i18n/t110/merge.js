// 1.10.0: a locale's translations of the 1.10.0 texts live in t110/<lang>.js and are merged over the locale here,
// deep: objects key by key (gm.j, gm.boss …), whole arrays replace (news1_10), and an object over an array sets
// items by index (tour: { c5: { 0: "…" } } changes only the first line of chapter 5).
const isObj = x => x && typeof x === "object" && !Array.isArray(x);
const merge = (a, b) => {
  if (Array.isArray(a) && isObj(b)) { const c = [...a]; for (const [k, v] of Object.entries(b)) c[+k] = v; return c; }
  if (isObj(a) && isObj(b)) { const c = { ...a }; for (const [k, v] of Object.entries(b)) c[k] = merge(a[k], v); return c; }
  return b;
};
export function with110(L, T) {
  if (!T) return L;
  for (const [k, v] of Object.entries(T)) L[k] = merge(L[k], v);
  return L;
}
