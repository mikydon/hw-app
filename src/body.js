// 1.9.0 body drawing (own drawing, Michael Nov 6: body ranks as the Profile header + muscle icons). One figure 120 × 232,
// front and back; every path is the RIGHT half (x ≥ 60) and is mirrored for the left. Muscle plates carry their family
// (src/plans.js FAMILIES) so the same drawing colours ranks (Profile) and highlights muscles (icons).
export const BODY_W = 120, BODY_H = 232;
const HEAD = "M60 6c7.2 0 11.5 5.6 11.5 13.2 0 8.5-5 15.3-11.5 15.3";
const SIL = "M60 33H65.5L66.5 39C71 40.5 78 41.8 83 44C89.5 46.8 92.5 52 93.2 59L95 77C97.6 83 99.4 90 99.6 98L99 107C100.6 110 101 113.4 100.2 116.2C98.6 118.6 95.2 117.6 93.8 115.6L92 110.4C89 103 87 96 86 89L84.4 79C83.6 73 83 68 82.4 64C81.6 63 80.6 63 80 64.4C78 70 76.8 76 75.6 84C74.8 90 75.6 96 78.2 103C80.6 109 81.6 116 81.6 124C81.4 136 80 146 78.4 156C79.8 164 80.2 172 79 180C77.8 190 76 200 74.6 207C76.6 209 79 211 79 214L64.4 214L64.6 207C63.6 196 63 184 63.4 174C63.6 168 63.4 162 63 158C62.4 148 62 138 62.2 128C62.2 125 61.4 123 60 122.6";
export const FRONT = [
  { m: "delt", f: "shoulders", d: "M67.8 41.8c6.6 1.2 13.4 2.6 17.6 6.2 3.8 3.2 5.6 8.4 5.6 14.4-2.6-4.2-6.6-7.4-11.6-9.4-4.2-1.6-8-3.6-11.6-11.2Z" },
  { m: "chest", f: "chest", d: "M61.2 45.2c5.4-.6 11.2.4 15.8 4.2 3.4 2.8 4.6 6.6 3.4 10.4-1.6 4.4-6.4 6.2-11.4 5.8-3.6-.4-6.6-1.6-7.8-3.6Z" },
  { m: "biceps", f: "arms", d: "M82.4 59.6c3.4 1.6 6.2 4.6 7.4 8.8l1.4 9.4c.4 3.2-.6 5.6-2.6 6.2-2.4-3.6-4.4-9.4-5.4-15.4Z" },
  { m: "forearm", f: "arms", d: "M90.4 87.6c3.4 4.4 5.4 10.4 5.6 17.4.2 3-1 4.8-2.6 4.8-2.4-5-4.4-10.8-5.4-17Z" },
  { m: "abs", f: "core", d: "M61.2 66.6h6.2c1.4 0 2 .8 2 2v6.2c0 1-.6 1.6-1.6 1.6h-6.6ZM61.2 78.4h6.6c1 0 1.6.6 1.6 1.6v6.6c0 1-.6 1.6-1.6 1.6h-6.6ZM61.2 90.2h6.6c1 0 1.6.6 1.6 1.6v6.4c0 1-.6 1.6-1.6 1.6h-6.6ZM61.2 101.8h6.8c.8 6.2-1.6 12.4-6.8 15.6Z" },
  { m: "obl", f: "core", d: "M71.4 67.6c2.8.4 4.8 2.4 5.4 6 .6 5.2.2 11.4-.8 17.4-.8 4.6-2.4 9.4-5 12.8Z" },
  { m: "quads", f: "quads", d: "M64.4 121c4-7.2 9.4-12.6 14.2-12 2.6 3.8 3.8 9.6 3.6 16.4-.2 8.4-1.6 17.6-4.2 25.2-1.4 4-4.8 5.4-8 4-2.6-1.2-4.6-4.6-5.2-9.2-.8-8.2-.8-16.6-.4-24.4Z" },
  { m: "tib", f: "calves", d: "M68.8 166c2.6-2.4 6.2-2.2 8.4.8 2.4 3.4 2.6 9.6 1.4 15.6l-3.2 16.6c-.6 2.4-2.6 3-3.8 1.2-2.4-3.8-3.4-10-3.8-16.4-.2-6.4-.2-13.6 1-17.8Z" },
];
export const BACK = [
  { m: "upback", f: "back", d: "M60 33.6h5.4l1.2 5.6c4.4 1.4 9 2.6 12.6 4.6-5.2 3-9.6 7.8-12.8 13.8-2.4 4.6-4.4 10.6-6.4 17.2Z" },
  { m: "delt_r", f: "shoulders", d: "M80.4 44.4c4.6 1 8.4 3.6 9.8 8.2 1 3.4 1.2 6.6.8 9.6-2.8-3.8-6.6-6.4-11.2-7.6-2.4-.6-3.4-2.4-2.6-4.6Z" },
  { m: "lats", f: "back", d: "M67.4 60.6c3-4 7.4-6.8 11.6-5.6 2.8 1.2 3.4 4.2 3 7.8-.6 6.4-2.4 13-5.6 18.6-3.4 6-8.4 10.4-14.4 13.4h-1v-24c1.6-3.8 3.6-7.4 6.4-10.2Z" },
  { m: "lowback", f: "back", d: "M61 97.4c4-1.8 7.6-4.2 10.4-7.2.8 4.6.6 9.6-.8 14.4-2.6.6-6 1-9.6 1.4Z" },
  { m: "triceps", f: "arms", d: "M83.2 58.4c3.6 1 6.4 4 7.4 8.4l1.4 9.6c.4 3.4-.8 5.8-2.8 6.2-2.4-3.8-4.4-9.4-5.6-15.4Z" },
  { m: "forearm", f: "arms", d: "M90.4 87.6c3.4 4.4 5.4 10.4 5.6 17.4.2 3-1 4.8-2.6 4.8-2.4-5-4.4-10.8-5.4-17Z" },
  { m: "glutes", f: "glutes", d: "M61 108.4c5.8-1 11.4-1.4 15.6.6 3.6 1.8 5 6.2 4.6 11.2-.4 5-3.6 8.6-8.4 9.2-4.6.6-9.2-.6-11.8-3.4Z" },
  { m: "hams", f: "hams", d: "M64.4 132c4.2-1 9.6-.8 13.6 1.2 2.6 1.4 3 4.4 2.4 8-1 6-2.8 11.6-5.2 15.6-1.6 2.6-4.6 2.8-6.6.4-2.6-3-4-8.6-4.4-14.6-.2-4.4-.4-8 .2-10.6Z" },
  { m: "calves", f: "calves", d: "M68.2 164.6c2.8-2.2 6.4-2 8.8.8 2.6 3.2 2.8 8.8 1.4 14l-2.6 9.6c-.8 2.6-2.8 3.2-4.4 1.4-2.6-3-4-8.4-4.4-13.6-.2-4.6 0-9.4 1.2-12.2Z" },
];
export const SILHOUETTE = { head: HEAD, body: SIL };
// The figure as an SVG string. col(f) = fill of a family's plates (null = the neutral plate colour).
export function bodySvg(side, { base, plate, gap, col = () => null, clip, x = 0, only = false } = {}) {
  const parts = (side === "back" ? BACK : FRONT).filter(p => !only || col(p));
  const half = `<path d="${HEAD} Z" /><path d="${SIL} Z" />`;
  const plates = parts.map(p => `<path data-fam="${p.f}" data-m="${p.m}" d="${p.d}" fill="${col(p) || plate}" />`).join("");
  return `<g transform="translate(${x} 0)"><g fill="${base}" stroke="${base}" stroke-width="1.2" stroke-linejoin="round">${half}<g transform="translate(120 0) scale(-1 1)">${half}</g></g>`
    + `<g stroke="${gap}" stroke-width=".9" stroke-linejoin="round">${plates}<g transform="translate(120 0) scale(-1 1)">${plates}</g></g></g>`;
}

// Muscle icons: which side, which plates light up and the crop (viewBox) for each muscle of src/exlib.js.
const CROP = { torso: "20 24 80 80", back: "18 26 84 84", low: "26 64 68 68", arm: "60 40 46 46", fore: "66 74 44 44", core: "26 50 68 68", thigh: "24 98 72 72", hip: "26 88 68 68", ham: "26 112 68 68", shin: "28 146 64 68" };
export const MUSCLE_ICON = {
  chest: ["front", ["chest"], "torso"], delt_f: ["front", ["delt"], "torso"], delt_s: ["front", ["delt"], "torso"], delt_r: ["back", ["delt_r"], "torso"],
  lats: ["back", ["lats"], "back"], upback: ["back", ["upback"], "back"], lowback: ["back", ["lowback"], "low"],
  biceps: ["arm", ["biceps"]], triceps: ["arm", ["triceps"]], forearm: ["arm", ["forearm"]],
  abs: ["front", ["abs"], "core"], obl: ["front", ["obl"], "core"], quads: ["front", ["quads"], "thigh"], adduct: ["front", ["quads"], "thigh"],
  hams: ["back", ["hams"], "ham"], glutes: ["back", ["glutes"], "hip"], abduct: ["back", ["glutes"], "hip"], calves: ["back", ["calves"], "shin"], tib: ["front", ["tib"], "shin"],
};
// push / pull / legs / core chips
export const TYPE_ICON = {
  push: ["front", ["chest", "delt"], "torso"], pull: ["back", ["lats", "upback"], "back"], legs: ["front", ["quads"], "thigh"], core: ["front", ["abs", "obl"], "core"],
};
export const FAMILY_ICON = {
  chest: ["front", ["chest"], "torso"], back: ["back", ["upback", "lats", "lowback"], "back"], shoulders: ["front", ["delt"], "torso"],
  arms: ["arm", ["biceps", "triceps", "forearm"]], quads: ["front", ["quads"], "thigh"], hams: ["back", ["hams"], "ham"],
  glutes: ["back", ["glutes"], "hip"], calves: ["back", ["calves"], "shin"], core: ["front", ["abs", "obl"], "core"],
};
export const iconKey = m => (MUSCLE_ICON[m] ? MUSCLE_ICON[m].join("|") : m); // same picture = one icon
// Arms get their own picture (a flexed arm seen from the front), the body crop is too thin for them.
const ARM_SIL = "M3 17.5C8 14 13.5 13.4 17.6 14.2C22.6 10.6 28.8 11.4 31.6 17L33.4 10.6C33.6 6 36 3.2 40 3.2C44.2 3.2 46.6 6.4 45.6 10.6L42.4 29.4C41.6 34.6 37 38 30.6 37.6L10.4 35.4C5.6 34.8 2.6 31.6 2.6 27.4Z";
const ARM = [
  { m: "biceps", d: "M7.6 18.6C13.4 14.2 23.4 12.4 28.6 18.4C26.8 22.8 19.6 24.6 12.4 23.8C8.8 23.4 7.2 21.2 7.6 18.6Z" },
  { m: "triceps", d: "M9.4 28.2C17.6 27.6 26.4 29 32.8 31.8C30.8 35.2 22.8 35.6 14.2 34C10.4 33.2 8.6 30.8 9.4 28.2Z" },
  { m: "forearm", d: "M35.6 13.2C37.6 11 41.6 11 43 13.4L39.6 28.6C38 30 35.6 29.4 34.8 27.4Z" },
];
// simple = only the silhouette + the lit muscle (clean at 16–24 px); else every plate (bigger pictures)
export function muscleIconSvg(spec, { base, plate, gap, hi, simple = true }) {
  const [side, on, crop] = spec;
  if (side === "arm") return { viewBox: "0 0 48 41", html: `<path d="${ARM_SIL}" fill="${base}" />` + ARM.filter(p => !simple || on.includes(p.m)).map(p => `<path data-m="${p.m}" d="${p.d}" fill="${on.includes(p.m) ? hi : plate}" stroke="${gap}" stroke-width=".9" />`).join("") };
  return { viewBox: CROP[crop], html: bodySvg(side, { base, plate, gap, only: simple, col: p => (on.includes(p.m) ? hi : null) }) };
}
