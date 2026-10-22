/**
 * Rover PathLab - API Client Module
 * Handles all HTTP communication with the C++ backend engine.
 */

export const api = {
  baseUrl: '',

  /**
   * Health check endpoint
   */
  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  },

  /**
   * Request procedural random map
   */
  async getRandomMap(width, height, seed, preset = null) {
    let url = `${this.baseUrl}/api/random-map?width=${width}&height=${height}&seed=${seed}`;
    if (preset) {
      url += `&preset=${encodeURIComponent(preset)}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate map (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * Compute static path using selected algorithm
   */
  async computePlan({ algorithm, width, height, terrain, start, goal }) {
    const payload = {
      algorithm,
      grid: {
        width,
        height,
        terrain: Array.from(terrain)
      },
      start: [start.x, start.y],
      goal: [goal.x, goal.y]
    };

    const res = await fetch(`${this.baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Plan computation error (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * Compare all 4 search algorithms on the current grid
   */
  async compareAlgorithms({ width, height, terrain, start, goal }) {
    const payload = {
      grid: {
        width,
        height,
        terrain: Array.from(terrain)
      },
      start: [start.x, start.y],
      goal: [goal.x, goal.y]
    };

    const res = await fetch(`${this.baseUrl}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Comparison failed (HTTP ${res.status})`);
    }

    return await res.json();
  },

  /**
   * Simulate dynamic patrols & online replanning
   */
  async simulatePatrols({ algorithm, width, height, terrain, start, goal, obstacleCount, seed }) {
    const payload = {
      algorithm,
      grid: {
        width,
        height,
        terrain: Array.from(terrain)
      },
      start: [start.x, start.y],
      goal: [goal.x, goal.y],
      obstacle_count: obstacleCount,
      seed
    };

    const res = await fetch(`${this.baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Simulation failed (HTTP ${res.status})`);
    }

    return await res.json();
  }
};
