import type { Equipment, Exercise, Muscle, Pattern } from './types';

// The built-in library. `start` is a deliberately cautious starting load as a
// fraction of body weight (per hand for dumbbells); `bw` is the share of body
// weight moved in a bodyweight exercise. Both are explained in RESEARCH.md §9.

interface Extra {
  unilateral?: boolean;
  timed?: boolean;
  bw?: number;
  start?: number;
}

function ex(
  id: string,
  name: string,
  equipment: Equipment,
  pattern: Pattern,
  primary: Muscle[],
  secondary: Muscle[],
  compound: boolean,
  tempo: number,
  setup: number,
  cues: string[],
  extra: Extra = {},
): Exercise {
  return {
    id, name, equipment, pattern, primary, secondary, compound, tempo, setup, cues,
    unilateral: extra.unilateral ?? false,
    ...(extra.timed ? { timed: true } : {}),
    ...(extra.bw != null ? { bw: extra.bw } : {}),
    ...(extra.start != null ? { start: extra.start } : {}),
  };
}

export const EXERCISES: Exercise[] = [
  // ── Dumbbell ───────────────────────────────────────────────────────────
  ex('db-bench-press', 'Dumbbell Bench Press', 'dumbbell', 'hpush', ['chest'], ['triceps', 'shoulders'], true, 3.5, 20,
    ['Shoulder blades pinned back and down.', 'Lower until elbows are just below the bench line.'], { start: 0.15 }),
  ex('db-incline-press', 'Incline Dumbbell Press', 'dumbbell', 'hpush', ['chest', 'shoulders'], ['triceps'], true, 3.5, 20,
    ['Bench at about 30°.', 'Press up and slightly in, wrists stacked over elbows.'], { start: 0.13 }),
  ex('db-shoulder-press', 'Dumbbell Shoulder Press', 'dumbbell', 'vpush', ['shoulders'], ['triceps'], true, 3.5, 15,
    ['Ribs down, glutes tight.', 'Press straight up without arching your back.'], { start: 0.1 }),
  ex('db-row', 'One-Arm Dumbbell Row', 'dumbbell', 'hpull', ['back'], ['biceps'], true, 3, 15,
    ['Flat back, hips square.', 'Pull your elbow toward your hip, not your shoulder.'], { unilateral: true, start: 0.18 }),
  ex('db-goblet-squat', 'Goblet Squat', 'dumbbell', 'squat', ['quads', 'glutes'], ['core'], true, 4, 12,
    ['Hold the weight close to your chest.', 'Sit between your heels, knees tracking over toes.'], { start: 0.2 }),
  ex('db-rdl', 'Dumbbell Romanian Deadlift', 'dumbbell', 'hinge', ['hamstrings', 'glutes'], ['back'], true, 4, 12,
    ['Push your hips back with soft knees.', 'Keep the weights close to your legs.'], { start: 0.18 }),
  ex('db-reverse-lunge', 'Dumbbell Reverse Lunge', 'dumbbell', 'lunge', ['quads', 'glutes'], ['hamstrings'], true, 3.5, 12,
    ['Step back far enough that both knees reach 90°.', 'Drive through the front heel to stand.'], { unilateral: true, start: 0.1 }),
  ex('db-bulgarian', 'Bulgarian Split Squat', 'dumbbell', 'lunge', ['quads', 'glutes'], ['hamstrings'], true, 4, 20,
    ['Back foot resting on the bench, laces down.', 'Lower straight down; front knee over mid-foot.'], { unilateral: true, start: 0.08 }),
  ex('db-curl', 'Dumbbell Biceps Curl', 'dumbbell', 'armIso', ['biceps'], ['forearms'], false, 3, 8,
    ['Elbows stay by your ribs.', 'Lower slowly — no swinging.'], { start: 0.07 }),
  ex('db-hammer-curl', 'Hammer Curl', 'dumbbell', 'armIso', ['biceps', 'forearms'], [], false, 3, 8,
    ['Palms face each other the whole time.'], { start: 0.07 }),
  ex('db-lateral-raise', 'Dumbbell Lateral Raise', 'dumbbell', 'upperIso', ['shoulders'], [], false, 3, 8,
    ['Lead with your elbows, soft bend in the arms.', 'Stop at shoulder height.'], { start: 0.035 }),
  ex('db-overhead-triceps', 'Overhead Triceps Extension', 'dumbbell', 'armIso', ['triceps'], [], false, 3, 10,
    ['Elbows point forward, close to your ears.', 'Move only at the elbow.'], { start: 0.1 }),
  ex('db-fly', 'Dumbbell Chest Fly', 'dumbbell', 'upperIso', ['chest'], ['shoulders'], false, 3.5, 20,
    ['Slight bend in the elbows, like hugging a tree.', 'Stop when your hands are level with your chest.'], { start: 0.08 }),
  ex('db-rear-fly', 'Dumbbell Rear Delt Fly', 'dumbbell', 'upperIso', ['shoulders'], ['back'], false, 3, 12,
    ['Hinge forward with a flat back.', 'Sweep the weights wide; squeeze between the shoulder blades.'], { start: 0.03 }),
  ex('db-hip-thrust', 'Dumbbell Hip Thrust', 'dumbbell', 'gluteIso', ['glutes'], ['hamstrings'], false, 3, 20,
    ['Upper back on the bench, chin tucked.', 'Pause at the top with ribs down.'], { start: 0.25 }),
  ex('db-calf-raise', 'Dumbbell Calf Raise', 'dumbbell', 'calves', ['calves'], [], false, 2.5, 8,
    ['Rise as high as you can; pause.', 'Lower all the way down.'], { start: 0.15 }),
  ex('db-farmer-carry', "Farmer's Carry", 'dumbbell', 'carry', ['forearms', 'core'], ['back', 'shoulders'], true, 1, 10,
    ['Stand tall, shoulders back.', 'Short, steady steps.'], { timed: true, start: 0.25 }),

  // ── Barbell ────────────────────────────────────────────────────────────
  ex('bb-back-squat', 'Barbell Back Squat', 'barbell', 'squat', ['quads', 'glutes'], ['hamstrings', 'core'], true, 4.5, 25,
    ['Brace before you descend.', 'Hips and chest rise together.'], { start: 0.5 }),
  ex('bb-front-squat', 'Barbell Front Squat', 'barbell', 'squat', ['quads'], ['glutes', 'core'], true, 4.5, 25,
    ['Elbows high so the bar sits on your shoulders.', 'Stay tall through the whole rep.'], { start: 0.4 }),
  ex('bb-deadlift', 'Barbell Deadlift', 'barbell', 'hinge', ['hamstrings', 'glutes'], ['back', 'quads', 'forearms'], true, 5, 25,
    ['Bar over mid-foot, flat back.', 'Push the floor away; keep the bar close.'], { start: 0.6 }),
  ex('bb-rdl', 'Barbell Romanian Deadlift', 'barbell', 'hinge', ['hamstrings', 'glutes'], ['back'], true, 4.5, 20,
    ['Hips back, soft knees.', 'Stop when your hamstrings are fully stretched.'], { start: 0.45 }),
  ex('bb-bench-press', 'Barbell Bench Press', 'barbell', 'hpush', ['chest'], ['triceps', 'shoulders'], true, 4, 25,
    ['Feet planted, shoulder blades squeezed.', 'Touch the bar to your mid-chest.'], { start: 0.4 }),
  ex('bb-ohp', 'Barbell Overhead Press', 'barbell', 'vpush', ['shoulders'], ['triceps', 'core'], true, 4, 20,
    ['Squeeze glutes, ribs down.', 'Move your head through once the bar passes.'], { start: 0.25 }),
  ex('bb-row', 'Bent-Over Barbell Row', 'barbell', 'hpull', ['back'], ['biceps', 'hamstrings'], true, 3.5, 20,
    ['Hinge to about 45° with a flat back.', 'Pull the bar to your lower ribs.'], { start: 0.35 }),
  ex('bb-hip-thrust', 'Barbell Hip Thrust', 'barbell', 'gluteIso', ['glutes'], ['hamstrings'], false, 3.5, 30,
    ['Bar padded over your hip crease.', 'Shins vertical at the top; pause.'], { start: 0.5 }),
  ex('bb-curl', 'Barbell Curl', 'barbell', 'armIso', ['biceps'], ['forearms'], false, 3, 10,
    ['Elbows pinned to your sides.', 'No leaning back.'], { start: 0.18 }),

  // ── Cable ──────────────────────────────────────────────────────────────
  ex('cable-lat-pulldown', 'Lat Pulldown', 'cable', 'vpull', ['back'], ['biceps'], true, 3.5, 15,
    ['Chest up, slight lean back.', 'Pull elbows down toward your back pockets.'], { start: 0.4 }),
  ex('cable-seated-row', 'Seated Cable Row', 'cable', 'hpull', ['back'], ['biceps'], true, 3.5, 15,
    ['Sit tall — no rocking.', 'Squeeze your shoulder blades together at the end.'], { start: 0.4 }),
  ex('cable-face-pull', 'Face Pull', 'cable', 'hpull', ['shoulders', 'back'], [], true, 3, 12,
    ['Pull the rope toward your eyebrows.', 'Finish with hands apart and elbows high.'], { start: 0.15 }),
  ex('cable-triceps-pushdown', 'Triceps Pushdown', 'cable', 'armIso', ['triceps'], [], false, 3, 10,
    ['Elbows locked to your sides.', 'Fully straighten your arms.'], { start: 0.15 }),
  ex('cable-curl', 'Cable Curl', 'cable', 'armIso', ['biceps'], ['forearms'], false, 3, 10,
    ['Step back so the cable stays tight.', 'Elbows still.'], { start: 0.15 }),
  ex('cable-fly', 'Cable Chest Fly', 'cable', 'upperIso', ['chest'], ['shoulders'], false, 3.5, 15,
    ['Soft elbows, chest proud.', 'Bring your hands together in a wide arc.'], { start: 0.07 }),
  ex('cable-lateral-raise', 'Cable Lateral Raise', 'cable', 'upperIso', ['shoulders'], [], false, 3, 12,
    ['Cable runs behind your body.', 'Raise to shoulder height, slow on the way down.'], { unilateral: true, start: 0.03 }),
  ex('cable-pull-through', 'Cable Pull-Through', 'cable', 'hinge', ['glutes', 'hamstrings'], [], true, 3.5, 15,
    ['Hinge back and let the rope travel between your legs.', 'Stand tall and squeeze your glutes.'], { start: 0.25 }),
  ex('cable-kickback', 'Cable Glute Kickback', 'cable', 'gluteIso', ['glutes'], ['hamstrings'], false, 3, 15,
    ['Hold the frame, slight forward lean.', 'Kick back without arching your lower back.'], { unilateral: true, start: 0.08 }),
  ex('cable-pallof-press', 'Pallof Press', 'cable', 'coreAntiRot', ['core'], [], false, 4, 12,
    ['Stand side-on to the cable.', 'Press straight out and resist the twist.'], { unilateral: true, start: 0.08 }),
  ex('cable-woodchop', 'Cable Woodchop', 'cable', 'coreAntiRot', ['core'], ['shoulders'], false, 3, 12,
    ['Rotate through your upper back and hips together.', 'Arms stay long.'], { unilateral: true, start: 0.08 }),
  ex('cable-crunch', 'Cable Crunch', 'cable', 'coreFlex', ['core'], [], false, 3, 12,
    ['Hips stay still.', 'Curl your ribs toward your pelvis.'], { start: 0.25 }),

  // ── Machine ────────────────────────────────────────────────────────────
  ex('m-leg-press', 'Leg Press', 'machine', 'squat', ['quads', 'glutes'], ['hamstrings'], true, 4, 20,
    ['Lower back stays on the pad.', 'Don’t lock your knees at the top.'], { start: 0.8 }),
  ex('m-leg-extension', 'Leg Extension', 'machine', 'legIso', ['quads'], [], false, 3, 15,
    ['Line your knee up with the pivot.', 'Pause at the top, lower slowly.'], { start: 0.3 }),
  ex('m-leg-curl', 'Leg Curl', 'machine', 'legIso', ['hamstrings'], ['calves'], false, 3, 15,
    ['Hips stay down on the pad.', 'Control the way back.'], { start: 0.25 }),
  ex('m-chest-press', 'Machine Chest Press', 'machine', 'hpush', ['chest'], ['triceps', 'shoulders'], true, 3.5, 15,
    ['Handles level with mid-chest.', 'Shoulders stay back against the pad.'], { start: 0.35 }),
  ex('m-shoulder-press', 'Machine Shoulder Press', 'machine', 'vpush', ['shoulders'], ['triceps'], true, 3.5, 15,
    ['Back flat against the pad.', 'Press without shrugging.'], { start: 0.22 }),
  ex('m-row', 'Machine Seated Row', 'machine', 'hpull', ['back'], ['biceps'], true, 3.5, 15,
    ['Chest on the pad.', 'Lead with your elbows.'], { start: 0.4 }),
  ex('m-pec-deck', 'Pec Deck', 'machine', 'upperIso', ['chest'], ['shoulders'], false, 3, 12,
    ['Elbows slightly below shoulder height.', 'Squeeze, then open slowly.'], { start: 0.25 }),
  ex('m-reverse-pec-deck', 'Reverse Pec Deck', 'machine', 'upperIso', ['shoulders'], ['back'], false, 3, 12,
    ['Chest against the pad.', 'Sweep back until your arms are in line with your shoulders.'], { start: 0.15 }),
  ex('m-hip-abduction', 'Hip Abduction Machine', 'machine', 'gluteIso', ['glutes'], [], false, 3, 12,
    ['Sit tall.', 'Press out and pause; return with control.'], { start: 0.35 }),
  ex('m-hip-adduction', 'Hip Adduction Machine', 'machine', 'legIso', ['adductors'], [], false, 3, 12,
    ['Start in a comfortable stretch.', 'Squeeze in smoothly.'], { start: 0.35 }),
  ex('m-calf-raise', 'Machine Calf Raise', 'machine', 'calves', ['calves'], [], false, 2.5, 12,
    ['Full stretch at the bottom.', 'Pause at the top.'], { start: 0.4 }),

  // ── Kettlebell ─────────────────────────────────────────────────────────
  ex('kb-swing', 'Kettlebell Swing', 'kettlebell', 'hinge', ['glutes', 'hamstrings'], ['core', 'back'], true, 2, 10,
    ['It’s a hinge, not a squat.', 'Snap your hips; arms just guide the bell.'], { start: 0.15 }),
  ex('kb-deadlift', 'Kettlebell Deadlift', 'kettlebell', 'hinge', ['hamstrings', 'glutes'], ['back'], true, 4, 10,
    ['Bell between your ankles.', 'Flat back; stand tall by pushing hips forward.'], { start: 0.25 }),
  ex('kb-sumo-squat', 'Kettlebell Sumo Squat', 'kettlebell', 'squat', ['quads', 'glutes'], ['adductors'], true, 4, 10,
    ['Wide stance, toes turned out.', 'Knees track over your toes.'], { start: 0.2 }),
  ex('kb-suitcase-carry', 'Suitcase Carry', 'kettlebell', 'carry', ['core', 'forearms'], ['shoulders'], true, 1, 10,
    ['Carry on one side only.', 'Don’t lean — stay perfectly upright.'], { unilateral: true, timed: true, start: 0.15 }),

  // ── Band ───────────────────────────────────────────────────────────────
  ex('band-pull-apart', 'Band Pull-Apart', 'band', 'hpull', ['shoulders', 'back'], [], false, 2.5, 8,
    ['Arms straight at chest height.', 'Pull the band to your chest by squeezing your shoulder blades.']),
  ex('band-row', 'Seated Band Row', 'band', 'hpull', ['back'], ['biceps'], true, 3, 12,
    ['Sit tall with the band around your feet.', 'Pull elbows past your ribs.']),
  ex('band-lateral-walk', 'Banded Lateral Walk', 'band', 'gluteIso', ['glutes'], [], false, 2, 10,
    ['Band above your knees, slight squat.', 'Small steps; keep tension on the band.'], { unilateral: true }),
  ex('band-curl', 'Band Biceps Curl', 'band', 'armIso', ['biceps'], ['forearms'], false, 3, 8,
    ['Stand on the band.', 'Elbows by your sides.']),

  // ── Bodyweight ─────────────────────────────────────────────────────────
  ex('bw-pushup', 'Push-Up', 'bodyweight', 'hpush', ['chest'], ['triceps', 'shoulders', 'core'], true, 3, 8,
    ['Body in one straight line.', 'Elbows about 45° from your sides.'], { bw: 0.64 }),
  ex('bw-knee-pushup', 'Knee Push-Up', 'bodyweight', 'hpush', ['chest'], ['triceps', 'shoulders'], true, 3, 8,
    ['Straight line from knees to head.', 'Chest to the floor, not your chin.'], { bw: 0.49 }),
  ex('bw-pullup', 'Pull-Up', 'bodyweight', 'vpull', ['back'], ['biceps', 'forearms'], true, 4, 10,
    ['Start from a full hang.', 'Drive elbows down; chin over the bar.'], { bw: 0.96 }),
  ex('bw-chinup', 'Chin-Up', 'bodyweight', 'vpull', ['back', 'biceps'], ['forearms'], true, 4, 10,
    ['Palms face you, shoulder width.', 'Lower all the way under control.'], { bw: 0.96 }),
  ex('bw-dip', 'Dip', 'bodyweight', 'vpush', ['chest', 'triceps'], ['shoulders'], true, 4, 10,
    ['Shoulders down, away from your ears.', 'Lower until upper arms are about parallel.'], { bw: 0.96 }),
  ex('bw-inverted-row', 'Inverted Row', 'bodyweight', 'hpull', ['back'], ['biceps', 'core'], true, 3.5, 12,
    ['Body straight like a plank.', 'Pull your chest to the bar.']),
  ex('bw-squat', 'Bodyweight Squat', 'bodyweight', 'squat', ['quads', 'glutes'], [], true, 3, 5,
    ['Feet shoulder width.', 'Sit back and down, chest up.'], { bw: 0.88 }),
  ex('bw-walking-lunge', 'Walking Lunge', 'bodyweight', 'lunge', ['quads', 'glutes'], ['hamstrings'], true, 3, 5,
    ['Long steps, torso tall.', 'Back knee hovers just above the floor.'], { unilateral: true, bw: 0.88 }),
  ex('bw-glute-bridge', 'Glute Bridge', 'bodyweight', 'gluteIso', ['glutes'], ['hamstrings'], false, 3, 8,
    ['Heels close to your hips.', 'Lift by squeezing your glutes, not arching.']),
  ex('bw-single-leg-bridge', 'Single-Leg Glute Bridge', 'bodyweight', 'gluteIso', ['glutes'], ['hamstrings'], false, 3, 8,
    ['Keep your hips level.', 'Pause for a beat at the top.'], { unilateral: true }),
  ex('bw-plank', 'Plank', 'bodyweight', 'coreAntiExt', ['core'], ['shoulders'], false, 1, 8,
    ['Elbows under shoulders.', 'Squeeze glutes; don’t let your hips sag.'], { timed: true }),
  ex('bw-side-plank', 'Side Plank', 'bodyweight', 'coreAntiRot', ['core'], ['shoulders'], false, 1, 8,
    ['Elbow under shoulder, hips stacked.', 'Push the floor away.'], { unilateral: true, timed: true }),
  ex('bw-dead-bug', 'Dead Bug', 'bodyweight', 'coreAntiExt', ['core'], [], false, 3.5, 8,
    ['Lower back pressed into the floor.', 'Reach opposite arm and leg slowly.']),
  ex('bw-bird-dog', 'Bird Dog', 'bodyweight', 'coreAntiRot', ['core'], ['glutes'], false, 3.5, 8,
    ['Hips level, like balancing a glass of water.', 'Reach long, don’t lift high.']),
  ex('bw-hanging-knee-raise', 'Hanging Knee Raise', 'bodyweight', 'coreFlex', ['core'], ['forearms'], false, 3, 10,
    ['No swinging.', 'Curl your pelvis up as your knees rise.']),
  ex('bw-bicycle-crunch', 'Bicycle Crunch', 'bodyweight', 'coreFlex', ['core'], [], false, 2, 8,
    ['Rotate your ribs, not just your elbows.', 'Slow and controlled.']),
  ex('bw-back-extension', 'Back Extension', 'bodyweight', 'hinge', ['hamstrings', 'glutes'], ['back'], true, 3.5, 12,
    ['Pad just below your hips.', 'Rise until your body is straight — no further.']),
  ex('bw-calf-raise', 'Bodyweight Calf Raise', 'bodyweight', 'calves', ['calves'], [], false, 2.5, 5,
    ['Use a step for a full stretch.', 'Pause at the top.'], { bw: 0.97 }),
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  adductors: 'Inner thighs', calves: 'Calves', core: 'Core',
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  hpush: 'Horizontal push', vpush: 'Vertical push', hpull: 'Horizontal pull', vpull: 'Vertical pull',
  squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge / single-leg', gluteIso: 'Glute isolation',
  coreAntiExt: 'Core · anti-extension', coreAntiRot: 'Core · anti-rotation', coreFlex: 'Core · flexion',
  armIso: 'Arm isolation', upperIso: 'Chest & shoulder isolation', legIso: 'Leg isolation',
  calves: 'Calves', carry: 'Carry',
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbell: 'Dumbbell', barbell: 'Barbell', cable: 'Cable', machine: 'Machine',
  kettlebell: 'Kettlebell', band: 'Band', bodyweight: 'Bodyweight',
};

export const EQUIPMENT_ORDER: Equipment[] = ['dumbbell', 'barbell', 'cable', 'machine', 'kettlebell', 'band', 'bodyweight'];

/** Filter chips group the detailed muscles into friendlier buckets. */
export const MUSCLE_GROUPS: { id: string; label: string; muscles: Muscle[] }[] = [
  { id: 'chest', label: 'Chest', muscles: ['chest'] },
  { id: 'back', label: 'Back', muscles: ['back'] },
  { id: 'shoulders', label: 'Shoulders', muscles: ['shoulders'] },
  { id: 'arms', label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'legs', label: 'Legs', muscles: ['quads', 'hamstrings', 'adductors', 'calves'] },
  { id: 'glutes', label: 'Glutes', muscles: ['glutes'] },
  { id: 'core', label: 'Core', muscles: ['core'] },
];

export const UPPER_PATTERNS: Pattern[] = ['hpush', 'vpush', 'hpull', 'vpull', 'armIso', 'upperIso'];
export const LOWER_PATTERNS: Pattern[] = ['squat', 'hinge', 'lunge', 'gluteIso', 'legIso', 'calves'];
export const PUSH_PATTERNS: Pattern[] = ['hpush', 'vpush'];
export const PULL_PATTERNS: Pattern[] = ['hpull', 'vpull'];
export const CORE_PATTERNS: Pattern[] = ['coreAntiExt', 'coreAntiRot', 'coreFlex', 'carry'];

export function isUpper(e: Exercise): boolean {
  return UPPER_PATTERNS.includes(e.pattern);
}
export function isLower(e: Exercise): boolean {
  return LOWER_PATTERNS.includes(e.pattern);
}

export type ExerciseMap = Record<string, Exercise>;

export function buildExerciseMap(custom: Exercise[] = []): ExerciseMap {
  const map: ExerciseMap = {};
  for (const e of EXERCISES) map[e.id] = e;
  for (const e of custom) map[e.id] = e;
  return map;
}

/** Sensible tempo / setup defaults for a custom exercise. */
export function customDefaults(equipment: Equipment, compound: boolean): { tempo: number; setup: number } {
  const setup: Record<Equipment, number> = {
    barbell: 25, dumbbell: 15, machine: 15, cable: 12, kettlebell: 10, band: 10, bodyweight: 8,
  };
  return { tempo: compound ? 3.5 : 3, setup: setup[equipment] };
}
