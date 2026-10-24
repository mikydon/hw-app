// Exercise ranks (1.8.0): the best set an exercise needs for Bronze, Silver, Gold, Platinum, Emerald, Amethyst, Diamond
// and Obsidian (Iron = done at all). Times are seconds. Shared by the app (src/App.jsx) and the push server
// (worker/index.js → src/fair.js), which checks the world leaderboard with these numbers.
export const RANK_AT = {
  k1: [10, 18, 25, 35, 40, 45, 50, 80], k3: [8, 12, 18, 25, 28, 32, 35, 55], r1: [8, 12, 16, 22, 25, 27, 30, 45],
  row1: [10, 14, 18, 24, 26, 28, 30, 45], row2: [8, 12, 16, 20, 23, 25, 28, 40], row3: [10, 14, 18, 24, 26, 28, 30, 45],
  n1: [12, 18, 25, 35, 40, 45, 50, 100], n2: [8, 12, 16, 20, 23, 27, 30, 45], n7: [6, 10, 14, 18, 20, 23, 25, 40],
  b5: [30, 45, 60, 90, 120, 150, 180, 600], b2: [8, 12, 15, 20, 23, 27, 30, 50], b4: [12, 16, 20, 30, 33, 37, 40, 70],
  kKnee: [15, 20, 30, 40, 50, 60, 70, 100], kIncl: [15, 20, 30, 40, 50, 60, 70, 100], superman: [15, 20, 25, 30, 40, 50, 60, 100],
  ytw: [8, 10, 12, 15, 18, 21, 25, 40], lunge: [12, 15, 20, 25, 30, 35, 40, 60], bridge: [20, 25, 30, 40, 50, 60, 70, 100],
  r1e: [6, 8, 10, 12, 15, 18, 20, 30], k3e: [6, 10, 14, 18, 22, 26, 30, 45], n1q: [8, 12, 15, 20, 25, 30, 35, 50],
  b5l: [30, 45, 60, 75, 90, 105, 120, 300], sbridge: [8, 12, 15, 20, 25, 30, 35, 50], wallsit: [45, 60, 90, 120, 150, 180, 240, 600],
  birddog: [12, 15, 20, 25, 30, 35, 40, 60], hollow: [30, 45, 60, 75, 90, 105, 120, 300], legraise: [12, 15, 20, 25, 30, 35, 40, 60],
};
// The exercises of each type: push, pull, legs, core (the card game's four suits).
export const EX_GROUPS = [
  ["k1", "k3", "r1", "kIncl", "kKnee", "r1e", "k3e"],
  ["row1", "row2", "row3", "superman", "ytw"],
  ["n1", "n2", "n7", "lunge", "bridge", "wallsit", "sbridge", "n1q"],
  ["b5", "b2", "b4", "birddog", "hollow", "legraise", "b5l"],
];
export const rankIndex = (id, best) => { const at = RANK_AT[id]; if (!at || best === null || best === undefined || isNaN(best)) return 0; let r = 0; at.forEach((v, i) => { if (best >= v) r = i + 1; }); return r; };
