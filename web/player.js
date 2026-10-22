/**
 * Rover PathLab - Playback Controller
 * Handles trajectory interpolation, dynamic patrol replay, speed scaling,
 * sound cues, and online replan alerting.
 */

import { sound } from './audio.js';

export class SimulationPlayer {
  constructor(renderer) {
    this.renderer = renderer;
    this.simulationData = null;
    
    // Playback state
    this.isPlaying = false;
    this.currentTick = 0;
    this.tickProgress = 0.0; // 0.0 to 1.0 sub-tick interpolation
    this.playbackSpeed = 5;  // 1x to 10x
    this.lastFrameTime = 0;

    // Callbacks
    this.onTickChange = null;
    this.onStatusChange = null;
    this.onComplete = null;

    // Replan / Effect triggers
    this.isReplanning = false;
    this.goalReached = false;
  }

  loadSimulation(data) {
    this.stop();
    this.simulationData = data;
    this.currentTick = 0;
    this.tickProgress = 0.0;
    this.isReplanning = false;
    this.goalReached = false;
    if (this.onTickChange) this.onTickChange(0);
  }

  setSpeed(multiplier) {
    this.playbackSpeed = Math.max(1, Math.min(10, multiplier));
  }

  play() {
    if (!this.simulationData || !this.simulationData.trajectory || this.simulationData.trajectory.length === 0) {
      return;
    }
    const maxTicks = this.simulationData.trajectory.length - 1;
    if (this.currentTick >= maxTicks) {
      // Loop or restart from 0
      this.currentTick = 0;
      this.tickProgress = 0.0;
      this.goalReached = false;
    }

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    if (this.onStatusChange) this.onStatusChange('PLAYING');
  }

  pause() {
    this.isPlaying = false;
    if (this.onStatusChange) this.onStatusChange('PAUSED');
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  step() {
    this.pause();
    if (!this.simulationData || !this.simulationData.trajectory) return;
    const maxTicks = this.simulationData.trajectory.length - 1;

    if (this.currentTick < maxTicks) {
      this.currentTick++;
      this.tickProgress = 0.0;
      this.checkTickEvents(this.currentTick);
      if (this.onTickChange) this.onTickChange(this.currentTick);
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentTick = 0;
    this.tickProgress = 0.0;
    this.isReplanning = false;
    this.goalReached = false;
    if (this.onStatusChange) this.onStatusChange('STOPPED');
    if (this.onTickChange) this.onTickChange(0);
  }

  /**
   * Called on every requestAnimationFrame tick
   */
  update(timestamp, state) {
    if (!this.simulationData || !this.simulationData.trajectory) {
      // Still update pulses if any
      this.updatePulses();
      return {
        roverPos: state ? state.start : { x: 0, y: 0 },
        roverState: 'normal',
        travelledIndex: 0,
        isReplanning: false,
        goalReached: false
      };
    }

    const trajectory = this.simulationData.trajectory;
    const maxTicks = trajectory.length - 1;

    if (this.isPlaying && this.lastFrameTime) {
      const dt = (timestamp - this.lastFrameTime) / 1000;
      // Base duration per tick: ~0.4s at 1x speed, ~0.04s at 10x
      const tickDuration = Math.max(0.04, 0.45 / this.playbackSpeed);
      this.tickProgress += dt / tickDuration;

      while (this.tickProgress >= 1.0 && this.currentTick < maxTicks) {
        this.tickProgress -= 1.0;
        this.currentTick++;
        this.checkTickEvents(this.currentTick);
        if (this.onTickChange) this.onTickChange(this.currentTick);
      }

      if (this.currentTick >= maxTicks) {
        this.currentTick = maxTicks;
        this.tickProgress = 1.0;
        this.isPlaying = false;
        this.checkArrival(state);
        if (this.onComplete) this.onComplete();
        if (this.onStatusChange) this.onStatusChange('COMPLETED');
      }
    }
    this.lastFrameTime = timestamp;

    this.updatePulses();

    // Compute interpolated rover position
    const currentStep = trajectory[this.currentTick] || trajectory[0];
    const nextStep = (this.currentTick < maxTicks) ? trajectory[this.currentTick + 1] : currentStep;

    const t = Math.min(1.0, Math.max(0.0, this.tickProgress));
    const roverX = currentStep.x + (nextStep.x - currentStep.x) * t;
    const roverY = currentStep.y + (nextStep.y - currentStep.y) * t;

    // Rover direction facing
    const dx = nextStep.x - currentStep.x;
    const dy = nextStep.y - currentStep.y;
    if (dx !== 0 || dy !== 0) {
      this.renderer.setRoverHeading(dx, dy);
      if (this.isPlaying && Math.random() < 0.3) {
        this.renderer.emitDust(roverX, roverY, dx, dy);
      }
    }

    const roverState = currentStep.wait ? 'wait' : (currentStep.replanned ? 'replan' : 'normal');

    return {
      roverPos: { x: roverX, y: roverY },
      roverState,
      travelledIndex: this.currentTick + t,
      isReplanning: this.isReplanning,
      goalReached: this.goalReached
    };
  }

  checkTickEvents(tick) {
    if (!this.simulationData || !this.simulationData.trajectory) return;
    const step = this.simulationData.trajectory[tick];
    if (!step) return;

    if (step.replanned) {
      this.isReplanning = true;
      this.renderer.replanPulseTime = 0.0;
      sound.playReplan();
    } else if (step.wait) {
      sound.playWait();
    } else {
      sound.playStep();
    }
  }

  checkArrival(state) {
    if (!state || !this.simulationData || !this.simulationData.trajectory) return;
    const lastStep = this.simulationData.trajectory[this.simulationData.trajectory.length - 1];
    if (lastStep && lastStep.x === state.goal.x && lastStep.y === state.goal.y) {
      this.goalReached = true;
      this.renderer.goalPulseTime = 0.0;
      sound.playGoal();
    }
  }

  updatePulses() {
    if (this.isReplanning) {
      this.renderer.replanPulseTime += 0.04;
      if (this.renderer.replanPulseTime >= 1.0) {
        this.isReplanning = false;
      }
    }
    if (this.goalReached) {
      this.renderer.goalPulseTime += 0.02;
      if (this.renderer.goalPulseTime >= 1.0) {
        this.goalReached = false;
      }
    }
  }
}
