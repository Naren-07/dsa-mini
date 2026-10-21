/**
 * Rover PathLab - Autonomous Planetary Navigation Studio
 * Frontend Client & Interactive Canvas Controller
 */

// Configuration & Default State
const CONFIG = {
  width: 24,
  height: 16,
  cellSize: 36,
  apiBase: '' // Same origin
};

const TERRAIN = {
  PLAIN: 0,
  ROUGH: 1,
  MUD: 2,
  SAND: 3,
  ROCK: 4
};

const TERRAIN_COLORS = {
  0: '#1a2233', // Plain
  1: '#4a3b2c', // Rough
  2: '#362819', // Mud
  3: '#635324', // Sand
  4: '#0d0f18'  // Rock
};

const TERRAIN_NAMES = {
  0: 'Plain (1)',
  1: 'Rough (2)',
  2: 'Mud (3)',
  3: 'Sand (5)',
  4: 'Rock (Impassable)'
};

const state = {
  width: CONFIG.width,
  height: CONFIG.height,
  grid: new Uint8Array(CONFIG.width * CONFIG.height),
  start: { x: 1, y: 1 },
  goal: { x: CONFIG.width - 2, y: CONFIG.height - 2 },
  activeBrush: TERRAIN.PLAIN, // 0-4 or 'start' or 'goal'
  isMouseDown: false,
  
  // Results
  currentPath: [],
  currentExplored: [],
  metrics: null,

  // Simulation
  simulationData: null,
  simTick: 0,
  isPlaying: false,
  playbackSpeed: 5,
  simTimer: null
};

// DOM Elements
const canvas = document.getElementById('navCanvas');
const ctx = canvas.getContext('2d');
const backendStatusBadge = document.getElementById('backendStatusBadge');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

const valSteps = document.getElementById('valSteps');
const valCost = document.getElementById('valCost');
const valExplored = document.getElementById('valExplored');
const valReplans = document.getElementById('valReplans');
const valRuntime = document.getElementById('valRuntime');
const simTickText = document.getElementById('simTickText');
const missionStatusText = document.getElementById('missionStatusText');

const algoSelect = document.getElementById('algoSelect');
const mapSeedInput = document.getElementById('mapSeedInput');
const sliderObstacles = document.getElementById('sliderObstacles');
const valObstacles = document.getElementById('valObstacles');
const sliderSpeed = document.getElementById('sliderSpeed');
const valSpeed = document.getElementById('valSpeed');

const compareModal = document.getElementById('compareModal');
const compareTableBody = document.getElementById('compareTableBody');

// --- Initialization ---
function init() {
  setupCanvasDimensions();
  attachEventListeners();
  checkBackendHealth();
  setInterval(checkBackendHealth, 5000);
  renderGrid();
}

function setupCanvasDimensions() {
  canvas.width = state.width * CONFIG.cellSize;
  canvas.height = state.height * CONFIG.cellSize;
}

// --- Health Check ---
async function checkBackendHealth() {
  try {
    const res = await fetch(`${CONFIG.apiBase}/api/health`);
    if (res.ok) {
      const data = await res.json();
      statusDot.className = 'status-dot connected';
      statusText.textContent = `Engine Connected (${data.version || 'v2.0'})`;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    statusDot.className = 'status-dot pulsing';
    statusText.textContent = 'Backend Reconnecting...';
  }
}

// --- Canvas Rendering ---
function renderGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Terrain Cells
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const idx = y * state.width + x;
      const type = state.grid[idx];
      const px = x * CONFIG.cellSize;
      const py = y * CONFIG.cellSize;

      // Base terrain fill
      ctx.fillStyle = TERRAIN_COLORS[type] || '#111';
      ctx.fillRect(px, py, CONFIG.cellSize, CONFIG.cellSize);

      // Cell border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, CONFIG.cellSize, CONFIG.cellSize);

      // Rock pattern
      if (type === TERRAIN.ROCK) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px + 1, py + 1, CONFIG.cellSize - 2, CONFIG.cellSize - 2);
        
        ctx.beginPath();
        ctx.moveTo(px + 4, py + CONFIG.cellSize - 4);
        ctx.lineTo(px + CONFIG.cellSize - 4, py + 4);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.stroke();
      }
    }
  }

  // 2. Draw Explored Heat Map (if available)
  if (state.currentExplored && state.currentExplored.length > 0) {
    const total = state.currentExplored.length;
    state.currentExplored.forEach((cellIdx, i) => {
      const x = cellIdx % state.width;
      const y = Math.floor(cellIdx / state.width);
      if (isStart(x, y) || isGoal(x, y)) return;

      const px = x * CONFIG.cellSize;
      const py = y * CONFIG.cellSize;
      const ratio = i / total;

      ctx.fillStyle = `rgba(0, 240, 255, ${0.12 + ratio * 0.22})`;
      ctx.fillRect(px + 2, py + 2, CONFIG.cellSize - 4, CONFIG.cellSize - 4);
    });
  }

  // 3. Draw Path Line
  if (state.currentPath && state.currentPath.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    state.currentPath.forEach((pt, i) => {
      const cx = pt[0] * CONFIG.cellSize + CONFIG.cellSize / 2;
      const cy = pt[1] * CONFIG.cellSize + CONFIG.cellSize / 2;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }

  // 4. Draw Dynamic Obstacles (Simulation mode)
  if (state.simulationData && state.simulationData.obstacles_per_tick) {
    const currentObstacles = state.simulationData.obstacles_per_tick[state.simTick] || [];
    currentObstacles.forEach(obs => {
      const cx = obs[0] * CONFIG.cellSize + CONFIG.cellSize / 2;
      const cy = obs[1] * CONFIG.cellSize + CONFIG.cellSize / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, CONFIG.cellSize / 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // 5. Draw Rover Position (Trajectory in simulation or Start flag)
  let roverX = state.start.x;
  let roverY = state.start.y;
  if (state.simulationData && state.simulationData.trajectory) {
    const step = state.simulationData.trajectory[state.simTick];
    if (step) {
      roverX = step.x;
      roverY = step.y;
    }
  }

  drawRover(roverX, roverY);

  // 6. Draw Goal Flag
  drawGoal(state.goal.x, state.goal.y);
}

function drawRover(x, y) {
  const cx = x * CONFIG.cellSize + CONFIG.cellSize / 2;
  const cy = y * CONFIG.cellSize + CONFIG.cellSize / 2;
  const r = CONFIG.cellSize / 2.6;

  // Glow halo
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.fill();

  // Rover Chassis
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rover Center Lens
  ctx.beginPath();
  ctx.arc(cx, cy, r / 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#06070a';
  ctx.fill();
}

function drawGoal(x, y) {
  const cx = x * CONFIG.cellSize + CONFIG.cellSize / 2;
  const cy = y * CONFIG.cellSize + CONFIG.cellSize / 2;
  const r = CONFIG.cellSize / 2.6;

  // Halo
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.fill();

  // Target ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Inner bullseye
  ctx.beginPath();
  ctx.arc(cx, cy, r / 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function isStart(x, y) { return x === state.start.x && y === state.start.y; }
function isGoal(x, y) { return x === state.goal.x && y === state.goal.y; }

// --- Mouse Interaction ---
function handleCanvasPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  const cellX = Math.floor(mouseX / CONFIG.cellSize);
  const cellY = Math.floor(mouseY / CONFIG.cellSize);

  if (cellX < 0 || cellX >= state.width || cellY < 0 || cellY >= state.height) return;

  if (state.activeBrush === 'start') {
    if (!isGoal(cellX, cellY)) {
      state.start = { x: cellX, y: cellY };
      state.grid[cellY * state.width + cellX] = TERRAIN.PLAIN;
    }
  } else if (state.activeBrush === 'goal') {
    if (!isStart(cellX, cellY)) {
      state.goal = { x: cellX, y: cellY };
      state.grid[cellY * state.width + cellX] = TERRAIN.PLAIN;
    }
  } else {
    // Terrain paint
    if (!isStart(cellX, cellY) && !isGoal(cellX, cellY)) {
      state.grid[cellY * state.width + cellX] = state.activeBrush;
    }
  }

  // Clear previous path upon edits
  state.currentPath = [];
  state.currentExplored = [];
  renderGrid();
}

// --- API Calls ---
async function computePlan() {
  const algo = algoSelect.value;
  missionStatusText.textContent = `PLANNING (${algo.toUpperCase()})...`;

  const payload = {
    algorithm: algo,
    grid: {
      width: state.width,
      height: state.height,
      terrain: Array.from(state.grid)
    },
    start: [state.start.x, state.start.y],
    goal: [state.goal.x, state.goal.y]
  };

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    state.currentPath = data.path || [];
    state.currentExplored = data.explored || [];
    state.simulationData = null; // Exit simulation view

    // Update telemetry deck
    valSteps.textContent = data.steps != null ? data.steps : '--';
    valCost.textContent = data.cost != null ? data.cost : '--';
    valExplored.textContent = data.explored_count != null ? data.explored_count : (data.explored ? data.explored.length : '--');
    valReplans.textContent = '0';
    valRuntime.textContent = `${data.duration_us || 0} µs`;

    missionStatusText.textContent = data.found ? 'PATH COMPUTED' : 'UNREACHABLE';
    renderGrid();
  } catch (err) {
    alert(`Planning Error: ${err.message}`);
    missionStatusText.textContent = 'ERROR';
  }
}

async function compareAlgorithms() {
  const payload = {
    grid: {
      width: state.width,
      height: state.height,
      terrain: Array.from(state.grid)
    },
    start: [state.start.x, state.start.y],
    goal: [state.goal.x, state.goal.y]
  };

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    populateCompareTable(data);
    compareModal.classList.remove('hidden');
  } catch (err) {
    alert(`Comparison Error: ${err.message}`);
  }
}

function populateCompareTable(results) {
  compareTableBody.innerHTML = '';
  const algos = ['astar', 'dijkstra', 'bfs', 'greedy'];
  const labels = {
    astar: 'A* Search',
    dijkstra: "Dijkstra's Algorithm",
    bfs: 'Breadth-First Search (BFS)',
    greedy: 'Greedy Best-First'
  };

  algos.forEach(key => {
    const r = results[key];
    if (!r) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${labels[key] || key}</strong></td>
      <td>${r.found ? r.steps : 'N/A'}</td>
      <td style="color: var(--accent-cyan)">${r.found ? r.cost : 'N/A'}</td>
      <td>${r.explored_count != null ? r.explored_count : (r.explored ? r.explored.length : '--')}</td>
      <td>${r.max_frontier || '--'}</td>
      <td>${r.duration_us || 0} µs</td>
    `;
    compareTableBody.appendChild(tr);
  });
}

async function simulateDynamicPatrols() {
  const algo = algoSelect.value;
  const obstacleCount = parseInt(sliderObstacles.value, 10);
  const seed = parseInt(mapSeedInput.value, 10) || 42;

  missionStatusText.textContent = 'SIMULATING PATROLS...';

  const payload = {
    algorithm: algo,
    grid: {
      width: state.width,
      height: state.height,
      terrain: Array.from(state.grid)
    },
    start: [state.start.x, state.start.y],
    goal: [state.goal.x, state.goal.y],
    obstacle_count: obstacleCount,
    seed: seed
  };

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    state.simulationData = data;
    state.simTick = 0;
    state.currentPath = [];
    state.currentExplored = [];

    // Telemetry updates
    valSteps.textContent = data.total_steps || 0;
    valCost.textContent = data.total_cost || 0;
    valExplored.textContent = data.total_explored || 0;
    valReplans.textContent = data.replan_count || 0;
    valRuntime.textContent = `${data.total_duration_us || 0} µs`;
    missionStatusText.textContent = data.status || 'SIMULATION READY';

    playSimulation();
  } catch (err) {
    alert(`Simulation Error: ${err.message}`);
    missionStatusText.textContent = 'ERROR';
  }
}

// --- Simulation Playback ---
function playSimulation() {
  if (!state.simulationData) return;
  state.isPlaying = true;
  document.getElementById('btnPlayPause').textContent = '⏸️';

  clearInterval(state.simTimer);
  const intervalMs = Math.max(20, Math.floor(600 / state.playbackSpeed));

  state.simTimer = setInterval(() => {
    if (!state.simulationData) return;
    const maxTicks = (state.simulationData.trajectory || []).length - 1;

    if (state.simTick < maxTicks) {
      state.simTick++;
      simTickText.textContent = `Tick: ${state.simTick}`;
      renderGrid();
    } else {
      pauseSimulation();
    }
  }, intervalMs);
}

function pauseSimulation() {
  state.isPlaying = false;
  document.getElementById('btnPlayPause').textContent = '▶️';
  clearInterval(state.simTimer);
}

function stepSimulation() {
  pauseSimulation();
  if (!state.simulationData) return;
  const maxTicks = (state.simulationData.trajectory || []).length - 1;
  if (state.simTick < maxTicks) {
    state.simTick++;
    simTickText.textContent = `Tick: ${state.simTick}`;
    renderGrid();
  }
}

function stopSimulation() {
  pauseSimulation();
  state.simTick = 0;
  state.simulationData = null;
  simTickText.textContent = 'Tick: 0';
  renderGrid();
}

// --- Map Generator ---
async function generateProceduralMap(preset = null) {
  const seed = parseInt(mapSeedInput.value, 10) || Math.floor(Math.random() * 100000);
  mapSeedInput.value = seed;

  let query = `width=${state.width}&height=${state.height}&seed=${seed}`;
  if (preset) {
    query += `&preset=${preset}`;
  }

  try {
    const res = await fetch(`${CONFIG.apiBase}/api/random-map?${query}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    state.grid = new Uint8Array(data.terrain);
    if (data.start) state.start = { x: data.start[0], y: data.start[1] };
    if (data.goal) state.goal = { x: data.goal[0], y: data.goal[1] };

    state.currentPath = [];
    state.currentExplored = [];
    state.simulationData = null;
    renderGrid();
  } catch (err) {
    alert(`Map Generation Error: ${err.message}`);
  }
}

// --- Event Listeners ---
function attachEventListeners() {
  // Brush buttons
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.dataset.terrain !== undefined) {
        state.activeBrush = parseInt(btn.dataset.terrain, 10);
      } else if (btn.dataset.mode) {
        state.activeBrush = btn.dataset.mode;
      }
    });
  });

  // Canvas interaction
  canvas.addEventListener('mousedown', e => {
    state.isMouseDown = true;
    handleCanvasPointer(e);
  });

  window.addEventListener('mouseup', () => {
    state.isMouseDown = false;
  });

  canvas.addEventListener('mousemove', e => {
    if (state.isMouseDown) handleCanvasPointer(e);
  });

  // Action buttons
  document.getElementById('btnPlan').addEventListener('click', computePlan);
  document.getElementById('btnCompare').addEventListener('click', compareAlgorithms);
  document.getElementById('btnSimulate').addEventListener('click', simulateDynamicPatrols);

  // Modal close
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    compareModal.classList.add('hidden');
  });

  // Presets & Randomize
  document.getElementById('btnGenerateMap').addEventListener('click', () => generateProceduralMap());
  document.getElementById('btnRndSeed').addEventListener('click', () => {
    mapSeedInput.value = Math.floor(Math.random() * 100000);
    generateProceduralMap();
  });

  document.querySelectorAll('.pill-btn[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => generateProceduralMap(btn.dataset.preset));
  });

  document.getElementById('btnResetClear').addEventListener('click', () => {
    state.grid.fill(TERRAIN.PLAIN);
    state.currentPath = [];
    state.currentExplored = [];
    state.simulationData = null;
    renderGrid();
  });

  // Sliders
  sliderObstacles.addEventListener('input', e => {
    valObstacles.textContent = e.target.value;
  });

  sliderSpeed.addEventListener('input', e => {
    state.playbackSpeed = parseInt(e.target.value, 10);
    valSpeed.textContent = `${state.playbackSpeed}x`;
    if (state.isPlaying) playSimulation(); // Adjust interval
  });

  // Sim controls
  document.getElementById('btnPlayPause').addEventListener('click', () => {
    if (state.isPlaying) pauseSimulation();
    else playSimulation();
  });

  document.getElementById('btnStepForward').addEventListener('click', stepSimulation);
  document.getElementById('btnStopSim').addEventListener('click', stopSimulation);
}

// Start app
window.addEventListener('DOMContentLoaded', init);
