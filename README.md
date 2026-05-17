# NYC Hitchhiker's Guide 🌌 🛠️

> "So you find yourself in New York City. Congratulations, or condolences — it's hard to tell the difference. Here is everything you actually need to survive."

The **NYC Hitchhiker's Guide** is a full-screen map web app inspired by the dry humor of Douglas Adams' *The Hitchhiker's Guide to the Galaxy*. It's meant to help people navigate the finding basic needs in New York City. The app brings a few pieces of city data for four basic elements of survival: Water, Power, Relief, and Rest.

---

## ── Use Case & Purpose

When a user first arrives, they're greeted by a splash screen with the iconic directive: **DON'T PANIC**. The app's purpose is explained with an intro overview outlining what the platform tracks. Once the splash screen is dismissed, a customized Sub-Etha telemetry network initializes on a dark-themed map of NYC, allowing users to rapidly toggle, locate, and explore essential resources near their real-time geographical coordinates.

---

## ── Key Features & Usability

*   **Onboarding Modal:** Contextualizes the theme and establishes a clear layout hierarchy before the user ever touches the map.
*   **Call to Action (CTA):** An active HUD notification immediately guides the user on how to interact with the system ("Select tracking categories below...").
*   **Category Toggling:** A floating navigation bar allows users to stack or filter tracking layers (Water, Power, Relief, Rest).
*   **Data Popups:** Hover states adapt the cursor to invite user interaction, and prodding any map marker opens an informative terminal-styled popup displaying the resource name, category pill, and address if available.

---

## ── Design Philosophy & Aesthetics

The application layout tries to lean into the "green-terminal" vibe of hitchikers guide:
*   **Typography:** Combines `Special Elite` (typewriter/notebook feel) with `Share Tech Mono` (terminal feel).
*   **Color Palette & Symbology:** Ultra-dark Mapbox canvas. High-visibility neon accents are mapped specifically to functional protocols (e.g., `#39ff14` terminal green, `#33CCFF` hydration blue).

---

## ── Codebase & Directory Structure

The data is all included within the repo. I had initially done it all through API queries because that would naturally have the app update as the data updates. That made the whole app take much too long to load, so instead the data was all downloaded from NYC Open Data. 

Files for the web app are all in the root. 

```text
├── index.html          # Application markup, layout, and document structure
├── style.css           # Custom CSS tokens, terminal styling, and UI positioning
├── script.js           # Mapbox GL JS engine logic, layer managers, and events
└── data/               # Local GeoJSON data modules
    ├── hydration.geojson
    ├── linknyc.geojson
    ├── relief.geojson
    └── parks.geojson