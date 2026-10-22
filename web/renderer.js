/**
 * Rover PathLab - High Performance Canvas Renderer
 * Implements Mars sprite rendering, offscreen terrain cache,
 * particle effects, directional rover animation, and high-DPI support.
 */

import { assets } from './assets.js';

export class MarsRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Offscreen terrain buffer for high FPS
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCtx = this.terrainCanvas.getContext('2d');
    this.terrainDirty = true;

    // Display options
    this.cellSize = 36;
    this.showGridLines = true;
    this.showHeatMap = true;
    this.dpr = window.devicePixelRatio || 1;

    // Particles
    this.dustParticles = [];
    this.maxParticles = 35;

    // Animation effects
    this.replanPulseTime = 0;
    this.goalPulseTime = 0;
    this.waitPulseTime = 0;

    // Rover direction: 0 = right, 1 = down, 2 = left, 3 = up
    this.roverHeading = 0;
  }

  /**
   * Resizes canvas and offscreen buffer according to grid dimensions and screen DPI
   */
  resize(width, height, preferredCellSize = null) {
    if (preferredCellSize) {
      this.cellSize = preferredCellSize;
    } else {
      // Auto-fit calculation
      if (width > 80 || height > 80) {
        this.cellSize = 6;
      } else if (width > 35 || height > 35) {
        this.cellSize = 18;
      } else {
        this.cellSize = 36;
      }
    }

    const cssWidth = width * this.cellSize;
    const cssHeight = height * this.cellSize;

    this.dpr = window.devicePixelRatio || 1;

    // Physical canvas
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    // Offscreen buffer
    this.terrainCanvas.width = this.canvas.width;
    this.terrainCanvas.height = this.canvas.height;

    // Nearest-neighbor scaling for crisp pixel-art
    this.ctx.imageSmoothingEnabled = false;
    this.terrainCtx.imageSmoothingEnabled = false;

    this.terrainDirty = true;
  }

  markTerrainDirty() {
    this.terrainDirty = true;
  }

  /**
   * Renders static terrain into offscreen cache
   */
  updateTerrainCache(state) {
    const ctx = this.terrainCtx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, state.width * this.cellSize, state.height * this.cellSize);

    const sprPlain = assets.get('ground_plain');
    const sprRough = assets.get('ground_rough');
    const sprMud = assets.get('ground_mud');
    const sprSand = assets.get('ground_sand');
    const sprRock = assets.get('rock');
    const sprWall = assets.get('wall');

    const spriteMap = {
      0: sprPlain,
      1: sprRough,
      2: sprMud,
      3: sprSand,
      4: sprRock
    };

    const fallbackColors = {
      0: '#b5441a',
      1: '#6b3720',
      2: '#482319',
      3: '#c9723a',
      4: '#4a180e'
    };

    const cs = this.cellSize;
    const fastMode = cs < 10;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const type = state.grid[y * state.width + x];
        const px = x * cs;
        const py = y * cs;

        if (fastMode || !assets.isReady) {
          ctx.fillStyle = fallbackColors[type] || '#b5441a';
          ctx.fillRect(px, py, cs, cs);
        } else {
          // Always draw base Mars soil under rocks/walls
          if (sprPlain && sprPlain.img) {
            ctx.drawImage(sprPlain.img, sprPlain.x, sprPlain.y, sprPlain.w, sprPlain.h, px, py, cs, cs);
          } else {
            ctx.fillStyle = fallbackColors[0];
            ctx.fillRect(px, py, cs, cs);
          }

          // Draw specific terrain overlay or rock/wall
          const spr = spriteMap[type];
          if (spr && type !== 0 && spr.img) {
            ctx.drawImage(spr.img, spr.x, spr.y, spr.w, spr.h, px, py, cs, cs);
          }
        }
      }
    }

    ctx.restore();
    this.terrainDirty = false;
  }

  /**
   * Main render pass
   */
  render(state, renderOptions = {}) {
    if (this.terrainDirty) {
      this.updateTerrainCache(state);
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.imageSmoothingEnabled = false;

    const totalW = state.width * this.cellSize;
    const totalH = state.height * this.cellSize;

    // 1. Blit static terrain from offscreen buffer
    ctx.drawImage(this.terrainCanvas, 0, 0, totalW, totalH);

    // 2. Draw optional grid lines
    if (this.showGridLines && this.cellSize >= 14) {
      this.drawGridOverlay(state.width, state.height);
    }

    // 3. Draw Explored Heat Map
    if (this.showHeatMap && state.currentExplored && state.currentExplored.length > 0) {
      this.drawHeatMap(state);
    }

    // 4. Draw Planned Path (with travelled fade)
    if (state.currentPath && state.currentPath.length > 1) {
      this.drawPath(state, renderOptions.travelledIndex || 0);
    }

    // 5. Update and Draw Dust Particle Trail
    this.updateAndDrawDustParticles(ctx);

    // 6. Draw Dynamic Obstacles (Simulation)
    if (state.simulationData && state.simulationData.obstacles_per_tick) {
      this.drawDynamicObstacles(state);
    }

    // 7. Draw Goal Target Marker / Landing Pod
    this.drawGoal(state.goal.x, state.goal.y);

    // 8. Draw Rover with Directional Facing and State Badges
    const roverPos = renderOptions.roverPos || state.start;
    const roverState = renderOptions.roverState || 'normal';
    this.drawRover(roverPos.x, roverPos.y, roverState);

    // 9. Replan / Goal pulses
    if (renderOptions.isReplanning) {
      this.drawReplanFlash(roverPos.x, roverPos.y);
    }
    if (renderOptions.goalReached) {
      this.drawGoalReachedEffect(state.goal.x, state.goal.y);
    }

    ctx.restore();
  }

  /**
   * Subtle sci-fi grid overlay
   */
  drawGridOverlay(w, h) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      ctx.moveTo(x * cs + 0.5, 0);
      ctx.lineTo(x * cs + 0.5, h * cs);
    }
    for (let y = 0; y <= h; y++) {
      ctx.moveTo(0, y * cs + 0.5);
      ctx.lineTo(w * cs, y * cs + 0.5);
    }
    ctx.stroke();
  }

  /**
   * Explored Heat Map with progressive neon glow
   */
  drawHeatMap(state) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const total = state.currentExplored.length;

    state.currentExplored.forEach((cellIdx, i) => {
      const x = cellIdx % state.width;
      const y = Math.floor(cellIdx / state.width);

      if ((x === state.start.x && y === state.start.y) || (x === state.goal.x && y === state.goal.y)) {
        return;
      }

      const ratio = i / total;
      const alpha = 0.12 + ratio * 0.26;

      ctx.fillStyle = `rgba(63, 169, 245, ${alpha})`;
      ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);

      // Frontier highlight on newest nodes
      if (i > total - 6) {
        ctx.strokeStyle = 'rgba(255, 176, 32, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      }
    });
  }

  /**
   * Laser-sharp navigation path with travelled portion fading
   */
  drawPath(state, travelledIndex = 0) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const path = state.currentPath;
    if (!path || path.length < 2) return;

    // Remaining (untravelled) path: luminous cyan laser line
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#3fa9f5';
    ctx.lineWidth = Math.max(2, Math.floor(cs * 0.12));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#3fa9f5';
    ctx.shadowBlur = 8;

    let started = false;
    for (let i = Math.max(0, Math.floor(travelledIndex)); i < path.length; i++) {
      const cx = path[i][0] * cs + cs / 2;
      const cy = path[i][1] * cs + cs / 2;
      if (!started) {
        ctx.moveTo(cx, cy);
        started = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();

    // Travelled portion: dimmed dashed trail
    if (travelledIndex > 0) {
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(232, 168, 124, 0.45)';
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, Math.floor(cs * 0.08));

      const maxI = Math.min(path.length - 1, Math.ceil(travelledIndex));
      for (let i = 0; i <= maxI; i++) {
        const cx = path[i][0] * cs + cs / 2;
        const cy = path[i][1] * cs + cs / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Dynamic patrol obstacles
   */
  drawDynamicObstacles(state) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const obstacles = state.simulationData.obstacles_per_tick[state.simTick] || [];
    const sprObs = assets.get('moving_obstacle');

    obstacles.forEach(obs => {
      const px = obs[0] * cs;
      const py = obs[1] * cs;
      const cx = px + cs / 2;
      const cy = py + cs / 2;

      if (sprObs && sprObs.img && cs >= 16) {
        // Draw sprite
        ctx.drawImage(sprObs.img, sprObs.x, sprObs.y, sprObs.w, sprObs.h, px, py, cs, cs);
        // Warning radar ring
        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.45, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Fallback hazard circle
        ctx.beginPath();
        ctx.arc(cx, cy, cs * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }

  /**
   * Mars Goal Marker / Landing Habitat Pod
   */
  drawGoal(x, y) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const px = x * cs;
    const py = y * cs;
    const cx = px + cs / 2;
    const cy = py + cs / 2;

    const sprGoal = assets.get('goal');
    if (sprGoal && sprGoal.img && cs >= 16) {
      // Beacon pulse aura
      const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy - cs * 0.35, 3 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(91, 214, 138, ${0.4 + pulse * 0.4})`;
      ctx.fill();

      // Goal pod sprite
      ctx.drawImage(sprGoal.img, sprGoal.x, sprGoal.y, sprGoal.w, sprGoal.h, px, py, cs, cs);
    } else {
      // Geometric goal fallback
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = '#5bd68a';
      ctx.shadowColor = '#5bd68a';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  /**
   * Rover with Directional Facing and State Badges
   */
  drawRover(x, y, roverState = 'normal') {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = x * cs + cs / 2;
    const cy = y * cs + cs / 2;

    const sprRover = assets.get('rover');

    ctx.save();
    ctx.translate(cx, cy);

    // Rover direction transforms:
    // 0: right (normal)
    // 1: down (rotate 90 deg)
    // 2: left (flip horizontal)
    // 3: up (rotate -90 deg)
    if (this.roverHeading === 2) {
      ctx.scale(-1, 1);
    } else if (this.roverHeading === 1) {
      ctx.rotate(Math.PI / 2);
    } else if (this.roverHeading === 3) {
      ctx.rotate(-Math.PI / 2);
    }

    if (sprRover && sprRover.img && cs >= 16) {
      ctx.drawImage(sprRover.img, sprRover.x, sprRover.y, sprRover.w, sprRover.h, -cs / 2, -cs / 2, cs, cs);
    } else {
      // Geometric rover fallback
      ctx.beginPath();
      ctx.arc(0, 0, cs * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = '#3fa9f5';
      ctx.shadowColor = '#3fa9f5';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cs * 0.14, 0, cs * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();

    // Rover State Badges (Wait / Obstacle Alert)
    if (roverState === 'wait') {
      this.drawWaitIcon(cx, cy);
    }
  }

  /**
   * Caution wait icon above rover
   */
  drawWaitIcon(cx, cy) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const iconY = cy - cs * 0.55;

    ctx.save();
    const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;

    ctx.beginPath();
    ctx.arc(cx, iconY, 8 + pulse * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb020';
    ctx.shadowColor = '#ffb020';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#1a0f0b';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, iconY);
    ctx.restore();
  }

  /**
   * Amber shockwave effect on online replan
   */
  drawReplanFlash(x, y) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = x * cs + cs / 2;
    const cy = y * cs + cs / 2;

    const ringRadius = (cs * 0.5) + (this.replanPulseTime * cs * 0.8);
    const alpha = Math.max(0, 1 - this.replanPulseTime);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 176, 32, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffb020';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Emerald celebratory beacon flare when reaching goal
   */
  drawGoalReachedEffect(x, y) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = x * cs + cs / 2;
    const cy = y * cs + cs / 2;

    const ringRadius = (cs * 0.4) + (this.goalPulseTime * cs * 1.2);
    const alpha = Math.max(0, 1 - this.goalPulseTime);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(91, 214, 138, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#5bd68a';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Emits dust particle behind rover wheels
   */
  emitDust(worldX, worldY, dx, dy) {
    if (this.dustParticles.length >= this.maxParticles) {
      this.dustParticles.shift();
    }
    const cs = this.cellSize;
    const px = worldX * cs + cs / 2 - dx * (cs * 0.35);
    const py = worldY * cs + cs / 2 - dy * (cs * 0.35);

    this.dustParticles.push({
      x: px + (Math.random() - 0.5) * (cs * 0.2),
      y: py + (Math.random() - 0.5) * (cs * 0.2),
      vx: -dx * (Math.random() * 0.4 + 0.1) + (Math.random() - 0.5) * 0.3,
      vy: -dy * (Math.random() * 0.4 + 0.1) + (Math.random() - 0.5) * 0.3,
      size: Math.random() * (cs * 0.12) + (cs * 0.05),
      life: 1.0,
      decay: Math.random() * 0.04 + 0.03
    });
  }

  /**
   * Updates and draws dust puffs
   */
  updateAndDrawDustParticles(ctx) {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size += 0.15;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.dustParticles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 168, 124, ${p.life * 0.45})`;
      ctx.fill();
    }
  }

  /**
   * Set rover heading based on motion delta
   */
  setRoverHeading(dx, dy) {
    if (dx > 0) this.roverHeading = 0;      // Right
    else if (dy > 0) this.roverHeading = 1; // Down
    else if (dx < 0) this.roverHeading = 2; // Left
    else if (dy < 0) this.roverHeading = 3; // Up
  }
}
