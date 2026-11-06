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
  // 1.9.0: new bodyweight exercises. Estimates on the same scale as above (Bronze comes in the first weeks, Diamond
  // is very strong, Obsidian a challenge); re-fit from real users later. Per side/leg for one-sided ones.
  bw_calf_raise: [20, 30, 40, 50, 60, 70, 80, 120], bw_single_leg_calf_raise: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_tibialis_raise: [15, 20, 25, 30, 40, 50, 60, 100], bw_side_lying_leg_raise: [15, 20, 25, 30, 40, 50, 60, 100],
  bw_side_lying_adductor_raise: [12, 15, 20, 25, 30, 40, 50, 80], bw_short_lever_copenhagen_plank: [15, 20, 30, 40, 50, 60, 75, 120],
  bw_copenhagen_plank: [10, 15, 20, 30, 40, 50, 60, 90], bw_side_plank: [20, 30, 45, 60, 75, 90, 120, 240],
  bw_knee_side_plank: [20, 30, 45, 60, 75, 90, 120, 180], bw_plank_shoulder_tap: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_reverse_crunch: [10, 15, 20, 25, 30, 35, 40, 60], bw_prone_back_extension: [12, 15, 20, 25, 30, 40, 50, 80],
  bw_single_leg_romanian_deadlift: [8, 10, 12, 15, 18, 21, 25, 40], bw_single_leg_hip_thrust: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_nordic_hamstring_curl: [1, 2, 3, 5, 7, 9, 12, 20], bw_bodyweight_squat: [20, 30, 40, 50, 60, 75, 90, 150],
  bw_split_squat: [10, 15, 20, 25, 30, 35, 40, 60], bw_step_up: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_lateral_lunge: [8, 12, 16, 20, 25, 30, 35, 50], bw_pistol_squat_to_box: [3, 5, 8, 10, 12, 15, 20, 30],
  bw_wall_push_up: [15, 25, 35, 45, 55, 65, 80, 120], bw_decline_push_up: [8, 12, 18, 25, 30, 35, 40, 60],
  bw_archer_push_up: [3, 5, 7, 10, 12, 14, 16, 25], bw_scapular_push_up: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_wall_handstand_hold: [10, 15, 20, 30, 45, 60, 90, 180], bw_chair_dip: [10, 15, 20, 25, 30, 35, 40, 60],
  bw_bodyweight_triceps_extension: [8, 12, 16, 20, 25, 30, 35, 50], bw_inverted_row_table: [6, 10, 14, 18, 22, 26, 30, 45],
  bw_prone_reverse_snow_angel: [8, 10, 12, 15, 18, 21, 25, 40],
  fw_pull_up: [1, 3, 6, 10, 13, 16, 20, 30], fw_chin_up: [2, 4, 7, 11, 14, 17, 21, 32],
  fw_dead_hang: [20, 30, 45, 60, 75, 90, 120, 180], fw_hanging_knee_raise: [5, 8, 12, 15, 18, 21, 25, 40],
  mx_captain_s_chair_knee_raise: [5, 8, 12, 15, 18, 21, 25, 40],
};
// The exercises of each type: push, pull, legs, core (the card game's four suits).
export const EX_GROUPS = [
  ["k1", "k3", "r1", "kIncl", "kKnee", "r1e", "k3e"],
  ["row1", "row2", "row3", "superman", "ytw"],
  ["n1", "n2", "n7", "lunge", "bridge", "wallsit", "sbridge", "n1q"],
  ["b5", "b2", "b4", "birddog", "hollow", "legraise", "b5l"],
];
export const rankIndex = (id, best) => { const at = RANK_AT[id]; if (!at || best === null || best === undefined || isNaN(best)) return 0; let r = 0; at.forEach((v, i) => { if (best >= v) r = i + 1; }); return r; };
