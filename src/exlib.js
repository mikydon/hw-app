// Exercise library (1.9.0): what every exercise is, for plans, the exercise list, weights and ranks.
// Names, aliases, how-to texts and tips live in the locales (ex.<id>; aliases in src/i18n/exnames.js).
//
// t     type: push | pull | legs | core (the four kinds every recommended day trains; also the plan hints)
// g     main body-part group for the list: chest back shoulders arms legs glutes calves core
//       (one group only, the search finds the rest)
// eq    equipment: none (bodyweight; a chair, table, door, towel or wall is fine) | free (dumbbell,
//       kettlebell, bar, band) | machine (machines, cables, Smith machine)
// k     kind of logging:
//         r = reps                 t = hold time in seconds (durs = presets)
//         w = kg × reps (load: each = per dumbbell, one = the one weight or the whole bar, stack = machine setting)
//         a = assisted machine: kg of help × reps (less help = harder)
//         c = carry: kg × seconds (load as for w)
//         e = reps by effort (towel, band): counted, never ranked
// u     unit: "" | arm | leg (all reps one side, then the other) | side (alternating)
// d     difficulty chip: easy | mid | hard
// m, s  muscles: main and helping (codes below); a plan counts main muscles as 1 set, helping ones as ½
// fig   true = has a stick figure (only the 27 exercises from before 1.9.0)
//
// bw    part of the body weight that is lifted too (45° back extension: the upper body), for the set score
//
// Ranks: bodyweight exercises use RANK_AT in src/ranks.js (best set: reps, or seconds). Free weights use
// W_RANK: the set score (wSetScore, an Epley-style strength estimate) ÷ body weight, by sex. Machines
// (eq machine) and effort moves have no ranks: machines differ from gym to gym, so they only compare with
// your own last time (records).
export const MUSCLES = ["chest", "delt_f", "delt_s", "delt_r", "lats", "upback", "lowback", "biceps", "triceps", "forearm",
  "quads", "hams", "glutes", "abduct", "adduct", "calves", "tib", "abs", "obl"];

const X = (t, g, eq, k, u, d, m, s = [], o = {}) => ({ t, g, eq, k, u, d, m, s, ...o });
const H = durs => ({ durs, dur: durs[Math.min(1, durs.length - 1)] });

export const LIB = {
  // ── before 1.9.0 (the 27 with stick figures) ──
  k1: X("push", "chest", "none", "r", "", "mid", ["chest", "triceps"], ["delt_f", "abs"], { fig: true }),
  k3: X("push", "arms", "none", "r", "", "mid", ["triceps", "chest"], ["delt_f"], { fig: true }),
  r1: X("push", "shoulders", "none", "r", "", "mid", ["delt_f", "triceps"], ["delt_s", "upback"], { fig: true }),
  kIncl: X("push", "chest", "none", "r", "", "easy", ["chest", "triceps"], ["delt_f"], { fig: true }),
  kKnee: X("push", "chest", "none", "r", "", "easy", ["chest", "triceps"], ["delt_f"], { fig: true }),
  r1e: X("push", "shoulders", "none", "r", "", "hard", ["delt_f", "triceps"], ["delt_s", "upback"], { fig: true }),
  k3e: X("push", "arms", "none", "r", "", "hard", ["triceps", "chest"], ["delt_f"], { fig: true }),
  row1: X("pull", "back", "none", "r", "arm", "mid", ["lats", "upback"], ["biceps", "delt_r", "forearm"], { fig: true }),
  row2: X("pull", "back", "none", "r", "", "mid", ["upback", "lats"], ["biceps", "forearm"], { fig: true }),
  row3: X("pull", "back", "none", "r", "arm", "mid", ["delt_r", "upback"], ["biceps"], { fig: true }),
  superman: X("pull", "back", "none", "r", "", "easy", ["lowback", "glutes"], ["upback", "delt_r", "hams"], { fig: true }),
  ytw: X("pull", "back", "none", "r", "", "easy", ["upback", "delt_r"], ["lowback"], { fig: true }),
  n1: X("legs", "legs", "none", "r", "", "mid", ["quads", "glutes"], ["adduct", "calves"], { fig: true }),
  n2: X("legs", "legs", "none", "r", "leg", "mid", ["quads", "glutes"], ["adduct", "hams"], { fig: true }),
  n7: X("legs", "legs", "none", "r", "", "mid", ["hams"], ["glutes", "calves"], { fig: true }),
  lunge: X("legs", "legs", "none", "r", "leg", "mid", ["quads", "glutes"], ["adduct", "hams"], { fig: true }),
  bridge: X("legs", "glutes", "none", "r", "", "easy", ["glutes"], ["hams"], { fig: true }),
  wallsit: X("legs", "legs", "none", "t", "", "mid", ["quads"], ["glutes"], { fig: true }),
  sbridge: X("legs", "glutes", "none", "r", "leg", "hard", ["glutes"], ["hams", "abs"], { fig: true }),
  n1q: X("legs", "legs", "none", "r", "", "hard", ["quads", "glutes"], ["adduct"], { fig: true }),
  b5: X("core", "core", "none", "t", "", "mid", ["abs"], ["obl", "glutes", "delt_f"], { fig: true }),
  b2: X("core", "core", "none", "r", "side", "mid", ["abs"], ["obl"], { fig: true }),
  b4: X("core", "core", "none", "r", "side", "mid", ["obl", "abs"], [], { fig: true }),
  birddog: X("core", "core", "none", "r", "side", "easy", ["lowback", "abs"], ["glutes", "delt_r"], { fig: true }),
  hollow: X("core", "core", "none", "t", "", "mid", ["abs"], ["obl"], { fig: true }),
  legraise: X("core", "core", "none", "r", "", "mid", ["abs"], ["obl"], { fig: true }),
  b5l: X("core", "core", "none", "t", "", "hard", ["abs"], ["obl", "glutes"], { fig: true }),

  // ── bodyweight (new in 1.9.0) ──
  bw_calf_raise: X("legs", "calves", "none", "r", "", "easy", ["calves"]),
  bw_single_leg_calf_raise: X("legs", "calves", "none", "r", "leg", "mid", ["calves"]),
  bw_tibialis_raise: X("legs", "calves", "none", "r", "", "easy", ["tib"]),
  bw_side_lying_leg_raise: X("legs", "glutes", "none", "r", "leg", "easy", ["abduct"], ["glutes"]),
  bw_side_lying_adductor_raise: X("legs", "legs", "none", "r", "leg", "easy", ["adduct"]),
  bw_short_lever_copenhagen_plank: X("core", "legs", "none", "t", "leg", "mid", ["adduct"], ["obl"], H([15, 20, 30, 45])),
  bw_copenhagen_plank: X("core", "legs", "none", "t", "leg", "hard", ["adduct"], ["obl", "abs"], H([10, 15, 20, 30])),
  bw_side_plank: X("core", "core", "none", "t", "side", "mid", ["obl"], ["abs", "abduct"], H([20, 30, 45, 60])),
  bw_knee_side_plank: X("core", "core", "none", "t", "side", "easy", ["obl"], ["abs"], H([20, 30, 45])),
  bw_plank_shoulder_tap: X("core", "core", "none", "r", "side", "mid", ["abs", "obl"], ["delt_f", "chest"]),
  bw_reverse_crunch: X("core", "core", "none", "r", "", "easy", ["abs"], ["obl"]),
  bw_prone_back_extension: X("pull", "back", "none", "r", "", "easy", ["lowback"], ["glutes", "upback"]),
  bw_single_leg_romanian_deadlift: X("legs", "legs", "none", "r", "leg", "mid", ["hams", "glutes"], ["lowback", "abduct"]),
  bw_single_leg_hip_thrust: X("legs", "glutes", "none", "r", "leg", "mid", ["glutes"], ["hams"]),
  bw_nordic_hamstring_curl: X("legs", "legs", "none", "r", "", "hard", ["hams"], ["glutes", "calves"]),
  bw_bodyweight_squat: X("legs", "legs", "none", "r", "", "easy", ["quads", "glutes"], ["adduct"]),
  bw_split_squat: X("legs", "legs", "none", "r", "leg", "mid", ["quads", "glutes"], ["adduct"]),
  bw_step_up: X("legs", "legs", "none", "r", "leg", "easy", ["quads", "glutes"], ["calves"]),
  bw_lateral_lunge: X("legs", "legs", "none", "r", "side", "mid", ["adduct", "quads", "glutes"]),
  bw_pistol_squat_to_box: X("legs", "legs", "none", "r", "leg", "hard", ["quads", "glutes"], ["abduct", "abs"]),
  bw_wall_push_up: X("push", "chest", "none", "r", "", "easy", ["chest", "triceps"], ["delt_f"]),
  bw_decline_push_up: X("push", "chest", "none", "r", "", "hard", ["chest", "delt_f"], ["triceps"]),
  bw_archer_push_up: X("push", "chest", "none", "r", "side", "hard", ["chest", "triceps"], ["delt_f"]),
  bw_scapular_push_up: X("push", "shoulders", "none", "r", "", "easy", ["upback"], ["chest"]),
  bw_wall_handstand_hold: X("push", "shoulders", "none", "t", "", "hard", ["delt_f"], ["triceps", "upback", "abs"], H([10, 20, 30, 45, 60])),
  bw_chair_dip: X("push", "arms", "none", "r", "", "mid", ["triceps"], ["chest", "delt_f"]),
  bw_bodyweight_triceps_extension: X("push", "arms", "none", "r", "", "mid", ["triceps"], ["abs"]),
  bw_inverted_row_table: X("pull", "back", "none", "r", "", "mid", ["lats", "upback"], ["biceps", "delt_r"]),
  bw_prone_reverse_snow_angel: X("pull", "back", "none", "r", "", "easy", ["upback", "delt_r"], ["lowback"]),
  bw_towel_biceps_curl: X("pull", "arms", "none", "e", "arm", "easy", ["biceps"], ["forearm"]),

  // ── free weights, bar and bands ──
  fw_pull_up: X("pull", "back", "free", "r", "", "hard", ["lats", "upback"], ["biceps", "forearm", "abs"]),
  fw_chin_up: X("pull", "back", "free", "r", "", "hard", ["lats", "biceps"], ["upback", "forearm"]),
  fw_dead_hang: X("pull", "back", "free", "t", "", "easy", ["forearm"], ["lats"], H([15, 30, 45, 60])),
  fw_hanging_knee_raise: X("core", "core", "free", "r", "", "mid", ["abs"], ["obl", "forearm"]),
  fw_dumbbell_bench_press: X("push", "chest", "free", "w", "", "mid", ["chest", "triceps"], ["delt_f"], { load: "each" }),
  fw_dumbbell_shoulder_press: X("push", "shoulders", "free", "w", "", "mid", ["delt_f", "triceps"], ["delt_s"], { load: "each" }),
  fw_dumbbell_lateral_raise: X("push", "shoulders", "free", "w", "", "easy", ["delt_s"], ["upback"], { load: "each" }),
  fw_dumbbell_overhead_triceps_extension: X("push", "arms", "free", "w", "", "mid", ["triceps"], [], { load: "one" }),
  fw_lying_triceps_extension: X("push", "arms", "free", "w", "", "mid", ["triceps"], [], { load: "one" }),
  fw_one_arm_dumbbell_row: X("pull", "back", "free", "w", "arm", "mid", ["lats", "upback"], ["biceps", "delt_r"], { load: "one" }),
  fw_dumbbell_reverse_fly: X("pull", "shoulders", "free", "w", "", "easy", ["delt_r", "upback"], [], { load: "each" }),
  fw_band_pull_apart: X("pull", "shoulders", "free", "e", "", "easy", ["delt_r", "upback"]),
  fw_dumbbell_biceps_curl: X("pull", "arms", "free", "w", "", "easy", ["biceps"], ["forearm"], { load: "each" }),
  fw_goblet_squat: X("legs", "legs", "free", "w", "", "mid", ["quads", "glutes"], ["adduct", "abs"], { load: "one" }),
  fw_dumbbell_romanian_deadlift: X("legs", "legs", "free", "w", "", "mid", ["hams", "glutes"], ["lowback", "forearm"], { load: "each" }),
  fw_dumbbell_bulgarian_split_squat: X("legs", "legs", "free", "w", "leg", "hard", ["quads", "glutes"], ["adduct", "forearm"], { load: "each" }),
  fw_dumbbell_hip_thrust: X("legs", "glutes", "free", "w", "", "mid", ["glutes"], ["hams"], { load: "one" }),
  fw_kettlebell_swing: X("legs", "glutes", "free", "w", "", "mid", ["glutes", "hams"], ["lowback", "forearm"], { load: "one" }),
  fw_single_leg_dumbbell_calf_raise: X("legs", "calves", "free", "w", "leg", "mid", ["calves"], [], { load: "one" }),
  fw_farmer_s_carry: X("core", "core", "free", "c", "", "mid", ["forearm", "upback"], ["abs", "obl"], { load: "each", durs: [20, 30, 45, 60], dur: 30 }),
  fw_suitcase_carry: X("core", "core", "free", "c", "side", "mid", ["obl", "forearm"], ["abs", "upback"], { load: "one", durs: [20, 30, 45, 60], dur: 30 }),
  fw_band_pallof_press: X("core", "core", "free", "e", "side", "easy", ["obl", "abs"]),

  // ── machines and cables ──
  mc_leg_press: X("legs", "legs", "machine", "w", "", "easy", ["quads", "glutes"], ["adduct"], { load: "stack" }),
  mc_hack_squat: X("legs", "legs", "machine", "w", "", "mid", ["quads"], ["glutes", "adduct"], { load: "stack" }),
  mc_leg_extension: X("legs", "legs", "machine", "w", "", "easy", ["quads"], [], { load: "stack" }),
  mc_lying_leg_curl: X("legs", "legs", "machine", "w", "", "easy", ["hams"], ["calves"], { load: "stack" }),
  mc_seated_leg_curl: X("legs", "legs", "machine", "w", "", "easy", ["hams"], [], { load: "stack" }),
  mc_hip_thrust_machine: X("legs", "glutes", "machine", "w", "", "easy", ["glutes"], ["hams"], { load: "stack" }),
  mc_hip_abduction_machine: X("legs", "glutes", "machine", "w", "", "easy", ["abduct"], ["glutes"], { load: "stack" }),
  mc_hip_adduction_machine: X("legs", "legs", "machine", "w", "", "easy", ["adduct"], [], { load: "stack" }),
  mc_standing_calf_raise_machine: X("legs", "calves", "machine", "w", "", "easy", ["calves"], [], { load: "stack" }),
  mc_seated_calf_raise_machine: X("legs", "calves", "machine", "w", "", "easy", ["calves"], [], { load: "stack" }),
  mc_lat_pulldown: X("pull", "back", "machine", "w", "", "easy", ["lats"], ["biceps", "upback"], { load: "stack" }),
  mc_assisted_pull_up_machine: X("pull", "back", "machine", "a", "", "easy", ["lats"], ["biceps", "upback"], { load: "stack" }),
  mc_seated_cable_row: X("pull", "back", "machine", "w", "", "easy", ["upback", "lats"], ["biceps", "delt_r"], { load: "stack" }),
  mc_reverse_pec_deck: X("pull", "shoulders", "machine", "w", "", "easy", ["delt_r"], ["upback"], { load: "stack" }),
  mc_cable_face_pull: X("pull", "shoulders", "machine", "w", "", "easy", ["delt_r", "upback"], [], { load: "stack" }),
  mc_cable_biceps_curl: X("pull", "arms", "machine", "w", "", "easy", ["biceps"], ["forearm"], { load: "stack" }),
  mc_chest_press_machine: X("push", "chest", "machine", "w", "", "easy", ["chest", "triceps"], ["delt_f"], { load: "stack" }),
  mc_pec_deck_cable_fly: X("push", "chest", "machine", "w", "", "easy", ["chest"], ["delt_f"], { load: "stack" }),
  mc_shoulder_press_machine: X("push", "shoulders", "machine", "w", "", "easy", ["delt_f", "triceps"], ["delt_s"], { load: "stack" }),
  mc_cable_lateral_raise: X("push", "shoulders", "machine", "w", "arm", "easy", ["delt_s"], [], { load: "stack" }),
  mc_cable_triceps_pushdown: X("push", "arms", "machine", "w", "", "easy", ["triceps"], [], { load: "stack" }),
  mc_cable_crunch: X("core", "core", "machine", "w", "", "mid", ["abs"], ["obl"], { load: "stack" }),
  mc_45_back_extension: X("pull", "back", "machine", "w", "", "easy", ["lowback", "glutes"], ["hams"], { load: "one", bw: 0.5 }),
  mx_machine_row: X("pull", "back", "machine", "w", "", "easy", ["upback", "lats"], ["biceps", "delt_r"], { load: "stack" }),
  mx_chest_supported_row: X("pull", "back", "machine", "w", "", "easy", ["upback", "lats"], ["biceps", "delt_r"], { load: "stack" }),
  mx_t_bar_row: X("pull", "back", "machine", "w", "", "mid", ["upback", "lats"], ["biceps", "lowback", "hams"], { load: "stack" }),
  mx_assisted_dip_machine: X("push", "arms", "machine", "a", "", "easy", ["triceps", "chest"], ["delt_f"], { load: "stack" }),
  mx_machine_preacher_curl: X("pull", "arms", "machine", "w", "", "easy", ["biceps"], ["forearm"], { load: "stack" }),
  mx_machine_lateral_raise: X("push", "shoulders", "machine", "w", "", "easy", ["delt_s"], [], { load: "stack" }),
  mx_ab_crunch_machine: X("core", "core", "machine", "w", "", "easy", ["abs"], ["obl"], { load: "stack" }),
  mx_machine_glute_kickback: X("legs", "glutes", "machine", "w", "leg", "easy", ["glutes"], ["hams"], { load: "stack" }),
  mx_reverse_hyperextension: X("legs", "glutes", "machine", "w", "", "mid", ["glutes", "hams"], ["lowback"], { load: "stack" }),
  mx_belt_squat: X("legs", "legs", "machine", "w", "", "mid", ["quads", "glutes"], ["adduct"], { load: "stack" }),
  mx_leg_press_calf_raise: X("legs", "calves", "machine", "w", "", "easy", ["calves"], [], { load: "stack" }),
  mx_captain_s_chair_knee_raise: X("core", "core", "machine", "r", "", "mid", ["abs"], ["obl"]),
  mx_wide_grip_lat_pulldown: X("pull", "back", "machine", "w", "", "easy", ["lats"], ["upback", "delt_r", "biceps"], { load: "stack" }),
  mx_close_grip_lat_pulldown: X("pull", "back", "machine", "w", "", "easy", ["lats"], ["biceps", "upback"], { load: "stack" }),
  mx_straight_arm_pulldown: X("pull", "back", "machine", "w", "", "easy", ["lats"], ["triceps", "abs"], { load: "stack" }),
  mx_single_arm_cable_row: X("pull", "back", "machine", "w", "arm", "easy", ["lats", "upback"], ["biceps", "obl"], { load: "stack" }),
  mx_cable_overhead_triceps_extension: X("push", "arms", "machine", "w", "", "easy", ["triceps"], [], { load: "stack" }),
  mx_rope_hammer_curl: X("pull", "arms", "machine", "w", "", "easy", ["biceps", "forearm"], [], { load: "stack" }),
  mx_cable_rear_delt_fly: X("pull", "shoulders", "machine", "w", "", "easy", ["delt_r"], ["upback"], { load: "stack" }),
  mx_cable_front_raise: X("push", "shoulders", "machine", "w", "", "easy", ["delt_f"], ["chest"], { load: "stack" }),
  mx_incline_cable_fly: X("push", "chest", "machine", "w", "", "easy", ["chest"], ["delt_f"], { load: "stack" }),
  mx_cable_kickback: X("legs", "glutes", "machine", "w", "leg", "easy", ["glutes"], ["hams"], { load: "stack" }),
  mx_cable_pull_through: X("legs", "glutes", "machine", "w", "", "easy", ["glutes", "hams"], ["lowback"], { load: "stack" }),
  mx_cable_hip_abduction: X("legs", "glutes", "machine", "w", "leg", "easy", ["abduct"], ["glutes"], { load: "stack" }),
  mx_cable_hip_adduction: X("legs", "legs", "machine", "w", "leg", "easy", ["adduct"], [], { load: "stack" }),
  mx_cable_woodchop: X("core", "core", "machine", "w", "side", "easy", ["obl"], ["abs", "delt_f"], { load: "stack" }),
  mx_half_kneeling_pallof_press: X("core", "core", "machine", "w", "side", "easy", ["obl", "abs"], ["glutes"], { load: "stack" }),
  mx_smith_machine_squat: X("legs", "legs", "machine", "w", "", "mid", ["quads", "glutes"], ["adduct"], { load: "stack" }),
  mx_smith_machine_bench_press: X("push", "chest", "machine", "w", "", "mid", ["chest", "triceps"], ["delt_f"], { load: "stack" }),
  mx_smith_machine_hip_thrust: X("legs", "glutes", "machine", "w", "", "mid", ["glutes"], ["hams"], { load: "stack" }),
  mx_smith_machine_romanian_deadlift: X("legs", "legs", "machine", "w", "", "mid", ["hams", "glutes"], ["lowback", "forearm"], { load: "stack" }),
  mx_smith_machine_split_squat: X("legs", "legs", "machine", "w", "leg", "mid", ["quads", "glutes"], ["adduct"], { load: "stack" }),
};

// Free-weight ranks: body-weight ratios at 5 levels (≈ stronger than 5 / 20 / 50 / 80 / 95 % of lifters), men | women.
// Source: strengthlevel.com standards (user-logged lifts, average man ~82 kg, woman ~68 kg), Nov 2026; reverse fly,
// lying triceps extension, hip thrust with one dumbbell, swing and carries are our estimates (the site's numbers
// mix one and two dumbbells there). Re-fit from real users later (Michael, Nov 1).
const SL = {
  fw_dumbbell_bench_press: [[0.21, 0.32, 0.46, 0.65, 0.84], [0.10, 0.19, 0.29, 0.44, 0.59]],
  fw_dumbbell_shoulder_press: [[0.16, 0.25, 0.37, 0.52, 0.67], [0.09, 0.15, 0.22, 0.31, 0.41]],
  fw_dumbbell_lateral_raise: [[0.06, 0.11, 0.19, 0.29, 0.42], [0.05, 0.08, 0.13, 0.19, 0.26]],
  fw_dumbbell_overhead_triceps_extension: [[0.06, 0.14, 0.25, 0.40, 0.57], [0.05, 0.10, 0.17, 0.26, 0.37]],
  fw_lying_triceps_extension: [[0.15, 0.27, 0.45, 0.66, 0.90], [0.10, 0.18, 0.30, 0.44, 0.60]],
  fw_one_arm_dumbbell_row: [[0.21, 0.33, 0.51, 0.72, 0.95], [0.13, 0.21, 0.32, 0.44, 0.59]],
  fw_dumbbell_reverse_fly: [[0.04, 0.08, 0.12, 0.18, 0.25], [0.03, 0.06, 0.09, 0.13, 0.18]],
  fw_dumbbell_biceps_curl: [[0.09, 0.16, 0.26, 0.38, 0.52], [0.06, 0.11, 0.18, 0.27, 0.37]],
  fw_goblet_squat: [[0.17, 0.31, 0.49, 0.72, 0.97], [0.15, 0.25, 0.39, 0.55, 0.73]],
  fw_dumbbell_romanian_deadlift: [[0.20, 0.33, 0.51, 0.72, 0.96], [0.15, 0.26, 0.41, 0.58, 0.78]],
  fw_dumbbell_bulgarian_split_squat: [[0.14, 0.24, 0.38, 0.56, 0.76], [0.10, 0.19, 0.30, 0.44, 0.61]],
  fw_dumbbell_hip_thrust: [[0.20, 0.35, 0.55, 0.75, 1.00], [0.15, 0.30, 0.45, 0.65, 0.85]],
  fw_kettlebell_swing: [[0.10, 0.20, 0.30, 0.40, 0.50], [0.10, 0.16, 0.24, 0.32, 0.40]],
  fw_single_leg_dumbbell_calf_raise: [[0.04, 0.11, 0.21, 0.34, 0.49], [0.04, 0.09, 0.16, 0.26, 0.37]],
  fw_farmer_s_carry: [[0.25, 0.40, 0.55, 0.75, 1.00], [0.15, 0.25, 0.35, 0.50, 0.70]],
  fw_suitcase_carry: [[0.20, 0.30, 0.45, 0.60, 0.80], [0.12, 0.20, 0.30, 0.40, 0.55]],
};
// 5 levels → the app's 8 rank steps (Bronze … Obsidian): beginner, novice, between, intermediate, between,
// advanced, elite, elite × 1.2 (the Obsidian challenge, like the bodyweight ones).
const r2 = x => Math.round(x * 100) / 100;
const to8 = ([b, n, i, a, e]) => [b, n, r2((n + i) / 2), i, r2((i + a) / 2), a, e, r2(e * 1.2)];
// Swings were measured as the weight for 10+ reps: their score at 10 reps is that × (1 + 10/30).
const SCALE = { fw_kettlebell_swing: 4 / 3 };
export const W_RANK = Object.fromEntries(Object.entries(SL).map(([id, [m, f]]) => [id, { m: to8(m).map(v => r2(v * (SCALE[id] || 1))), f: to8(f).map(v => r2(v * (SCALE[id] || 1))) }]));

// One number per weighted set, used for records AND ranks: an Epley-style strength estimate,
// kg × (1 + reps / 30), with reps counted up to 15 (beyond that the estimate drifts, and 15+ reps means it's time for
// more weight; the workout says so). Assisted machines: (body weight − help). Carries: kg × seconds / 30, up to 60 s
// (30 s = the weight itself). The rank tables are body-weight ratios of this number.
export const REP_CAP = 15;
export function wSetScore(id, reps, kg, bodyKg) {
  const x = LIB[id], n = Number(reps), k = Number(kg) || 0;
  if (!x || !(n > 0)) return 0;
  if (x.k === "c") return k * Math.min(n, 60) / 30;
  const load = x.k === "a" ? Math.max(1, (bodyKg || 75) - k) : k + (x.bw || 0) * (bodyKg || 75);
  return load * (1 + Math.min(n, REP_CAP) / 30);
}
// Rank index 0 (Iron) … 8 (Obsidian) from a body-weight ratio; sex "m" | "f" | other = between the two.
export function wRankAt(id, sex) {
  const t = W_RANK[id]; if (!t) return null;
  return sex === "f" ? t.f : sex === "m" ? t.m : t.m.map((v, i) => r2(Math.sqrt(v * t.f[i])));
}
export function wRankIndex(id, ratio, sex) {
  const at = wRankAt(id, sex); if (!at || !(ratio > 0)) return 0;
  let r = 0; at.forEach((v, i) => { if (ratio >= v - 1e-9) r = i + 1; }); return r;
}
export const GROUPS_ORDER = ["chest", "back", "shoulders", "arms", "legs", "glutes", "calves", "core"];
export const EQUIP_ORDER = ["none", "free", "machine"];
