/**
 * IronTrack - Main Application Controller
 * High-performance mobile PWA logic for gym tracking
 */

document.addEventListener('DOMContentLoaded', () => {
  // App Core State
  let activeWorkout = null;
  let workoutTimerInterval = null;
  let restTimerInterval = null;
  let restRemainingSeconds = 0;
  let selectedMuscleFilter = 'Todos';

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const viewPanels = document.querySelectorAll('.view-panel');
  const restTimerBar = document.getElementById('rest-timer-bar');
  const restTimerClock = document.getElementById('rest-timer-clock');

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  function switchTab(viewId) {
    viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === viewId);
    });
    tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Refresh specific view contents when visited
    if (viewId === 'view-workout') {
      renderWorkoutView();
    } else if (viewId === 'view-routines') {
      renderAllRoutines();
    } else if (viewId === 'view-history') {
      renderHistory();
    } else if (viewId === 'view-progress') {
      renderPersonalRecords();
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.view);
    });
  });

  document.getElementById('btn-goto-routines')?.addEventListener('click', () => {
    switchTab('view-routines');
  });

  // ==========================================
  // WORKOUT ENGINE & TIMER
  // ==========================================
  function initWorkoutState() {
    activeWorkout = window.storageService.getActiveWorkout();
    if (activeWorkout) {
      resumeWorkoutTimer();
      renderWorkoutView();
    } else {
      renderWorkoutView();
    }
  }

  function startWorkout(routine = null) {
    const defaultSettings = window.storageService.getSettings();
    activeWorkout = {
      id: 'work_' + Date.now(),
      name: routine ? routine.name : 'Entrenamiento Libre',
      routineId: routine ? routine.id : null,
      startTime: Date.now(),
      unit: defaultSettings.unit || 'kg',
      exercises: []
    };

    // If starting from a routine, pre-populate exercises
    if (routine && routine.exerciseIds && routine.exerciseIds.length > 0) {
      const allExercises = window.storageService.getExercises();
      routine.exerciseIds.forEach(exId => {
        const exMeta = allExercises.find(e => e.id === exId);
        if (exMeta) {
          const lastPerf = window.storageService.getLastExercisePerformance(exId);
          const initialSets = [];
          if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
            lastPerf.sets.forEach((s, idx) => {
              initialSets.push({
                setNum: idx + 1,
                weight: s.weight,
                reps: s.reps,
                completed: false
              });
            });
          } else {
            // Default 3 standard sets
            for (let i = 1; i <= 3; i++) {
              initialSets.push({ setNum: i, weight: '', reps: '', completed: false });
            }
          }

          activeWorkout.exercises.push({
            exerciseId: exMeta.id,
            name: exMeta.name,
            muscle: exMeta.muscle,
            sets: initialSets
          });
        }
      });
    }

    saveAndSyncActiveWorkout();
    resumeWorkoutTimer();
    renderWorkoutView();
  }

  function saveAndSyncActiveWorkout() {
    window.storageService.saveActiveWorkout(activeWorkout);
  }

  function resumeWorkoutTimer() {
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    updateWorkoutTimerDisplay();
    workoutTimerInterval = setInterval(() => {
      updateWorkoutTimerDisplay();
    }, 1000);
  }

  function updateWorkoutTimerDisplay() {
    if (!activeWorkout || !activeWorkout.startTime) return;
    const elapsedSeconds = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;

    const timerEl = document.getElementById('active-workout-timer');
    if (timerEl) {
      timerEl.textContent =
        (hrs > 0 ? String(hrs).padStart(2, '0') + ':' : '') +
        String(mins).padStart(2, '0') + ':' +
        String(secs).padStart(2, '0');
    }
  }

  function finishWorkout() {
    if (!activeWorkout) return;

    // Check if at least 1 set was completed
    let totalCompletedSets = 0;
    let totalVolume = 0;
    const completedExercises = [];
    const brokenPRs = [];
    const currentRecords = window.storageService.getPersonalRecords();

    activeWorkout.exercises.forEach(ex => {
      const validSets = ex.sets.filter(s => s.completed && (parseFloat(s.weight) || 0) > 0 && (parseInt(s.reps) || 0) > 0);
      if (validSets.length > 0) {
        completedExercises.push({
          exerciseId: ex.exerciseId,
          name: ex.name,
          muscle: ex.muscle,
          sets: validSets
        });

        validSets.forEach(s => {
          totalCompletedSets++;
          const w = parseFloat(s.weight);
          const r = parseInt(s.reps);
          totalVolume += (w * r);

          const est1RM = r === 1 ? w : Math.round(w * (1 + r / 30));
          const existingRecord = currentRecords[ex.exerciseId];
          if (!existingRecord || est1RM > existingRecord.estimated1RM) {
            brokenPRs.push({
              exerciseName: ex.name,
              weight: w,
              reps: r,
              estimated1RM: est1RM
            });
          }
        });
      }
    });

    if (totalCompletedSets === 0) {
      if (!confirm('No has marcado ninguna serie como completada. ¿Deseas terminar y guardar de todas formas?')) {
        return;
      }
    }

    const durationSeconds = Math.floor((Date.now() - activeWorkout.startTime) / 1000);
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    const completedSession = {
      id: activeWorkout.id,
      name: activeWorkout.name,
      date: new Date().toISOString(),
      durationMinutes: durationMinutes,
      totalVolume: Math.round(totalVolume),
      totalSets: totalCompletedSets,
      unit: activeWorkout.unit || 'kg',
      exercises: completedExercises,
      prsBroken: brokenPRs
    };

    window.storageService.saveCompletedWorkout(completedSession);
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    activeWorkout = null;

    // Audio & Visual Celebration
    window.soundEngine.playVictory();
    triggerConfetti();

    // Show summary modal
    showWorkoutSummaryModal(completedSession);
    renderWorkoutView();
  }

  function discardWorkout() {
    if (!confirm('¿Seguro que deseas descartar este entrenamiento en progreso? Se perderán los datos de esta sesión.')) {
      return;
    }
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    activeWorkout = null;
    window.storageService.saveActiveWorkout(null);
    dismissRestTimer();
    renderWorkoutView();
  }

  // ==========================================
  // REST TIMER ENGINE
  // ==========================================
  function triggerRestTimer(seconds = null) {
    const settings = window.storageService.getSettings();
    restRemainingSeconds = seconds || settings.defaultRestTime || 90;

    if (restTimerInterval) clearInterval(restTimerInterval);
    updateRestTimerUI();
    restTimerBar.classList.add('visible');

    restTimerInterval = setInterval(() => {
      restRemainingSeconds--;
      if (restRemainingSeconds <= 0) {
        clearInterval(restTimerInterval);
        restRemainingSeconds = 0;
        updateRestTimerUI();
        window.soundEngine.playTimerEnd();
        setTimeout(() => {
          dismissRestTimer();
        }, 4000);
      } else {
        updateRestTimerUI();
      }
    }, 1000);
  }

  function updateRestTimerUI() {
    const m = Math.floor(restRemainingSeconds / 60);
    const s = restRemainingSeconds % 60;
    restTimerClock.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function dismissRestTimer() {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerBar.classList.remove('visible');
  }

  document.getElementById('btn-timer-skip')?.addEventListener('click', dismissRestTimer);
  document.getElementById('btn-timer-plus30')?.addEventListener('click', () => {
    restRemainingSeconds += 30;
    updateRestTimerUI();
  });

  // ==========================================
  // RENDERING WORKOUT VIEW
  // ==========================================
  function renderWorkoutView() {
    const inactiveState = document.getElementById('workout-inactive-state');
    const activeState = document.getElementById('workout-active-state');

    if (!activeWorkout) {
      inactiveState.style.display = 'block';
      activeState.style.display = 'none';
      dismissRestTimer();

      // Render stats & quick routines
      const history = window.storageService.getHistory();
      const prs = window.storageService.getPersonalRecords();
      const settings = window.storageService.getSettings();

      let totalVol = 0;
      history.forEach(h => totalVol += (h.totalVolume || 0));

      document.getElementById('stat-total-workouts').textContent = history.length;
      document.getElementById('stat-total-volume').textContent = `${Math.round(totalVol)} ${settings.unit || 'kg'}`;
      document.getElementById('stat-total-prs').textContent = Object.keys(prs).length;

      renderHomeRoutinesList();
    } else {
      inactiveState.style.display = 'none';
      activeState.style.display = 'block';

      document.getElementById('active-routine-name').textContent = activeWorkout.name;
      renderActiveExercisesList();
    }
  }

  function renderHomeRoutinesList() {
    const container = document.getElementById('home-routines-container');
    const routines = window.storageService.getRoutines();
    const exercises = window.storageService.getExercises();

    if (!routines || routines.length === 0) {
      container.innerHTML = `<div class="empty-state">No tienes rutinas creadas aún.</div>`;
      return;
    }

    container.innerHTML = routines.slice(0, 3).map(r => {
      const exNames = (r.exerciseIds || []).map(id => {
        const found = exercises.find(e => e.id === id);
        return found ? found.name : '';
      }).filter(Boolean).slice(0, 4).join(' • ');

      return `
        <div class="routine-card">
          <div class="routine-title-row">
            <span class="routine-name">${r.name}</span>
            <span class="routine-badge">${(r.exerciseIds || []).length} ejerc.</span>
          </div>
          <div class="routine-desc">${r.description || ''}</div>
          <div class="routine-exercises-list">${exNames}${r.exerciseIds.length > 4 ? '...' : ''}</div>
          <div class="routine-actions">
            <button class="btn-primary-hero btn-start-routine" data-id="${r.id}" style="margin: 0; padding: 10px 16px; font-size: 14px;">
              Iniciar Rutina
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-start-routine').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.dataset.id;
        const routine = routines.find(r => r.id === rId);
        if (routine) startWorkout(routine);
      });
    });
  }

  function renderActiveExercisesList() {
    const container = document.getElementById('active-exercises-list');
    if (!activeWorkout || !activeWorkout.exercises) return;

    if (activeWorkout.exercises.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Sin ejercicios aún</div>
          <div style="font-size: 13px;">Toca "+ Añadir Ejercicio" abajo para meter press de banca, militar, o el ejercicio que quieras entrenar hoy.</div>
        </div>
      `;
      return;
    }

    const unit = activeWorkout.unit || 'kg';

    container.innerHTML = activeWorkout.exercises.map((ex, exIdx) => {
      const lastPerf = window.storageService.getLastExercisePerformance(ex.exerciseId);
      let lastPerfHtml = '';
      if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
        const summary = lastPerf.sets.map(s => `${s.weight}${unit} x ${s.reps}`).join(', ');
        lastPerfHtml = `<div class="prev-session-hint"><span>Anterior:</span> <strong>${summary}</strong></div>`;
      }

      const setsHtml = ex.sets.map((set, setIdx) => {
        return `
          <tr class="set-row ${set.completed ? 'completed' : ''}" data-ex-idx="${exIdx}" data-set-idx="${setIdx}">
            <td><span class="set-number-badge">${setIdx + 1}</span></td>
            <td>
              <input type="number" step="0.5" class="set-input set-weight-input" inputmode="decimal" placeholder="0" value="${set.weight || ''}">
            </td>
            <td>
              <input type="number" step="1" class="set-input set-reps-input" inputmode="numeric" placeholder="0" value="${set.reps || ''}">
            </td>
            <td>
              <button class="btn-set-check ${set.completed ? 'checked' : ''}" title="Completar serie">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="active-exercise-card" data-ex-idx="${exIdx}">
          <div class="exercise-header-row">
            <div>
              <h3 class="exercise-name">${ex.name}</h3>
              <span class="exercise-muscle-tag">${ex.muscle || 'General'}</span>
            </div>
            <button class="btn-danger btn-remove-exercise" data-ex-idx="${exIdx}" title="Eliminar ejercicio">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>

          ${lastPerfHtml}

          <table class="sets-table">
            <thead>
              <tr>
                <th style="width: 15%;">SERIE</th>
                <th style="width: 35%;">${unit.toUpperCase()}</th>
                <th style="width: 35%;">REPS</th>
                <th style="width: 15%;">✓</th>
              </tr>
            </thead>
            <tbody>
              ${setsHtml}
            </tbody>
          </table>

          <div style="display: flex; gap: 8px;">
            <button class="btn-add-set" data-ex-idx="${exIdx}">+ Añadir Serie</button>
            <button class="btn-secondary btn-quick-plate" data-ex-idx="${exIdx}" style="padding: 8px 12px; font-size: 12px;" title="Ver discos para este peso">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Event Listeners to sets and inputs
    container.querySelectorAll('.set-weight-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.target.closest('.set-row');
        const exIdx = parseInt(row.dataset.exIdx, 10);
        const setIdx = parseInt(row.dataset.setIdx, 10);
        activeWorkout.exercises[exIdx].sets[setIdx].weight = e.target.value.trim();
        saveAndSyncActiveWorkout();
      });
    });

    container.querySelectorAll('.set-reps-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.target.closest('.set-row');
        const exIdx = parseInt(row.dataset.exIdx, 10);
        const setIdx = parseInt(row.dataset.setIdx, 10);
        activeWorkout.exercises[exIdx].sets[setIdx].reps = e.target.value.trim();
        saveAndSyncActiveWorkout();
      });
    });

    container.querySelectorAll('.btn-set-check').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = btn.closest('.set-row');
        const exIdx = parseInt(row.dataset.exIdx, 10);
        const setIdx = parseInt(row.dataset.setIdx, 10);
        const set = activeWorkout.exercises[exIdx].sets[setIdx];

        // If weight/reps are empty, auto-fill from previous set if possible
        if (!set.weight && setIdx > 0) {
          set.weight = activeWorkout.exercises[exIdx].sets[setIdx - 1].weight;
        }
        if (!set.reps && setIdx > 0) {
          set.reps = activeWorkout.exercises[exIdx].sets[setIdx - 1].reps;
        }

        set.completed = !set.completed;
        saveAndSyncActiveWorkout();

        if (set.completed) {
          window.soundEngine.playCheck();
          triggerRestTimer();
        }

        renderActiveExercisesList();
      });
    });

    container.querySelectorAll('.btn-add-set').forEach(btn => {
      btn.addEventListener('click', () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const sets = activeWorkout.exercises[exIdx].sets;
        const prevSet = sets.length > 0 ? sets[sets.length - 1] : null;

        sets.push({
          setNum: sets.length + 1,
          weight: prevSet ? prevSet.weight : '',
          reps: prevSet ? prevSet.reps : '',
          completed: false
        });
        saveAndSyncActiveWorkout();
        renderActiveExercisesList();
      });
    });

    container.querySelectorAll('.btn-remove-exercise').forEach(btn => {
      btn.addEventListener('click', () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        if (confirm('¿Eliminar este ejercicio de la sesión?')) {
          activeWorkout.exercises.splice(exIdx, 1);
          saveAndSyncActiveWorkout();
          renderActiveExercisesList();
        }
      });
    });

    container.querySelectorAll('.btn-quick-plate').forEach(btn => {
      btn.addEventListener('click', () => {
        const exIdx = parseInt(btn.dataset.exIdx, 10);
        const sets = activeWorkout.exercises[exIdx].sets;
        const lastSet = sets.find(s => parseFloat(s.weight) > 0);
        if (lastSet) {
          document.getElementById('calc-target-weight').value = lastSet.weight;
        }
        openPlateCalculator();
      });
    });
  }

  // Header and Workout Action Listeners
  document.getElementById('btn-start-empty-workout')?.addEventListener('click', () => {
    startWorkout(null);
  });
  document.getElementById('btn-finish-workout')?.addEventListener('click', finishWorkout);
  document.getElementById('btn-discard-workout')?.addEventListener('click', discardWorkout);

  // ==========================================
  // EXERCISES LIBRARY & SELECTION MODAL
  // ==========================================
  const modalSelectExercise = document.getElementById('modal-select-exercise');
  const exercisesLibraryContainer = document.getElementById('exercises-library-container');
  const exerciseSearchInput = document.getElementById('exercise-search-input');
  let onExerciseSelectedCallback = null;

  function openSelectExerciseModal(callback) {
    onExerciseSelectedCallback = callback;
    selectedMuscleFilter = 'Todos';
    document.querySelectorAll('.filter-muscle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.muscle === 'Todos');
    });
    exerciseSearchInput.value = '';
    renderExercisesLibrary();
    modalSelectExercise.classList.add('active');
  }

  function closeSelectExerciseModal() {
    modalSelectExercise.classList.remove('active');
  }

  document.getElementById('btn-close-exercise-modal')?.addEventListener('click', closeSelectExerciseModal);
  document.getElementById('btn-add-exercise-to-workout')?.addEventListener('click', () => {
    openSelectExerciseModal((selectedEx) => {
      // Look up previous session for smart pre-fill
      const lastPerf = window.storageService.getLastExercisePerformance(selectedEx.id);
      const defaultSets = [];
      if (lastPerf && lastPerf.sets && lastPerf.sets.length > 0) {
        lastPerf.sets.forEach((s, idx) => {
          defaultSets.push({ setNum: idx + 1, weight: s.weight, reps: s.reps, completed: false });
        });
      } else {
        defaultSets.push({ setNum: 1, weight: '', reps: '', completed: false });
        defaultSets.push({ setNum: 2, weight: '', reps: '', completed: false });
        defaultSets.push({ setNum: 3, weight: '', reps: '', completed: false });
      }

      activeWorkout.exercises.push({
        exerciseId: selectedEx.id,
        name: selectedEx.name,
        muscle: selectedEx.muscle,
        sets: defaultSets
      });

      saveAndSyncActiveWorkout();
      renderActiveExercisesList();
    });
  });

  function renderExercisesLibrary() {
    const allExercises = window.storageService.getExercises();
    const query = exerciseSearchInput.value.toLowerCase().trim();

    const filtered = allExercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(query) || (ex.muscle && ex.muscle.toLowerCase().includes(query));
      const matchMuscle = selectedMuscleFilter === 'Todos' || ex.muscle === selectedMuscleFilter;
      return matchSearch && matchMuscle;
    });

    if (filtered.length === 0) {
      exercisesLibraryContainer.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          No se encontraron ejercicios con ese criterio.
        </div>
      `;
      return;
    }

    exercisesLibraryContainer.innerHTML = filtered.map(ex => {
      return `
        <div class="card exercise-item" data-id="${ex.id}" style="padding: 12px 16px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 15px; font-weight: 700; color: #fff;">${ex.name}</div>
            <span class="exercise-muscle-tag" style="margin-top: 2px;">${ex.muscle}</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-blue);"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      `;
    }).join('');

    exercisesLibraryContainer.querySelectorAll('.exercise-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const found = allExercises.find(e => e.id === id);
        if (found && onExerciseSelectedCallback) {
          onExerciseSelectedCallback(found);
          closeSelectExerciseModal();
        }
      });
    });
  }

  exerciseSearchInput?.addEventListener('input', renderExercisesLibrary);

  document.querySelectorAll('.filter-muscle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-muscle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMuscleFilter = btn.dataset.muscle;
      renderExercisesLibrary();
    });
  });

  // Dedicated "Crear Tu Ejercicio" Modal Logic
  const modalCreateExercise = document.getElementById('modal-create-exercise');
  const dedicatedExName = document.getElementById('dedicated-ex-name');
  const dedicatedExMuscle = document.getElementById('dedicated-ex-muscle');
  const dedicatedExCategory = document.getElementById('dedicated-ex-category');

  function openCreateExerciseModal() {
    dedicatedExName.value = '';
    modalCreateExercise.classList.add('active');
    setTimeout(() => {
      dedicatedExName.focus();
    }, 250);
  }

  function closeCreateExerciseModal() {
    modalCreateExercise.classList.remove('active');
  }

  document.getElementById('btn-header-create-ex')?.addEventListener('click', openCreateExerciseModal);
  document.getElementById('btn-prominent-create-ex')?.addEventListener('click', openCreateExerciseModal);
  document.getElementById('btn-open-create-ex-from-routines')?.addEventListener('click', openCreateExerciseModal);
  document.getElementById('btn-close-create-exercise-modal')?.addEventListener('click', closeCreateExerciseModal);
  document.getElementById('btn-cancel-dedicated-exercise')?.addEventListener('click', closeCreateExerciseModal);

  document.getElementById('btn-submit-dedicated-exercise')?.addEventListener('click', () => {
    const name = dedicatedExName.value.trim();
    if (!name) {
      alert('Por favor escribe un nombre para el ejercicio.');
      return;
    }

    const created = window.storageService.addExercise({
      name: name,
      muscle: dedicatedExMuscle.value,
      category: dedicatedExCategory.value
    });

    closeCreateExerciseModal();
    window.soundEngine.playCheck();

    // If an exercise selection was pending in workout, auto-select it!
    if (onExerciseSelectedCallback) {
      onExerciseSelectedCallback(created);
      closeSelectExerciseModal();
    } else {
      renderExercisesLibrary();
      renderAllRoutines();
      alert(`¡"${created.name}" agregado a tu catálogo de ejercicios!`);
    }
  });

  // ==========================================
  // ROUTINES TAB LOGIC
  // ==========================================
  const modalRoutineEditor = document.getElementById('modal-routine-editor');
  let editingRoutineId = null;

  function renderAllRoutines() {
    const container = document.getElementById('all-routines-container');
    const routines = window.storageService.getRoutines();
    const exercises = window.storageService.getExercises();

    if (!routines || routines.length === 0) {
      container.innerHTML = `<div class="empty-state">No tienes rutinas creadas. Pulsa "+ Nueva Rutina" para armar tu plan.</div>`;
      return;
    }

    container.innerHTML = routines.map(r => {
      const exercisePills = (r.exerciseIds || []).map(id => {
        const found = exercises.find(e => e.id === id);
        return found ? `<span style="display: inline-block; background: var(--bg-tertiary); padding: 2px 8px; border-radius: 6px; font-size: 11px; margin: 2px;">${found.name}</span>` : '';
      }).join(' ');

      return `
        <div class="card routine-card">
          <div class="routine-title-row">
            <span class="routine-name">${r.name}</span>
            <span class="routine-badge">${(r.exerciseIds || []).length} ejercicios</span>
          </div>
          <div class="routine-desc">${r.description || 'Sin descripción'}</div>
          <div style="margin-bottom: 12px;">${exercisePills}</div>
          <div class="routine-actions" style="justify-content: space-between;">
            <button class="btn-primary-hero btn-start-r" data-id="${r.id}" style="margin: 0; padding: 10px 16px; font-size: 14px; flex: 1;">
              Entrenar esta Rutina
            </button>
            <div style="display: flex; gap: 6px;">
              <button class="btn-secondary btn-edit-r" data-id="${r.id}" style="padding: 8px 12px; font-size: 13px;">Editar</button>
              <button class="btn-danger btn-delete-r" data-id="${r.id}" style="padding: 8px 12px;">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-start-r').forEach(btn => {
      btn.addEventListener('click', () => {
        const routine = routines.find(r => r.id === btn.dataset.id);
        if (routine) {
          switchTab('view-workout');
          startWorkout(routine);
        }
      });
    });

    container.querySelectorAll('.btn-edit-r').forEach(btn => {
      btn.addEventListener('click', () => {
        openRoutineModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.btn-delete-r').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Seguro que deseas eliminar esta rutina?')) {
          window.storageService.deleteRoutine(btn.dataset.id);
          renderAllRoutines();
        }
      });
    });
  }

  function openRoutineModal(routineId = null) {
    editingRoutineId = routineId;
    const allExercises = window.storageService.getExercises();
    const selectorContainer = document.getElementById('routine-modal-exercises-selector');
    const titleEl = document.getElementById('routine-modal-title');
    const nameInput = document.getElementById('routine-input-name');
    const descInput = document.getElementById('routine-input-desc');

    let selectedIds = [];
    if (routineId) {
      const routines = window.storageService.getRoutines();
      const r = routines.find(x => x.id === routineId);
      if (r) {
        titleEl.textContent = 'Editar Rutina';
        nameInput.value = r.name;
        descInput.value = r.description || '';
        selectedIds = r.exerciseIds || [];
      }
    } else {
      titleEl.textContent = 'Nueva Rutina';
      nameInput.value = '';
      descInput.value = '';
    }

    selectorContainer.innerHTML = allExercises.map(ex => {
      const isChecked = selectedIds.includes(ex.id) ? 'checked' : '';
      return `
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border-color); cursor: pointer;">
          <div>
            <div style="font-size: 14px; font-weight: 600; color: #fff;">${ex.name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${ex.muscle}</div>
          </div>
          <input type="checkbox" class="routine-ex-checkbox" value="${ex.id}" ${isChecked} style="width: 18px; height: 18px;">
        </label>
      `;
    }).join('');

    modalRoutineEditor.classList.add('active');
  }

  document.getElementById('btn-create-routine-modal')?.addEventListener('click', () => openRoutineModal(null));
  document.getElementById('btn-cancel-routine')?.addEventListener('click', () => {
    modalRoutineEditor.classList.remove('active');
  });

  document.getElementById('btn-save-routine')?.addEventListener('click', () => {
    const name = document.getElementById('routine-input-name').value.trim();
    const desc = document.getElementById('routine-input-desc').value.trim();
    if (!name) {
      alert('Por favor indica un nombre para la rutina.');
      return;
    }

    const checkedBoxes = document.querySelectorAll('.routine-ex-checkbox:checked');
    const exerciseIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (editingRoutineId) {
      window.storageService.updateRoutine(editingRoutineId, {
        name: name,
        description: desc,
        exerciseIds: exerciseIds
      });
    } else {
      window.storageService.addRoutine({
        name: name,
        description: desc,
        exerciseIds: exerciseIds
      });
    }

    modalRoutineEditor.classList.remove('active');
    renderAllRoutines();
  });

  // ==========================================
  // HISTORY VIEW
  // ==========================================
  function renderHistory() {
    const container = document.getElementById('history-container');
    const history = window.storageService.getHistory();
    const settings = window.storageService.getSettings();

    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Aún no hay entrenamientos registrados</div>
          <div style="font-size: 13px;">Comienza una rutina y márcala como finalizada para ver aquí tu historial y estadísticas.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = history.map(item => {
      const dateObj = new Date(item.date);
      const dateFormatted = dateObj.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const exListHtml = (item.exercises || []).map(ex => {
        const setsSummary = ex.sets.map(s => `${s.weight}${item.unit || 'kg'} x ${s.reps}`).join(' • ');
        return `
          <div style="margin-top: 6px; font-size: 13px;">
            <strong style="color: #fff;">${ex.name}:</strong> <span style="color: var(--text-secondary);">${setsSummary}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="history-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="history-date">${dateFormatted}</div>
              <h3 class="history-name">${item.name}</h3>
            </div>
            <button class="btn-danger btn-delete-history-item" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px;">Eliminar</button>
          </div>

          <div class="history-summary">
            <div>⏱ <strong>${item.durationMinutes || 0} min</strong></div>
            <div>⚡ <strong>${item.totalVolume || 0} ${item.unit || settings.unit || 'kg'}</strong></div>
            <div>💪 <strong>${item.totalSets || 0} series</strong></div>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 8px;">
            ${exListHtml}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-delete-history-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Eliminar este registro del historial?')) {
          window.storageService.deleteWorkoutFromHistory(btn.dataset.id);
          renderHistory();
        }
      });
    });
  }

  // ==========================================
  // PROGRESS & PERSONAL RECORDS (PR)
  // ==========================================
  function renderPersonalRecords() {
    const container = document.getElementById('pr-records-list');
    const prs = window.storageService.getPersonalRecords();
    const settings = window.storageService.getSettings();
    const unit = settings.unit || 'kg';

    const prKeys = Object.keys(prs);
    if (prKeys.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px;">
          Completa tus primeros entrenamientos para calcular tus marcas de fuerza máxima y 1RM.
        </div>
      `;
      return;
    }

    container.innerHTML = prKeys.map(k => {
      const record = prs[k];
      const dateFormatted = new Date(record.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <div style="font-weight: 700; font-size: 15px; color: #fff;">${record.exerciseName}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Mejor serie: <strong>${record.maxWeight} ${unit} × ${record.reps} reps</strong> (${dateFormatted})
            </div>
          </div>
          <div style="text-align: right;">
            <div class="pr-badge">1RM: ${record.estimated1RM} ${unit}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // PLATE CALCULATOR (CALCULADORA DE DISCOS)
  // ==========================================
  const modalPlateCalc = document.getElementById('modal-plate-calculator');
  const targetWeightInput = document.getElementById('calc-target-weight');
  const barWeightSelect = document.getElementById('calc-bar-weight');
  const plateDiagram = document.getElementById('plate-calc-discs-output');
  const plateSummary = document.getElementById('plate-calc-summary');

  function openPlateCalculator() {
    calculatePlates();
    modalPlateCalc.classList.add('active');
  }

  function calculatePlates() {
    const target = parseFloat(targetWeightInput.value) || 0;
    const bar = parseFloat(barWeightSelect.value) || 20;
    const settings = window.storageService.getSettings();
    const unit = settings.unit || 'kg';

    document.querySelectorAll('.unit-label').forEach(el => el.textContent = unit);

    if (target < bar) {
      plateDiagram.innerHTML = `<span style="font-size: 13px; color: var(--accent-rose);">El peso objetivo debe ser mayor al de la barra (${bar} ${unit}).</span>`;
      plateSummary.textContent = '';
      return;
    }

    const weightPerSide = (target - bar) / 2;
    const availablePlates = [
      { weight: 25, class: 'plate-25' },
      { weight: 20, class: 'plate-20' },
      { weight: 15, class: 'plate-15' },
      { weight: 10, class: 'plate-10' },
      { weight: 5,  class: 'plate-5' },
      { weight: 2.5, class: 'plate-2-5' },
      { weight: 1.25, class: 'plate-1-25' }
    ];

    let remaining = weightPerSide;
    const discsPerSide = [];

    for (const p of availablePlates) {
      while (remaining >= p.weight - 0.001) {
        discsPerSide.push(p);
        remaining -= p.weight;
      }
    }

    if (discsPerSide.length === 0) {
      plateDiagram.innerHTML = `<span style="font-size: 13px; color: var(--text-secondary);">Solo la barra vacía (${bar} ${unit}).</span>`;
      plateSummary.textContent = `0 ${unit} en cada lado`;
      return;
    }

    plateDiagram.innerHTML = discsPerSide.map(d => {
      return `<div class="plate-disc ${d.class}" title="${d.weight} ${unit}">${d.weight}</div>`;
    }).join('');

    const counts = {};
    discsPerSide.forEach(d => {
      counts[d.weight] = (counts[d.weight] || 0) + 1;
    });

    const summaryText = Object.entries(counts)
      .map(([w, c]) => `${c}x ${w}${unit}`)
      .join(' + ');

    plateSummary.textContent = `${weightPerSide} ${unit} por lado: [${summaryText}]`;
  }

  document.getElementById('btn-plate-calc')?.addEventListener('click', openPlateCalculator);
  document.getElementById('btn-close-plate-calc')?.addEventListener('click', () => {
    modalPlateCalc.classList.remove('active');
  });
  targetWeightInput?.addEventListener('input', calculatePlates);
  barWeightSelect?.addEventListener('change', calculatePlates);

  // ==========================================
  // SETTINGS & BACKUP MODAL
  // ==========================================
  const modalSettings = document.getElementById('modal-settings');
  const settingUnit = document.getElementById('setting-unit');
  const settingRestTime = document.getElementById('setting-rest-time');
  const settingSound = document.getElementById('setting-sound');
  const settingVibrate = document.getElementById('setting-vibrate');

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    const s = window.storageService.getSettings();
    settingUnit.value = s.unit || 'kg';
    settingRestTime.value = s.defaultRestTime || 90;
    settingSound.checked = s.soundEnabled !== false;
    settingVibrate.checked = s.vibrateEnabled !== false;
    modalSettings.classList.add('active');
  });

  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    window.storageService.saveSettings({
      unit: settingUnit.value,
      defaultRestTime: parseInt(settingRestTime.value, 10),
      soundEnabled: settingSound.checked,
      vibrateEnabled: settingVibrate.checked
    });
    modalSettings.classList.remove('active');
    renderWorkoutView();
  });

  // Export JSON Backup
  document.getElementById('btn-export-backup')?.addEventListener('click', () => {
    const jsonStr = window.storageService.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irontrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import JSON Backup
  const importInput = document.getElementById('import-backup-file-input');
  document.getElementById('btn-import-backup-trigger')?.addEventListener('click', () => {
    importInput.click();
  });

  importInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = window.storageService.importBackupJSON(event.target.result);
      if (res.success) {
        alert('¡Copia de seguridad restaurada con éxito!');
        modalSettings.classList.remove('active');
        initWorkoutState();
      } else {
        alert('Error al leer el archivo de copia: ' + res.error);
      }
    };
    reader.readAsText(file);
  });

  // ==========================================
  // WORKOUT SUMMARY MODAL & CELEBRATION
  // ==========================================
  const modalSummary = document.getElementById('modal-workout-summary');
  function showWorkoutSummaryModal(session) {
    document.getElementById('summary-workout-name').textContent = session.name;
    document.getElementById('summary-duration').textContent = `${session.durationMinutes}m`;
    document.getElementById('summary-volume').textContent = `${session.totalVolume} ${session.unit}`;
    document.getElementById('summary-sets').textContent = session.totalSets;

    const prsContainer = document.getElementById('summary-prs-container');
    if (session.prsBroken && session.prsBroken.length > 0) {
      prsContainer.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 12px; margin-top: 10px;">
          <div style="font-weight: 700; color: #fbbf24; margin-bottom: 6px;">🏆 ¡Nuevos Récords Personales!</div>
          ${session.prsBroken.map(pr => `<div style="font-size: 13px; color: #fff;">${pr.exerciseName}: <strong>${pr.weight}${session.unit} × ${pr.reps}</strong> (1RM ~${pr.estimated1RM}${session.unit})</div>`).join('')}
        </div>
      `;
    } else {
      prsContainer.innerHTML = '';
    }

    modalSummary.classList.add('active');
  }

  document.getElementById('btn-close-summary')?.addEventListener('click', () => {
    modalSummary.classList.remove('active');
    switchTab('view-history');
  });

  // ==========================================
  // CONFETTI ANIMATION (2D Canvas Engine)
  // ==========================================
  function triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ffffff'];

    for (let i = 0; i < 90; i++) {
      confettiPieces.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        opacity: 1
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      confettiPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rot += p.rotSpeed;
        p.opacity -= 0.008;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      frame++;
      if (activeCount > 0 && frame < 150) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(animate);
  }

  // Initialize App
  initWorkoutState();
});
