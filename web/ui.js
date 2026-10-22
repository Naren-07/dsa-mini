/**
 * Rover PathLab - UI & HUD Controller
 * Manages HUD readouts, comparison benchmark charts, palette brushes,
 * theme switching, keyboard shortcuts, and sound controls.
 */

import { sound } from './audio.js';
import { assets } from './assets.js';

export class UserInterface {
  constructor() {
    this.theme = localStorage.getItem('rover_pathlab_theme') || 'dark';
    this.initTheme();
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = (this.theme === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('rover_pathlab_theme', this.theme);
    sound.playClick();

    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.innerHTML = this.theme === 'dark' ? '🌙 Night-Side' : '☀️ Daylight';
    }
  }

  /**
   * Initializes palette swatches with sprite icons from atlas
   */
  updatePaletteSwatches() {
    if (!assets.isReady) return;

    const terrainSprites = {
      0: 'ground_plain',
      1: 'ground_rough',
      2: 'ground_mud',
      3: 'ground_sand',
      4: 'rock'
    };

    Object.entries(terrainSprites).forEach(([code, sprName]) => {
      const btn = document.querySelector(`.palette-btn[data-terrain="${code}"] .terrain-swatch`);
      if (btn) {
        const url = assets.getSpriteDataUrl(sprName);
        if (url) {
          btn.style.backgroundImage = `url(${url})`;
          btn.style.backgroundSize = 'cover';
        }
      }
    });

    const startSwatch = document.querySelector('.palette-btn[data-mode="start"] .terrain-swatch');
    if (startSwatch) {
      const url = assets.getSpriteDataUrl('rover');
      if (url) {
        startSwatch.style.backgroundImage = `url(${url})`;
        startSwatch.style.backgroundSize = 'contain';
        startSwatch.textContent = '';
      }
    }

    const goalSwatch = document.querySelector('.palette-btn[data-mode="goal"] .terrain-swatch');
    if (goalSwatch) {
      const url = assets.getSpriteDataUrl('goal');
      if (url) {
        goalSwatch.style.backgroundImage = `url(${url})`;
        goalSwatch.style.backgroundSize = 'contain';
        goalSwatch.textContent = '';
      }
    }
  }

  /**
   * Updates telemetry metrics bar
   */
  updateMetrics({ steps, cost, explored, replans, runtime, maxFrontier }) {
    const valSteps = document.getElementById('valSteps');
    const valCost = document.getElementById('valCost');
    const valExplored = document.getElementById('valExplored');
    const valReplans = document.getElementById('valReplans');
    const valRuntime = document.getElementById('valRuntime');

    if (valSteps) valSteps.textContent = steps != null ? steps : '--';
    if (valCost) valCost.textContent = cost != null ? cost : '--';
    if (valExplored) valExplored.textContent = explored != null ? explored : '--';
    if (valReplans) valReplans.textContent = replans != null ? replans : '0';
    if (valRuntime) valRuntime.textContent = runtime != null ? `${runtime} µs` : '-- µs';
  }

  /**
   * Sets top status banner
   */
  setStatus(text, type = 'ready') {
    const statusText = document.getElementById('missionStatusText');
    if (!statusText) return;

    statusText.textContent = text;
    statusText.className = 'info-pill';

    if (type === 'ready') statusText.classList.add('status-ready');
    else if (type === 'working') statusText.classList.add('status-working');
    else if (type === 'alert') statusText.classList.add('status-alert');
    else if (type === 'error') statusText.classList.add('status-error');
  }

  /**
   * Updates backend connection status badge
   */
  setBackendStatus(online, version = 'v2.0') {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (!dot || !text) return;

    if (online) {
      dot.className = 'status-dot connected';
      text.textContent = `Engine Online (${version})`;
    } else {
      dot.className = 'status-dot pulsing';
      text.textContent = 'Engine Offline / Reconnecting...';
    }
  }

  /**
   * Populates Compare Modal with benchmarks and micro bar charts
   */
  populateCompareModal(results) {
    const tbody = document.getElementById('compareTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const algos = ['astar', 'dijkstra', 'bfs', 'greedy'];
    const labels = {
      astar: 'A* Search (Manhattan)',
      dijkstra: "Dijkstra's Algorithm",
      bfs: 'Breadth-First Search (BFS)',
      greedy: 'Greedy Best-First'
    };

    // Calculate maximums for bar chart scaling
    let maxCost = 1;
    let maxExplored = 1;
    let maxTime = 1;

    algos.forEach(k => {
      const r = results[k];
      if (r && r.found) {
        if (r.cost > maxCost) maxCost = r.cost;
        const exp = r.explored_count != null ? r.explored_count : (r.explored ? r.explored.length : 1);
        if (exp > maxExplored) maxExplored = exp;
        if (r.duration_us > maxTime) maxTime = r.duration_us;
      }
    });

    algos.forEach(k => {
      const r = results[k];
      if (!r) return;

      const tr = document.createElement('tr');
      const exploredCount = r.explored_count != null ? r.explored_count : (r.explored ? r.explored.length : 0);
      const costPct = r.found ? Math.round((r.cost / maxCost) * 100) : 0;
      const expPct = Math.round((exploredCount / maxExplored) * 100);
      const timePct = Math.round(((r.duration_us || 0) / maxTime) * 100);

      tr.innerHTML = `
        <td><strong>${labels[k] || k}</strong></td>
        <td>${r.found ? r.steps : '<span class="text-danger">Unreachable</span>'}</td>
        <td>
          <div class="metric-bar-cell">
            <span>${r.found ? r.cost : 'N/A'}</span>
            <div class="micro-bar-bg"><div class="micro-bar-fill cyan" style="width: ${costPct}%"></div></div>
          </div>
        </td>
        <td>
          <div class="metric-bar-cell">
            <span>${exploredCount}</span>
            <div class="micro-bar-bg"><div class="micro-bar-fill amber" style="width: ${expPct}%"></div></div>
          </div>
        </td>
        <td>${r.max_frontier || '--'}</td>
        <td>
          <div class="metric-bar-cell">
            <span>${r.duration_us || 0} µs</span>
            <div class="micro-bar-bg"><div class="micro-bar-fill green" style="width: ${timePct}%"></div></div>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const modal = document.getElementById('compareModal');
    if (modal) modal.classList.remove('hidden');
  }

  /**
   * Transient Toast Notification
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-pill ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

export const ui = new UserInterface();
