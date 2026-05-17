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


// ── TRACKING ─────────────────────────────────────────────

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


// ── MODAL & CODES ────────────────────────────────────────

function initModal() {
  const modal  = document.getElementById('intro-modal');
  const button = document.getElementById('close-intro');
  const mainCta = document.getElementById('main-cta');
  const closeCtaBtn = document.getElementById('close-cta');

  button.addEventListener('click', () => {
    modal.style.display = 'none';
    // Activate post-splash map prompt banner
    mainCta.removeAttribute('hidden');
  });

  closeCtaBtn.addEventListener('click', () => {
    mainCta.setAttribute('hidden', '');
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
  setTimeout(() => geolocate.trigger(), 600);
}

// ── DATA LOADING ─────────────────────────────────────────

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
 * Adds a GeoJSON source + respective layer for the given category
 */
/**
 * Adds a GeoJSON source + respective layer for the given category
 */
async function loadCategoryLayer(id) {
  const category = CATEGORIES[id];

  try {
    let geojson;
    try {
      geojson = await fetchMergedGeoJSON(category.sources);
    } catch (fetchErr) {
      console.warn(`[Guide] Could not load real data for "${id}" — using demo points.`, fetchErr);
      geojson = makeDemoGeoJSON(id);
    }

    map.addSource(id, { type: 'geojson', data: geojson });

    // Handle structural differences between Polygon-based Parks (rest) and regular point coordinates
    if (id === 'rest') {
      // 1. Look to see if any point layers are ALREADY on the map
      const pointLayers = ['water-layer', 'power-layer', 'relief-layer'];
      const beforeId = pointLayers.find(layerId => map.getLayer(layerId));

      map.addLayer({
        id:      `${id}-layer`,
        type:    'fill',
        source:  id,
        filter:  ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
        paint: {
          'fill-color':   category.color,
          'fill-opacity': 0.4,
          'fill-outline-color': category.color
        },
      }, beforeId); // 2. Passing 'beforeId' forces the park polygons to render UNDER that layer
      
    } else {
      map.addLayer({
        id:      `${id}-layer`,
        type:    'circle',
        source:  id,
        filter:  ['==', ['geometry-type'], 'Point'],
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
    }

    bindPopup(id);
    bindCursorHover(id);

  } catch (err) {
    console.error(`[Guide] Error loading "${id}":`, err);
  }
}

// ── POPUP ────────────────────────────────────────────────

function bindPopup(id) {
  const { color } = CATEGORIES[id];

  map.on('click', `${id}-layer`, (e) => {
    const props = e.features[0].properties;

    // pull the names from different datasources
    const name = props.name
               || props.facility_name
               || props.title
               || props.decription
               || props.planned_kiosk_type
               || props.branch
               || props.signname
               || props.operator
               || props.gardenname
               || props.position
               || 'Unnamed Resource';

    const address = props.address
                  || props.location
                  || props.addr 
                  || props.location_type
                  || props.street_address
                  || props.propertyna
                  || props.restroom_type
                  || '—';

    // create the popup text
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
        
        // 🌟 FORCE REST LAYER TO THE BOTTOM IF IT JUST TURNED BACK ON
        if (id === 'rest') {
          const pointLayers = ['water-layer', 'power-layer', 'relief-layer'];
          const beforeId = pointLayers.find(layerId => map.getLayer(layerId));
          if (beforeId) {
            map.moveLayer('rest-layer', beforeId);
          }
        }
      } else {
        // First time — fetch and add
        await loadCategoryLayer(id);
      }

      // 🌟 IF A POINT LAYER WAS JUST TURNED ON, MAKE SURE IT GOES ABOVE REST
      if (id !== 'rest' && map.getLayer('rest-layer')) {
        map.moveLayer(`${id}-layer`); // Moves this point layer to the very top
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

// ── BOOT ─────────────────────────────────────────────────

initModal();
initButtons();

map.on('load', () => {
  initGeolocation();
  toggleCategory('relief');
});
