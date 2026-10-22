# Rover PathLab: Mars Game UI Implementation Plan

*Companion to the C++ Backend Implementation Plan. The backend and REST API stay unchanged; this plan only reskins and extends the frontend (web/index.html, app.js, style.css).*

## 1. Purpose and Scope

Turn the current plain grid into a Mars-themed, game-style experience: a red-planet map with sprite terrain, a rover that drives along the planned path, colony buildings as obstacles, and a dark sci-fi HUD around it. All pathfinding stays in the C++ API. The UI only draws and replays results.

**In scope:** Mars colour theme, sprite-based canvas renderer, rover animation, obstacle and terrain art, HUD panels, sound (optional), responsive layout, light/dark variants.

**Out of scope:** new algorithms, diagonal movement, multiplayer, WebSocket streaming, 3D.

Estimated effort: 2 weeks part time (about 10 to 12 hours per week), or 4 to 5 days full time.

## 2. Asset Review and Decisions

| Asset | What it is | How to use it |
| --- | --- | --- |
| Image 1: pixel-art Mars colony sheet | Square-view pixel art on a red ground: fuel tanks, comms tower, satellite dish, solar panels, storage crates, 6-wheel rover, landing pod, rocks and craters | **Primary asset set.** Matches your square 4-neighbor grid. Use as obstacles, goal marker and the rover |
| Image 2: Red Planet Tiles (70 hex tiles, painted style) | Hexagonal painted terrain: cracked ground, rocky outcrops, dunes, craters, greenery | **Reference only, or mood backdrop.** Do not mix into the grid |

**Issues to resolve before building**

1. **Watermarks and licences.** Both images are watermarked previews (the first has a repeating MARU mark, the second Envato). Buy or download the licensed, clean versions before using them in anything you submit, publish or demo publicly. Check that the licence allows use in a web app and in a report.
2. **Hex versus square.** Your engine uses a square grid with 4-neighbor moves. Hex tiles would suggest 6-neighbor movement and look wrong. Keep the grid square and use Image 2 only for the page background, banner or colour palette.
3. **Style mismatch.** Pixel art and painted art clash if mixed on the same map. Go fully pixel art on the map; keep painted art out of the play area.
4. **Missing pieces.** The sheet has one rover view (side-on). You need either the other directions or a workaround (see Section 5). You also need plain ground tiles, a mud/sand look, and a wall look. Plan to build these yourself from the sheet's ground texture or draw small 16x16 tiles.

## 3. Design Direction

**Palette (CSS variables)**

| Token | Use | Suggested value |
| --- | --- | --- |
| --mars-ground | Map base, page accent | #B5441A |
| --mars-dark | Panels, HUD background | #1A0F0B |
| --mars-dust | Secondary text, borders | #E8A87C |
| --accent-cyan | Path line, buttons, solar-blue highlights | #3FA9F5 |
| --accent-amber | Warnings, replans | #FFB020 |
| --ok-green | Goal reached | #5BD68A |

Sample the exact ground colour from Image 1 with a colour picker so the HUD matches the map.

**Typography:** one pixel or sci-fi display font for titles (for example Press Start 2P or Orbitron from Google Fonts) and a clean sans for body text and tables. Always give fallback fonts.

**Layout:** left: map canvas (largest area). Right: control panel and stats. Bottom: playback bar. On phones, the panel moves below the map.

**Theme switch:** keep your existing theme toggle. Dark = night-side Mars (dark panels, glowing path). Light = daylight Mars (sand panels, dark text).

## 4. Architecture of the UI Layer

| Module | Responsibility |
| --- | --- |
| api.js | fetch wrapper for /api/plan, /simulate, /compare, /random-map |
| assets.js | Loads the sprite sheet(s), slices them into named sprites, exposes ready promise |
| renderer.js | Draws terrain, obstacles, heat map, path, rover on a canvas |
| player.js | Replays trajectory, exploredPerPlan and obstaclesPerTick; speed, pause, stop |
| ui.js | Buttons, painting tools, HUD, theme, toasts |
| style.css | Theme variables and layout |

Rule: renderer and player never call the algorithms. They only consume API results. This keeps the clean separation from the backend plan.

## 5. Sprite Plan

### Sprite atlas

Crop sprites from Image 1 (after replacing it with the clean licensed version) into one atlas PNG plus a small JSON map of names to rectangles.

| Game element | Sprite source |
| --- | --- |
| Rover | 6-wheel rover (bottom left) |
| Goal | Landing pod or comms tower |
| Rock obstacle (terrain) | Boulders and rock clusters |
| Static wall | Storage crates, fuel tank block |
| Moving obstacles | Small rocks or crates (or a drone sprite you add later) |
| Decoration (non-playable) | Solar panels, dish, craters |
| Ground | Tileable red dirt, cut from an empty area of the sheet |

### Terrain codes

Your terrain uses codes 0 to 4 with rock as blocked. Map each code to a distinct look, for example: 0 plain dirt, then progressively harder terrain (sand, mud, loose gravel) with a tint or overlay, and the rock code to boulders or crates. Use the exact meaning of each code from your project report.

### Rover directions

Options in order of effort:

1. **Flip and rotate (recommended first):** flip horizontally for left/right; for up/down, rotate the sprite 90 degrees on the canvas. Quick and good enough for a demo.
2. **Add frames:** draw front and back views in the same pixel style.
3. **Wheel animation:** alternate 2 wheel frames while moving.

### Rendering rules

- Set `ctx.imageSmoothingEnabled = false` so pixel art stays crisp.
- Scale by whole numbers only (cell size 32 or 48 px) to avoid blurry sprites.
- Pre-draw the static terrain to an offscreen canvas and redraw only what changes.
- Use `devicePixelRatio` for sharpness on high-DPI screens.

## 6. Phased Plan

### Phase 0: Assets and Setup (Day 1 to 2)

| Task | Output |
| --- | --- |
| Obtain licensed clean copies of both asset packs; record licence terms | /assets/LICENSES.md |
| Cut sprites into an atlas with consistent cell size | atlas.png, atlas.json |
| Decide cell size (32 px suggested) and canvas scaling | Design note |
| Add theme variables and fonts to style.css | Themed empty page |

**Exit check:** the page loads, shows the Mars palette, and one sprite draws crisply on a canvas.

### Phase 1: Static Mars Map (Week 1, first half)

| Task | Output |
| --- | --- |
| assets.js loader with ready promise | assets.js |
| Draw tiled ground and terrain overlays per code | renderer.js |
| Draw start (rover), goal (pod or tower) and walls (crates, rocks) | renderer.js |
| Keep painting tools working with sprite previews in the palette | ui.js |
| Grid lines as optional faint overlay | renderer.js |

**Exit check:** a random map from /api/random-map renders fully with sprites; painting still works with mouse and touch.

### Phase 2: Rover Animation and Replay (Week 1, second half)

| Task | Output |
| --- | --- |
| Smooth movement between cells (interpolate over each tick) | player.js |
| Face the direction of travel (flip or rotate) | renderer.js |
| Draw the planned path as a glowing dashed line; fade the travelled part | renderer.js |
| Wait state: small pulse or exclamation icon; replan state: amber flash and a short beep | player.js |
| Speed slider changes playback rate only; pause, step and stop | player.js |

**Exit check:** a run replays smoothly at all speeds; stopping mid-run leaves the UI in a clean state.

### Phase 3: Heat Map, Obstacles and Effects (Week 2, first half)

| Task | Output |
| --- | --- |
| Replay exploredPerPlan as a translucent cyan or orange overlay that fills over time | renderer.js |
| Replay obstaclesPerTick with moving obstacle sprites | player.js |
| Dust particle trail behind the rover (small, capped count) | renderer.js |
| Goal reached: green pulse and a small summary banner | ui.js |
| Optional day/night tint over the map | renderer.js |

**Exit check:** heat map and moving obstacles match the API data tick by tick.

### Phase 4: HUD and Compare View (Week 2, second half)

| Task | Output |
| --- | --- |
| Mission-control style panels: algorithm select, obstacles, seed, speed | ui.js, style.css |
| Live stats readout: steps, cost, explored, replans, microseconds | ui.js |
| Compare all: styled table plus tiny bar charts (cost, explored) | ui.js |
| Loading spinner themed as a radar sweep; clear message if backend is down | ui.js |
| Responsive layout for tablet and phone; touch targets at least 44 px | style.css |
| Optional: sound toggle (default off), keyboard shortcuts | ui.js |

**Exit check:** all existing frontend test cases (paint, touch, stop, theme, speed) pass with the new UI.

### Phase 5: Polish, Testing and Release (end of Week 2)

| Task | Output |
| --- | --- |
| Performance pass: offscreen terrain cache, redraw only dirty regions | renderer.js |
| Test on 24x16, 100x100 and 250x250 grids; scale cell size down on large grids | Test log |
| Browser checks: Chrome, Firefox, Safari, one phone | Checklist |
| Accessibility: contrast, labels, reduced-motion option, colour-blind-safe path colour | Checklist |
| Capture screenshots and a short screen recording for the report | Report figures |
| Update README and the project report; tag v2.1 | Release |

## 7. Testing Checklist

| Area | Check |
| --- | --- |
| Rendering | Sprites crisp at all sizes; no blur; no gaps between tiles |
| Data fidelity | Rover path equals the API trajectory; obstacles match obstaclesPerTick |
| Interaction | Paint, erase, touch drag, stop mid-run, edit during run |
| Theme | Dark and light both readable; contrast passes |
| Performance | 60 fps on 24x16; smooth on 100x100; usable on 250x250 |
| Errors | Backend offline shows a message; asset load failure falls back to coloured squares |
| Responsive | Usable at 360 px width |

## 8. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Watermarked preview assets used by mistake | Buy or download clean versions in Phase 0; keep licences in the repo |
| Style clash between pixel and painted art | Pixel art only on the map; painted art only as a banner or background |
| Only one rover view | Flip and rotate first; draw extra frames later if time allows |
| Blurry sprites from scaling | Integer scaling and imageSmoothingEnabled = false |
| Slow rendering on big grids | Offscreen terrain cache; lower detail on large grids |
| Scope creep (sound, particles, 3D) | Treat effects as optional; finish Phases 1 and 2 first |

## 9. Acceptance Criteria

1. The map renders with Mars sprites for ground, terrain, walls, goal and rover.
2. The rover animates along the API trajectory, faces its direction of travel, and shows wait and replan states.
3. Heat map and moving obstacles replay exactly from API data.
4. Compare all shows a themed table with the same numbers as before the redesign.
5. All earlier frontend tests (paint, touch, stop, theme, speed) still pass.
6. No pathfinding logic exists in JavaScript.
7. Layout works on desktop and phone; both themes are readable.
8. Only licensed, watermark-free assets are used, with licences recorded in the repo.
9. The report has new screenshots of three maps in the Mars theme.

## 10. Definition of Done

All acceptance criteria are met, the Docker image still serves the new UI on port 8080, the main branch is tagged v2.1, and the README explains how to swap or add sprites in the atlas.
