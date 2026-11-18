/**
 * IronTrack Storage & Data Management Module
 * Handles local persistence, default routines, history, and records.
 */

const STORAGE_KEYS = {
  EXERCISES: 'irontrack_exercises',
  ROUTINES: 'irontrack_routines',
  HISTORY: 'irontrack_history',
  ACTIVE_WORKOUT: 'irontrack_active_workout',
  SETTINGS: 'irontrack_settings'
};

const DEFAULT_SETTINGS = {
  unit: 'kg',
  defaultRestTime: 90, // seconds
  soundEnabled: true,
  vibrateEnabled: true
};

const DEFAULT_EXERCISES = [
  // Pecho
  { id: 'ex_bench_press', name: 'Press de banca plano (barra)', muscle: 'Pecho', category: 'Barra' },
  { id: 'ex_incline_dumbbell', name: 'Press inclinado con mancuernas', muscle: 'Pecho', category: 'Mancuernas' },
  { id: 'ex_cable_crossover', name: 'Aperturas en polea', muscle: 'Pecho', category: 'Polea' },
  { id: 'ex_dips', name: 'Fondos en paralelas', muscle: 'Pecho', category: 'Peso corporal' },

  // Hombros
  { id: 'ex_overhead_press', name: 'Press militar (barra)', muscle: 'Hombros', category: 'Barra' },
  { id: 'ex_lateral_raises', name: 'Elevaciones laterales', muscle: 'Hombros', category: 'Mancuernas' },
  { id: 'ex_arnold_press', name: 'Press Arnold / Mancuernas', muscle: 'Hombros', category: 'Mancuernas' },
  { id: 'ex_face_pull', name: 'Face Pull / Deltoides posterior', muscle: 'Hombros', category: 'Polea' },

  // Espalda
  { id: 'ex_pullups', name: 'Dominadas', muscle: 'Espalda', category: 'Peso corporal' },
  { id: 'ex_barbell_row', name: 'Remo con barra', muscle: 'Espalda', category: 'Barra' },
  { id: 'ex_lat_pulldown', name: 'Jalón al pecho', muscle: 'Espalda', category: 'Máquina' },
  { id: 'ex_seated_cable_row', name: 'Remo sentado en polea', muscle: 'Espalda', category: 'Polea' },
  { id: 'ex_deadlift', name: 'Peso muerto', muscle: 'Espalda', category: 'Barra' },

  // Pierna
  { id: 'ex_squat', name: 'Sentadilla trasera con barra', muscle: 'Pierna', category: 'Barra' },
  { id: 'ex_leg_press', name: 'Prensa de piernas 45°', muscle: 'Pierna', category: 'Máquina' },
  { id: 'ex_leg_extension', name: 'Extensión de cuádriceps', muscle: 'Pierna', category: 'Máquina' },
  { id: 'ex_leg_curl', name: 'Curl femoral tumbado', muscle: 'Pierna', category: 'Máquina' },
  { id: 'ex_calf_raise', name: 'Elevación de talones', muscle: 'Pierna', category: 'Máquina' },

  // Brazos & Core
  { id: 'ex_bicep_curl_bar', name: 'Curl de bíceps con barra', muscle: 'Brazos', category: 'Barra' },
  { id: 'ex_hammer_curl', name: 'Curl martillo con mancuernas', muscle: 'Brazos', category: 'Mancuernas' },
  { id: 'ex_tricep_pushdown', name: 'Extensión de tríceps en polea', muscle: 'Brazos', category: 'Polea' },
  { id: 'ex_skull_crushers', name: 'Press francés', muscle: 'Brazos', category: 'Barra' },
  { id: 'ex_plank', name: 'Plancha abdominal', muscle: 'Core', category: 'Peso corporal' }
];

const DEFAULT_ROUTINES = [
  {
    id: 'rot_torso',
    name: 'Torso (Pecho, Espalda y Hombro)',
    description: 'Enfoque en tren superior completo',
    exerciseIds: [
      'ex_bench_press',
      'ex_barbell_row',
      'ex_overhead_press',
      'ex_lat_pulldown',
      'ex_lateral_raises',
      'ex_tricep_pushdown',
      'ex_bicep_curl_bar'
    ]
  },
  {
    id: 'rot_pierna',
    name: 'Pierna & Core',
    description: 'Fuerza e hipertrofia para cuádriceps, femoral y pantorrilla',
    exerciseIds: [
      'ex_squat',
      'ex_leg_press',
      'ex_leg_curl',
      'ex_leg_extension',
      'ex_calf_raise',
      'ex_plank'
    ]
  },
  {
    id: 'rot_empuje',
    name: 'Push (Empuje)',
    description: 'Pecho, hombro anterior y lateral, tríceps',
    exerciseIds: [
      'ex_bench_press',
      'ex_incline_dumbbell',
      'ex_overhead_press',
      'ex_lateral_raises',
      'ex_tricep_pushdown',
      'ex_dips'
    ]
  },
  {
    id: 'rot_tiron',
    name: 'Pull (Tirón)',
    description: 'Espalda completa, deltoides posterior y bíceps',
    exerciseIds: [
      'ex_deadlift',
      'ex_pullups',
      'ex_barbell_row',
      'ex_lat_pulldown',
      'ex_face_pull',
      'ex_bicep_curl_bar',
      'ex_hammer_curl'
    ]
  }
];

class StorageService {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.EXERCISES)) {
      this.saveExercises(DEFAULT_EXERCISES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROUTINES)) {
      this.saveRoutines(DEFAULT_ROUTINES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      this.saveHistory([]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- Exercises ---
  getExercises() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXERCISES)) || DEFAULT_EXERCISES;
    } catch (e) {
      return DEFAULT_EXERCISES;
    }
  }

  saveExercises(exercises) {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
  }

  addExercise(exercise) {
    const exercises = this.getExercises();
    const newEx = {
      id: 'ex_' + Date.now(),
      name: exercise.name.trim(),
      muscle: exercise.muscle || 'Varios',
      category: exercise.category || 'Barra'
    };
    exercises.push(newEx);
    this.saveExercises(exercises);
    return newEx;
  }

  deleteExercise(id) {
    let exercises = this.getExercises();
    exercises = exercises.filter(e => e.id !== id);
    this.saveExercises(exercises);
  }

  // --- Routines ---
  getRoutines() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || DEFAULT_ROUTINES;
    } catch (e) {
      return DEFAULT_ROUTINES;
    }
  }

  saveRoutines(routines) {
    localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
  }

  addRoutine(routine) {
    const routines = this.getRoutines();
    const newRoutine = {
      id: 'rot_' + Date.now(),
      name: routine.name.trim(),
      description: routine.description || '',
      exerciseIds: routine.exerciseIds || []
    };
    routines.push(newRoutine);
    this.saveRoutines(routines);
    return newRoutine;
  }

  updateRoutine(id, updatedData) {
    const routines = this.getRoutines();
    const index = routines.findIndex(r => r.id === id);
    if (index !== -1) {
      routines[index] = { ...routines[index], ...updatedData };
      this.saveRoutines(routines);
      return routines[index];
    }
    return null;
  }

  deleteRoutine(id) {
    let routines = this.getRoutines();
    routines = routines.filter(r => r.id !== id);
    this.saveRoutines(routines);
  }

  // --- Active Workout ---
  getActiveWorkout() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  saveActiveWorkout(workout) {
    if (workout) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(workout));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
    }
  }

  // --- Workout History ---
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  saveCompletedWorkout(workoutData) {
    const history = this.getHistory();
    history.unshift(workoutData); // newest first
    this.saveHistory(history);
    this.saveActiveWorkout(null); // clear active
    return history;
  }

  deleteWorkoutFromHistory(workoutId) {
    let history = this.getHistory();
    history = history.filter(w => w.id !== workoutId);
    this.saveHistory(history);
    return history;
  }

  // --- Stats, Records & Progressive Overload Helpers ---
  getLastExercisePerformance(exerciseId) {
    const history = this.getHistory();
    for (const session of history) {
      if (!session.exercises) continue;
      const found = session.exercises.find(e => e.exerciseId === exerciseId);
      if (found && found.sets && found.sets.length > 0) {
        const completedSets = found.sets.filter(s => s.completed);
        if (completedSets.length > 0) {
          return {
            date: session.date,
            sets: completedSets
          };
        }
      }
    }
    return null;
  }

  getPersonalRecords() {
    const history = this.getHistory();
    const records = {}; // { [exerciseId]: { maxWeight, maxRepsAtMaxWeight, estimated1RM, date, exerciseName } }

    history.forEach(session => {
      if (!session.exercises) return;
      session.exercises.forEach(ex => {
        if (!ex.sets) return;
        ex.sets.forEach(set => {
          if (!set.completed) return;
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          if (reps <= 0) return;

          // Brzycki formula for 1RM: weight / (1.0278 - (0.0278 * reps))
          // Epley formula: weight * (1 + reps / 30)
          const est1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

          if (!records[ex.exerciseId] || est1RM > records[ex.exerciseId].estimated1RM) {
            records[ex.exerciseId] = {
              exerciseId: ex.exerciseId,
              exerciseName: ex.name,
              maxWeight: weight,
              reps: reps,
              estimated1RM: est1RM,
              date: session.date
            };
          }
        });
      });
    });

    return records;
  }

  // --- Export & Import ---
  exportBackupJSON() {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises: this.getExercises(),
      routines: this.getRoutines(),
      history: this.getHistory(),
      settings: this.getSettings()
    };
    return JSON.stringify(backup, null, 2);
  }

  importBackupJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.exercises) this.saveExercises(data.exercises);
      if (data.routines) this.saveRoutines(data.routines);
      if (data.history) this.saveHistory(data.history);
      if (data.settings) this.saveSettings(data.settings);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

window.storageService = new StorageService();
