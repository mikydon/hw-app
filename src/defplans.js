// 1.10.0 (Michael, Nov 14: "put the default plans into the Library, so there are some already and people can star
// them"): HW App's own plans in the Library. CI writes them to Firestore as pub/hwapp_<k> (owner "hwapp", which is
// never a real account), so they are saved, counted and starred like anyone's. The app shows the name in the user's
// language (text plDef_<k>); `name` is the English fallback. Change this list = the next push updates the Library
// (.github/scripts/seed-library.mjs); the save and star counters are never touched. Sets follow the app's program
// (3 rounds; ACSM 2026: every muscle 2+ days a week, about 10 sets a week for growth).
export const DEF_OWNER = "hwapp", DEF_NICK = "HW App";
export const DEF_PLANS = [
  // the Recommended A/B/C days, as plans of their own
  { k: "a", name: "Home full body A", items: [["k1", 3], ["row1", 3], ["n1", 3], ["b5", 3]] },
  { k: "b", name: "Home full body B", items: [["r1", 3], ["row2", 3], ["n2", 3], ["b2", 3]] },
  { k: "c", name: "Home full body C", items: [["k3", 3], ["row3", 3], ["n7", 3], ["b4", 3]] },
  { k: "start", name: "First steps", items: [["kIncl", 3], ["row1", 3], ["bw_bodyweight_squat", 3], ["bridge", 3], ["b5", 2]] },
  { k: "core", name: "Core in 10 minutes", items: [["b5", 2], ["birddog", 2], ["hollow", 2], ["bw_side_plank", 2], ["bw_reverse_crunch", 2]] },
  { k: "legs", name: "Legs and glutes at home", items: [["n1", 3], ["bw_split_squat", 3], ["bw_single_leg_hip_thrust", 3], ["bw_calf_raise", 3], ["wallsit", 2]] },
  { k: "db", name: "Dumbbell full body", items: [["fw_goblet_squat", 3], ["fw_dumbbell_bench_press", 3], ["fw_one_arm_dumbbell_row", 3], ["fw_dumbbell_shoulder_press", 3], ["fw_dumbbell_romanian_deadlift", 3]] },
  { k: "dbup", name: "Dumbbell upper body", items: [["fw_dumbbell_bench_press", 3], ["fw_one_arm_dumbbell_row", 3], ["fw_dumbbell_shoulder_press", 3], ["fw_dumbbell_lateral_raise", 2], ["fw_dumbbell_biceps_curl", 2], ["fw_dumbbell_overhead_triceps_extension", 2]] },
  { k: "bar", name: "Pull-up bar", items: [["fw_pull_up", 3], ["fw_chin_up", 2], ["fw_hanging_knee_raise", 3], ["fw_dead_hang", 2]] },
  { k: "push", name: "Gym push", items: [["mc_chest_press_machine", 3], ["mc_shoulder_press_machine", 3], ["mc_pec_deck_cable_fly", 2], ["mc_cable_lateral_raise", 3], ["mc_cable_triceps_pushdown", 3]] },
  { k: "pull", name: "Gym pull", items: [["mc_lat_pulldown", 3], ["mc_seated_cable_row", 3], ["mc_cable_face_pull", 3], ["mc_reverse_pec_deck", 2], ["mc_cable_biceps_curl", 3]] },
  { k: "glegs", name: "Gym legs", items: [["mc_leg_press", 3], ["mc_lying_leg_curl", 3], ["mc_leg_extension", 3], ["mc_hip_thrust_machine", 3], ["mc_standing_calf_raise_machine", 3]] },
].map(p => ({ ...p, items: p.items.map(([id, sets]) => ({ id, sets })) }));
export const isDefOwner = o => o === DEF_OWNER;
