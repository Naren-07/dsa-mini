/**
 * Rover PathLab - Main Application Orchestrator
 * Connects API, Assets, Audio, Renderer, Simulation Player, and UI.
 */

import { api } from './api.js';
import { assets } from './assets.js';
import { sound } from './audio.js';
import { MarsRenderer } from './renderer.js';
import { SimulationPlayer } from './player.js';
import { ui } from './ui.js';

// Application State
const state = {
  width: 24,
  height: 16,
  grid: new Uint8Array(24 * 16),
  start: { x: 1, y: 1 },
  goal: { x: 22, y: 14 },
  activeBrush: 0, // 0-4 or 'start' or 'goal'
  isMouseDown: false,

  currentPath: [],
  currentExplored: [],
  simulationData: null,
  simTick: 0
};

// Global singletons
let renderer = null;
let player = null;
let canvas = null;

/**
 * Bootstrap Application
 */
async function init() {
  canvas = document.getElementById('navCanvas');
  renderer = new MarsRenderer(canvas);
  player = new SimulationPlayer(renderer);

  // Set initial dimensions
  renderer.resize(state.width, state.height);
  updateGridDimText();

  // Load assets
  await assets.load();
  ui.updatePaletteSwatches();
  renderer.markTerrainDirty();

  // Attach event handlers
  attachDomEvents();
  attachPointerEvents();
  attachKeyboardEvents();

  // Setup player callbacks
  player.onTickChange = (tick) => {
    state.simTick = tick;
    const tickEl = document.getElementById('simTickText');
    if (tickEl) tickEl.textContent = `Tick: ${tick}`;
  };

  player.onStatusChange = (status) => {
    const playBtn = document.getElementById('btnPlayPause');
    if (playBtn) {
      playBtn.textContent = status === 'PLAYING' ? '⏸️' : '▶️';
    }
  };

  player.onComplete = () => {
    ui.setStatus('GOAL REACHED', 'ready');
    ui.showToast('Mars Rover arrived safely at landing site!', 'success');
  };

  // Check health periodically
  checkHealth();
  setInterval(checkHealth, 5000);

  // Generate initial procedural map
  generateProceduralMap();

  // Start 60fps render loop
  requestAnimationFrame(gameLoop);
}

/**
 * 60fps Animation Loop
 */
function gameLoop(timestamp) {
  const renderOptions = player.update(timestamp, state);
  renderer.render(state, renderOptions);
  requestAnimationFrame(gameLoop);
}

/**
 * Health check
 */
async function checkHealth() {
  const res = await api.checkHealth();
  if (res.status === 'ok') {
    ui.setBackendStatus(true, res.version || 'v2.0');
  } else {
    ui.setBackendStatus(false);
  }
}

/**
 * Grid Dimension Indicator
 */
function updateGridDimText() {
  const el = document.getElementById('gridDimText');
  if (el) el.textContent = `Grid: ${state.width} × ${state.height}`;
}

/**
 * Canvas Pointer & Touch Handling
 */
function attachPointerEvents() {
  const handlePointer = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = (state.width * renderer.cellSize) / rect.width;
    const scaleY = (state.height * renderer.cellSize) / rect.height;

    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;

    const cellX = Math.floor(mouseX / renderer.cellSize);
    const cellY = Math.floor(mouseY / renderer.cellSize);

    if (cellX < 0 || cellX >= state.width || cellY < 0 || cellY >= state.height) return;

    if (state.activeBrush === 'start') {
      if (cellX !== state.goal.x || cellY !== state.goal.y) {
        state.start = { x: cellX, y: cellY };
        state.grid[cellY * state.width + cellX] = 0;
        renderer.markTerrainDirty();
      }
    } else if (state.activeBrush === 'goal') {
      if (cellX !== state.start.x || cellY !== state.start.y) {
        state.goal = { x: cellX, y: cellY };
        state.grid[cellY * state.width + cellX] = 0;
        renderer.markTerrainDirty();
      }
    } else {
      if ((cellX !== state.start.x || cellY !== state.start.y) &&
          (cellX !== state.goal.x || cellY !== state.goal.y)) {
        const idx = cellY * state.width + cellX;
        if (state.grid[idx] !== state.activeBrush) {
          state.grid[idx] = state.activeBrush;
          renderer.markTerrainDirty();
        }
      }
    }

    // Reset current trajectory when user edits map
    if (state.currentPath.length > 0 || state.simulationData) {
      state.currentPath = [];
      state.currentExplored = [];
      player.stop();
      state.simulationData = null;
    }
  };

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    state.isMouseDown = true;
    handlePointer(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', () => {
    state.isMouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (state.isMouseDown) {
      handlePointer(e.clientX, e.clientY);
    }
  });

  // Touch events for mobile/tablet
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      state.isMouseDown = true;
      const t = e.touches[0];
      handlePointer(t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (state.isMouseDown && e.touches.length > 0) {
      const t = e.touches[0];
      handlePointer(t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    state.isMouseDown = false;
  });
}

/**
 * DOM Actions and Control Handlers
 */
function attachDomEvents() {
  // 1. Palette Buttons
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.terrain !== undefined) {
        state.activeBrush = parseInt(btn.dataset.terrain, 10);
      } else if (btn.dataset.mode) {
        state.activeBrush = btn.dataset.mode;
      }
      sound.playClick();
    });
  });

  // 2. Primary Actions
  const btnPlan = document.getElementById('btnPlan');
  if (btnPlan) btnPlan.addEventListener('click', computePlan);

  const btnCompare = document.getElementById('btnCompare');
  if (btnCompare) btnCompare.addEventListener('click', compareAllAlgorithms);

  const btnSimulate = document.getElementById('btnSimulate');
  if (btnSimulate) btnSimulate.addEventListener('click', simulateDynamicPatrols);

  // 3. Map Generator
  const btnGenerateMap = document.getElementById('btnGenerateMap');
  if (btnGenerateMap) btnGenerateMap.addEventListener('click', () => generateProceduralMap());

  const btnRndSeed = document.getElementById('btnRndSeed');
  if (btnRndSeed) {
    btnRndSeed.addEventListener('click', () => {
      const seedInput = document.getElementById('mapSeedInput');
      if (seedInput) seedInput.value = Math.floor(Math.random() * 100000);
      generateProceduralMap();
      sound.playClick();
    });
  }

  document.querySelectorAll('.pill-btn[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      generateProceduralMap(btn.dataset.preset);
      sound.playClick();
    });
  });

  const btnResetClear = document.getElementById('btnResetClear');
  if (btnResetClear) {
    btnResetClear.addEventListener('click', () => {
      state.grid.fill(0);
      state.currentPath = [];
      state.currentExplored = [];
      player.stop();
      state.simulationData = null;
      renderer.markTerrainDirty();
      ui.setStatus('READY', 'ready');
      sound.playClick();
    });
  }

  // 4. Grid Size Selector (if present)
  const gridSizeSelect = document.getElementById('gridSizeSelect');
  if (gridSizeSelect) {
    gridSizeSelect.addEventListener('change', (e) => {
      const [w, h] = e.target.value.split('x').map(Number);
      changeGridSize(w, h);
    });
  }

  // 5. Sliders
  const sliderObstacles = document.getElementById('sliderObstacles');
  const valObstacles = document.getElementById('valObstacles');
  if (sliderObstacles && valObstacles) {
    sliderObstacles.addEventListener('input', (e) => {
      valObstacles.textContent = e.target.value;
    });
  }

  const sliderSpeed = document.getElementById('sliderSpeed');
  const valSpeed = document.getElementById('valSpeed');
  if (sliderSpeed && valSpeed) {
    sliderSpeed.addEventListener('input', (e) => {
      const speed = parseInt(e.target.value, 10);
      valSpeed.textContent = `${speed}x`;
      player.setSpeed(speed);
    });
  }

  // 6. Playback controls
  const btnPlayPause = document.getElementById('btnPlayPause');
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      player.togglePlay();
      sound.playClick();
    });
  }

  const btnStepForward = document.getElementById('btnStepForward');
  if (btnStepForward) {
    btnStepForward.addEventListener('click', () => {
      player.step();
      sound.playClick();
    });
  }

  const btnStopSim = document.getElementById('btnStopSim');
  if (btnStopSim) {
    btnStopSim.addEventListener('click', () => {
      player.stop();
      ui.setStatus('READY', 'ready');
      sound.playClick();
    });
  }

  // 7. Modals
  const btnCloseModal = document.getElementById('btnCloseModal');
  const compareModal = document.getElementById('compareModal');
  if (btnCloseModal && compareModal) {
    btnCloseModal.addEventListener('click', () => {
      compareModal.classList.add('hidden');
      sound.playClick();
    });
  }

  // 8. Header Toggles
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => ui.toggleTheme());
  }

  const btnSoundToggle = document.getElementById('btnSoundToggle');
  if (btnSoundToggle) {
    btnSoundToggle.addEventListener('click', () => {
      const muted = sound.toggleMute();
      btnSoundToggle.innerHTML = muted ? '🔇 Audio Off' : '🔊 Audio On';
    });
  }

  const btnToggleGrid = document.getElementById('btnToggleGrid');
  if (btnToggleGrid) {
    btnToggleGrid.addEventListener('click', () => {
      renderer.showGridLines = !renderer.showGridLines;
      btnToggleGrid.classList.toggle('active', renderer.showGridLines);
      sound.playClick();
    });
  }

  const btnToggleHeatmap = document.getElementById('btnToggleHeatmap');
  if (btnToggleHeatmap) {
    btnToggleHeatmap.addEventListener('click', () => {
      renderer.showHeatMap = !renderer.showHeatMap;
      btnToggleHeatmap.classList.toggle('active', renderer.showHeatMap);
      sound.playClick();
    });
  }

  const btnZoomFit = document.getElementById('btnZoomFit');
  if (btnZoomFit) {
    btnZoomFit.addEventListener('click', () => {
      renderer.resize(state.width, state.height);
      sound.playClick();
    });
  }
}

/**
 * Keyboard Shortcuts
 */
function attachKeyboardEvents() {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering when focused in an input
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      player.togglePlay();
      sound.playClick();
    } else if (e.code === 'KeyS') {
      player.step();
      sound.playClick();
    } else if (e.code === 'KeyR') {
      player.stop();
      sound.playClick();
    } else if (e.code === 'KeyP') {
      computePlan();
    } else if (e.code === 'KeyC') {
      compareAllAlgorithms();
    } else if (e.code === 'KeyM') {
      const btnSoundToggle = document.getElementById('btnSoundToggle');
      const muted = sound.toggleMute();
      if (btnSoundToggle) {
        btnSoundToggle.innerHTML = muted ? '🔇 Audio Off' : '🔊 Audio On';
      }
    }
  });
}

/**
 * Change grid dimensions
 */
function changeGridSize(w, h) {
  state.width = w;
  state.height = h;
  state.grid = new Uint8Array(w * h);
  state.start = { x: 1, y: 1 };
  state.goal = { x: w - 2, y: h - 2 };
  state.currentPath = [];
  state.currentExplored = [];
  state.simulationData = null;

  renderer.resize(w, h);
  updateGridDimText();
  generateProceduralMap();
}

/**
 * Procedural Map Generation
 */
async function generateProceduralMap(preset = null) {
  const seedInput = document.getElementById('mapSeedInput');
  const seed = (seedInput && parseInt(seedInput.value, 10)) || Math.floor(Math.random() * 100000);
  if (seedInput) seedInput.value = seed;

  ui.setStatus('GENERATING MAP...', 'working');

  try {
    const data = await api.getRandomMap(state.width, state.height, seed, preset);
    state.grid = new Uint8Array(data.terrain);
    if (data.start) state.start = { x: data.start[0], y: data.start[1] };
    if (data.goal) state.goal = { x: data.goal[0], y: data.goal[1] };

    state.currentPath = [];
    state.currentExplored = [];
    player.stop();
    state.simulationData = null;

    renderer.markTerrainDirty();
    ui.setStatus('READY', 'ready');
    ui.showToast(`Map loaded (${preset || 'procedural'}, seed ${seed})`, 'info');
  } catch (err) {
    ui.setStatus('MAP ERROR', 'error');
    alert(`Map Generation Error: ${err.message}`);
  }
}

/**
 * Compute Optimal Navigation Plan
 */
async function computePlan() {
  const algoSelect = document.getElementById('algoSelect');
  const algo = algoSelect ? algoSelect.value : 'astar';

  ui.setStatus(`PLANNING (${algo.toUpperCase()})...`, 'working');
  sound.playRadar();

  try {
    const data = await api.computePlan({
      algorithm: algo,
      width: state.width,
      height: state.height,
      terrain: state.grid,
      start: state.start,
      goal: state.goal
    });

    state.currentPath = data.path || [];
    state.currentExplored = data.explored || [];
    player.stop();
    state.simulationData = null;

    ui.updateMetrics({
      steps: data.steps,
      cost: data.cost,
      explored: data.explored_count != null ? data.explored_count : (data.explored ? data.explored.length : 0),
      replans: 0,
      runtime: data.duration_us,
      maxFrontier: data.max_frontier
    });

    if (data.found) {
      ui.setStatus('PATH COMPUTED', 'ready');
      sound.playClick();
      ui.showToast(`Path computed: ${data.steps} steps, cost ${data.cost}`, 'success');
    } else {
      ui.setStatus('UNREACHABLE', 'alert');
      sound.playReplan();
      ui.showToast('Target is enclosed and unreachable!', 'warning');
    }
  } catch (err) {
    ui.setStatus('ERROR', 'error');
    alert(`Planning Error: ${err.message}`);
  }
}

/**
 * Compare all 4 search algorithms
 */
async function compareAllAlgorithms() {
  ui.setStatus('BENCHMARKING ALGORITHMS...', 'working');
  sound.playRadar();

  try {
    const data = await api.compareAlgorithms({
      width: state.width,
      height: state.height,
      terrain: state.grid,
      start: state.start,
      goal: state.goal
    });

    ui.populateCompareModal(data);
    ui.setStatus('BENCHMARK READY', 'ready');
    sound.playClick();
    ui.showToast('All 4 algorithms benchmarked!', 'info');
  } catch (err) {
    ui.setStatus('ERROR', 'error');
    alert(`Comparison Error: ${err.message}`);
  }
}

/**
 * Simulate Dynamic Patrol Patrols and Online Replanning
 */
async function simulateDynamicPatrols() {
  const algoSelect = document.getElementById('algoSelect');
  const algo = algoSelect ? algoSelect.value : 'astar';

  const sliderObstacles = document.getElementById('sliderObstacles');
  const obstacleCount = sliderObstacles ? parseInt(sliderObstacles.value, 10) : 8;

  const mapSeedInput = document.getElementById('mapSeedInput');
  const seed = (mapSeedInput && parseInt(mapSeedInput.value, 10)) || 42;

  ui.setStatus('SIMULATING DYNAMIC PATROLS...', 'working');
  sound.playRadar();

  try {
    const data = await api.simulatePatrols({
      algorithm: algo,
      width: state.width,
      height: state.height,
      terrain: state.grid,
      start: state.start,
      goal: state.goal,
      obstacleCount,
      seed
    });

    state.simulationData = data;
    state.currentPath = (data.trajectory || []).map(p => [p.x, p.y]);
    state.currentExplored = [];

    ui.updateMetrics({
      steps: data.total_steps,
      cost: data.total_cost,
      explored: data.total_explored,
      replans: data.replan_count,
      runtime: data.total_duration_us
    });

    ui.setStatus(data.status ? data.status.toUpperCase() : 'PATROL READY', 'ready');
    player.loadSimulation(data);
    player.play();

    ui.showToast(`Simulation started: ${data.total_steps} ticks, ${data.replan_count} replans`, 'info');
  } catch (err) {
    ui.setStatus('SIMULATION ERROR', 'error');
    alert(`Simulation Error: ${err.message}`);
  }
}

// Launch on DOM ready
window.addEventListener('DOMContentLoaded', init);
