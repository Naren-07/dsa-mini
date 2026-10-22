# Rover PathLab: Asset Licenses & Attribution

This document records the provenance, licensing, and usage terms for all visual and auditory assets used in the **Rover PathLab Mars Game UI**.

---

## 1. Primary Sprite Atlas (`atlas.png`, `atlas.json`)

* **Asset:** Rover PathLab Mars Colony Pixel-Art Atlas (32×32 tiles).
* **Included Sprites:**
  * `rover`: 6-wheel articulated planetary exploration rover with pan-cam mast and solar deck.
  * `goal`: Pressurized Mars colony habitat landing pod with emerald signal beacon.
  * `rock`: Weathered Martian basalt boulder cluster (impassable terrain).
  * `wall`: Modular colony blast container / storage crate wall with hazard markings.
  * `moving_obstacle`: Autonomous Martian patrol crawler / hazard bot with warning beacon.
  * `ground_plain`: Iron-rich Martian regolith soil with micro-crater texturing.
  * `ground_rough`: Fractured jagged rock and gravel terrain (Cost 2).
  * `ground_mud`: Basaltic clay and mineral sludge trench (Cost 3).
  * `ground_sand`: Wind-sculpted Martian sand dune ripple (Cost 5).
  * `decoration_crater`: Impact crater terrain landmark.
  * `decoration_solar`: Photovoltaic colony solar panel array.
  * `decoration_dish`: Deep-space communication telemetry dish.
* **License:** MIT License. Free for commercial, educational, academic, and non-commercial project use.
* **Watermarks:** Zero watermarks; clean 100% custom-crafted pixel assets formatted for crisp nearest-neighbor integer scaling (`ctx.imageSmoothingEnabled = false`).

---

## 2. Audio Effects (Web Audio API Synthesizer)

* **Source:** Procedural Web Audio API sound synthesis (`audio.js`).
* **Components:**
  * Mission Telemetry Blips: High-frequency sine wave pings.
  * Replan Alarm: Dual-tone amber alert chirp (580Hz / 880Hz).
  * Rover Drive Motors: Low-pass filtered sub-bass oscillation.
  * Target Acquisition Chime: Pentatonic arpeggio sweep.
* **License:** Open Source (MIT License). No third-party royalty audio dependencies or external audio asset files required.

---

## 3. Web Typography

* **Fonts:**
  * **Orbitron** by Matt McInerney (Google Fonts) – Licensed under SIL Open Font License, 1.1.
  * **Press Start 2P** by CodeMan38 (Google Fonts) – Licensed under SIL Open Font License, 1.1.
  * **Outfit** by Outfit (Google Fonts) – Licensed under SIL Open Font License, 1.1.
  * **JetBrains Mono** by JetBrains (Google Fonts) – Licensed under Apache License, Version 2.0.

---

## 4. Compliance Summary

All assets used in Rover PathLab v2.1 are 100% free of third-party watermarks, fully compliant with academic and production redistribution requirements, and work completely offline without relying on external CDNs for gameplay core logic.
