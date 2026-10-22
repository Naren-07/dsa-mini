/**
 * Rover PathLab - Sprite Assets Manager
 * Loads and slices sprite atlas, with programmatic canvas fallback.
 */

export class AssetManager {
  constructor() {
    this.atlasImg = null;
    this.atlasData = null;
    this.isReady = false;
    this.readyPromise = null;
    this.cachedDataUrls = new Map();
  }

  /**
   * Initializes and loads the sprite atlas
   */
  load() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise((resolve) => {
      // 1. Fetch metadata
      fetch('assets/atlas.json')
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          this.atlasData = data;
          const img = new Image();
          img.onload = () => {
            this.atlasImg = img;
            this.isReady = true;
            resolve(true);
          };
          img.onerror = () => {
            console.warn('[Assets] Failed to load atlas.png, generating programmatic fallback.');
            this.generateProceduralFallback();
            resolve(true);
          };
          img.src = 'assets/atlas.png';
        })
        .catch(err => {
          console.warn('[Assets] Failed to load atlas.json, generating programmatic fallback:', err);
          this.generateProceduralFallback();
          resolve(true);
        });
    });

    return this.readyPromise;
  }

  /**
   * Returns sprite coordinates and source image
   */
  get(name) {
    if (!this.atlasData || !this.atlasData.sprites || !this.atlasData.sprites[name]) {
      return null;
    }
    const def = this.atlasData.sprites[name];
    return {
      img: this.atlasImg,
      x: def.x,
      y: def.y,
      w: def.w,
      h: def.h
    };
  }

  /**
   * Returns a base64 Data URL for a specific sprite (useful for DOM icons & swatches)
   */
  getSpriteDataUrl(name) {
    if (this.cachedDataUrls.has(name)) {
      return this.cachedDataUrls.get(name);
    }
    const spr = this.get(name);
    if (!spr || !spr.img) return '';

    const canvas = document.createElement('canvas');
    canvas.width = spr.w;
    canvas.height = spr.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr.img, spr.x, spr.y, spr.w, spr.h, 0, 0, spr.w, spr.h);

    const url = canvas.toDataURL('image/png');
    this.cachedDataUrls.set(name, url);
    return url;
  }

  /**
   * Generate an in-memory procedural canvas fallback sprite sheet if file is unavailable
   */
  generateProceduralFallback() {
    const tileSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Palette
    const cMars = '#b5441a';
    const cRough = '#6b3720';
    const cMud = '#482319';
    const cSand = '#c9723a';
    const cRock = '#4a180e';

    // 0: ground_plain
    ctx.fillStyle = cMars;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#872b0b';
    ctx.fillRect(8, 8, 3, 3);
    ctx.fillRect(20, 20, 3, 3);

    // 1: ground_rough
    ctx.fillStyle = cRough;
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillStyle = '#995232';
    ctx.fillRect(36, 6, 6, 5);
    ctx.fillRect(48, 18, 7, 6);

    // 2: ground_mud
    ctx.fillStyle = cMud;
    ctx.fillRect(64, 0, 32, 32);
    ctx.fillStyle = '#2e140d';
    ctx.fillRect(68, 10, 24, 6);
    ctx.fillRect(66, 20, 26, 5);

    // 3: ground_sand
    ctx.fillStyle = cSand;
    ctx.fillRect(96, 0, 32, 32);
    ctx.fillStyle = '#eb9856';
    ctx.fillRect(96, 8, 32, 3);
    ctx.fillRect(96, 20, 32, 3);

    // 4: rock
    ctx.fillStyle = cRock;
    ctx.beginPath();
    ctx.arc(16, 48, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8523b';
    ctx.fillRect(10, 42, 6, 6);

    // 5: wall
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(34, 34, 28, 28);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(38, 38, 20, 4);
    ctx.fillRect(38, 50, 20, 4);

    // 6: rover
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(70, 44, 20, 8);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(72, 40, 16, 4);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(86, 36, 4, 4);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(69, 52, 5, 6);
    ctx.fillRect(78, 52, 5, 6);
    ctx.fillRect(87, 52, 5, 6);

    // 7: goal
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(112, 48, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(110, 34, 4, 6);

    // 8: moving_obstacle
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(6, 76, 20, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(13, 70, 6, 6);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(5, 86, 22, 6);

    // 9: decoration_crater
    ctx.fillStyle = '#8a2b0f';
    ctx.beginPath();
    ctx.arc(48, 80, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#320f06';
    ctx.beginPath();
    ctx.arc(48, 80, 8, 0, Math.PI * 2);
    ctx.fill();

    // 10: decoration_solar
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(68, 72, 24, 10);
    ctx.fillStyle = '#475569';
    ctx.fillRect(78, 82, 4, 10);

    // 11: decoration_dish
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(112, 80, 11, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();

    this.atlasImg = canvas;
    this.atlasData = {
      tileSize: 32,
      width: 128,
      height: 96,
      sprites: {
        ground_plain: { x: 0, y: 0, w: 32, h: 32 },
        ground_rough: { x: 32, y: 0, w: 32, h: 32 },
        ground_mud: { x: 64, y: 0, w: 32, h: 32 },
        ground_sand: { x: 96, y: 0, w: 32, h: 32 },
        rock: { x: 0, y: 32, w: 32, h: 32 },
        wall: { x: 32, y: 32, w: 32, h: 32 },
        rover: { x: 64, y: 32, w: 32, h: 32 },
        goal: { x: 96, y: 32, w: 32, h: 32 },
        moving_obstacle: { x: 0, y: 64, w: 32, h: 32 },
        decoration_crater: { x: 32, y: 64, w: 32, h: 32 },
        decoration_solar: { x: 64, y: 64, w: 32, h: 32 },
        decoration_dish: { x: 96, y: 64, w: 32, h: 32 }
      }
    };
    this.isReady = true;
  }
}

export const assets = new AssetManager();
