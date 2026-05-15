/* ═══════════════════════════════════════════════════════
   NYC HITCHHIKER'S GUIDE — SCRIPT
   ═══════════════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────────

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW1kMTEyIiwiYSI6ImNtbnhxNHVsbjA0dDUycHExZWRqN2dtaWEifQ.RchV-MZSTqwC8fMtMIy_Xg';

const NYC_BOUNDS = [[-74.25909, 40.477399], [-73.700272, 40.917577]];

/** Each category: its colour, data source(s), and label copy. */
const CATEGORIES = {
  water: {
    color:   '#33CCFF',
    label:   'Water',
    sources: ['data/hydration.geojson'],
  },
  power: {
    color:   '#FFD700',
    label:   'Power',
    sources: ['data/linknyc.geojson', 'data/nypl_mn.geojson', 'data/nypl_si.geojson',
              'data/nypl_bx.geojson', 'data/library_qn.geojson'],
  },
  relief: {
    color:   '#FF6B35',
    label:   'Relief',
    sources: ['data/relief.geojson'],
  },
  rest: {
    color:   '#4CAF50',
    label:   'Rest',
    sources: ['data/parks.geojson'],
  },
};

// ── STATE ────────────────────────────────────────────────

/** Tracks which categories are currently toggled on. */
const activeCategories = new Set();

// ── MAP INIT ─────────────────────────────────────────────

mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container:  'map',
  style:      'mapbox://styles/mapbox/dark-v11',
  center:     [-73.96, 40.71],
  zoom:       13,
  pitch:      0,       // flat map
  bearing:    0,
  maxBounds:  NYC_BOUNDS,
});

// ── MODAL ────────────────────────────────────────────────

function initModal() {
  const modal  = document.getElementById('intro-modal');
  const button = document.getElementById('close-intro');
  button.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

// ── GEOLOCATION ──────────────────────────────────────────

function initGeolocation() {
  const geolocate = new mapboxgl.GeolocateControl({
    positionOptions:   { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading:   true,
  });
  map.addControl(geolocate, 'bottom-right');
  // Trigger after a short delay so the map is fully settled
  setTimeout(() => geolocate.trigger(), 600);
}

// ── DATA LOADING ─────────────────────────────────────────

/**
 * Fetches one or more GeoJSON files and merges their features.
 * NOTE: This requires the app to be served via HTTP (not file://).
 * Run: python3 -m http.server 8000   then open localhost:8000
 */
async function fetchMergedGeoJSON(paths) {
  const responses = await Promise.all(
    paths.map(async (path) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return res.json();
    })
  );
  return {
    type: 'FeatureCollection',
    features: responses.flatMap((data) => data.features ?? []),
  };
}

/**
 * Returns a small set of sample points around Manhattan
 * so layers are visually testable before real data is wired up.
 */
function makeDemoGeoJSON(id) {
  const { color } = CATEGORIES[id];
  // Scatter 12 points around central Manhattan
  const base = [-73.9857, 40.7484];
  const offsets = [
    [0, 0], [0.01, 0.005], [-0.01, 0.007], [0.005, -0.01],
    [-0.008, -0.005], [0.015, 0.012], [-0.015, 0.01],
    [0.002, 0.018], [-0.002, -0.018], [0.02, -0.005],
    [-0.02, 0.002], [0.012, -0.015],
  ];
  return {
    type: 'FeatureCollection',
    features: offsets.map(([dx, dy], i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [base[0] + dx, base[1] + dy] },
      properties: {
        name:    `${CATEGORIES[id].label} Location ${i + 1}`,
        address: 'Sample data — add your GeoJSON files to /data/',
      },
    })),
  };
}

/**
 * Adds a GeoJSON source + circle layer for the given category
 * and wires up click / hover interactions.
 */
async function loadCategoryLayer(id) {
  const category = CATEGORIES[id];
  setStatus(true);

  try {
    let geojson;
    try {
      geojson = await fetchMergedGeoJSON(category.sources);
    } catch (fetchErr) {
      console.warn(`[Guide] Could not load real data for "${id}" — using demo points. Serve via HTTP to load real GeoJSON.`, fetchErr);
      geojson = makeDemoGeoJSON(id);
    }

    map.addSource(id, { type: 'geojson', data: geojson });

    map.addLayer({
      id:     `${id}-layer`,
      type:   'circle',
      source: id,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius':  [
          'interpolate', ['linear'], ['zoom'],
          11, 4,
          15, 8,
        ],
        'circle-color':   category.color,
        'circle-opacity': 0.9,
        'circle-blur':    0.6,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'rgba(255,255,255,0.2)',
      },
    });

    bindPopup(id);
    bindCursorHover(id);

  } catch (err) {
    console.error(`[Guide] Error loading "${id}":`, err);
  } finally {
    setStatus(false);
  }
}

// ── POPUP ────────────────────────────────────────────────

function bindPopup(id) {
  const { color } = CATEGORIES[id];

  map.on('click', `${id}-layer`, (e) => {
    const props = e.features[0].properties;

    const name = props.name
               || props.facility_name
               || props.title
               || 'Unnamed Resource';

    const address = props.address
                  || props.location
                  || props.addr
                  || '—';

    new mapboxgl.Popup({ offset: [0, -6], maxWidth: '280px' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <span class="popup-pill"
              style="background:${color}22; color:${color}; border:1px solid ${color}44;">
          ${CATEGORIES[id].label}
        </span>
        <div class="popup-name">${name}</div>
        <div class="popup-address">${address}</div>
      `)
      .addTo(map);
  });
}

function bindCursorHover(id) {
  const canvas = map.getCanvas();
  map.on('mouseenter', `${id}-layer`, () => { canvas.style.cursor = 'pointer'; });
  map.on('mouseleave', `${id}-layer`, () => { canvas.style.cursor = '';        });
}

// ── CATEGORY TOGGLE ───────────────────────────────────────

async function toggleCategory(id) {
  const btn      = document.getElementById(`btn-${id}`);
  const isActive = activeCategories.has(id);

  if (isActive) {
    // ── Turn off ──
    activeCategories.delete(id);
    btn.classList.remove('active');
    btn.style.removeProperty('--cat-color');
    btn.setAttribute('aria-pressed', 'false');

    if (map.getLayer(`${id}-layer`)) {
      map.setLayoutProperty(`${id}-layer`, 'visibility', 'none');
    }

  } else {
    // ── Turn on ──
    activeCategories.add(id);
    btn.classList.add('active');
    btn.style.setProperty('--cat-color', CATEGORIES[id].color);
    btn.setAttribute('aria-pressed', 'true');

    if (map.getSource(id)) {
      // Source already loaded — just show it
      map.setLayoutProperty(`${id}-layer`, 'visibility', 'visible');
    } else {
      // First time — fetch and add
      await loadCategoryLayer(id);
    }
  }
}

// ── BUTTON WIRING ────────────────────────────────────────

function initButtons() {
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.category;
      if (id) toggleCategory(id);
    });
  });
}

// ── STATUS INDICATOR ─────────────────────────────────────

function setStatus(visible) {
  const el = document.getElementById('status-bar');
  if (visible) el.removeAttribute('hidden');
  else         el.setAttribute('hidden', '');
}

// ── BOOT ─────────────────────────────────────────────────

initModal();
initButtons();

map.on('load', () => {
  initGeolocation();
  // Open with Relief layer on by default
  toggleCategory('relief');
});