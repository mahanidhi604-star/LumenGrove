// js/map.js - RVCE Campus Map and Spatial Navigation (Solarpunk Blueprint Radar with Live Device GPS)

// Haversine real-world geographic distance in meters
const geoDist = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Distance calculation: uses exact device GPS coordinates when active, or canvas step coordinates
const dist = s => {
  if (S.gpsActive && S.gpsCoords && s.lat != null && s.lng != null) {
    return geoDist(S.gpsCoords.lat, S.gpsCoords.lng, s.lat, s.lng);
  }
  return (Math.hypot(s.x - S.pos.x, s.y - S.pos.y) * 0.7) | 0;
};

window.fmtDist = d => (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m');

const score = (s, ret) =>
  !s.ok
    ? 1e9
    : dist(s) + ((ret ? s.free < 1 : s.stock[S.cat] < 1) ? 1e6 : 0) + (8 - s.free) * 8;

const best = ret => [...ST].sort((a, b) => score(a, ret) - score(b, ret))[0];

window.nav = s => {
  if (s.lat == null) {
    toast('Station coordinates pending');
    return;
  }
  const originParam = S.gpsActive && S.gpsCoords ? `&origin=${S.gpsCoords.lat},${S.gpsCoords.lng}` : '';
  open(
    `https://www.google.com/maps/dir/?api=1${originParam}&destination=${s.lat},${s.lng}&travelmode=walking`,
    '_blank',
    'noopener'
  );
};

// Convert real-world GPS coordinates to RVCE SVG Map coordinates (880 x 570)
function gpsToMap(lat, lng) {
  const campusCenter = { lat: 12.9237, lng: 77.4987 };
  const dCampus = geoDist(lat, lng, campusCenter.lat, campusCenter.lng);

  // If outside campus boundary (> 650m), project bearing vector onto radar perimeter
  if (dCampus > 650) {
    const dLat = lat - campusCenter.lat;
    const dLng = lng - campusCenter.lng;
    const angle = Math.atan2(-dLat, dLng); // Canvas Y is inverted
    const x = Math.round(Math.max(40, Math.min(840, 440 + Math.cos(angle) * 380)));
    const y = Math.round(Math.max(40, Math.min(530, 285 + Math.sin(angle) * 235)));
    const bearingDeg = Math.round(((Math.atan2(dLng, dLat) * 180 / Math.PI) + 360) % 360);
    return { x, y, isOffCampus: true, dCampus, bearingDeg };
  }

  // Inside or near RVCE campus: precise architectural blueprint mapping
  const NW = { lat: 12.9265, lng: 77.4960 };
  const SE = { lat: 12.9205, lng: 77.5020 };

  const normX = (lng - NW.lng) / (SE.lng - NW.lng);
  const normY = (NW.lat - lat) / (NW.lat - SE.lat);

  const x = Math.round(Math.max(40, Math.min(840, 40 + normX * 800)));
  const y = Math.round(Math.max(40, Math.min(530, 40 + normY * 490)));
  return { x, y, isOffCampus: false, dCampus };
}

// Device Geolocation query (Dual-source: Instant Network IP + Browser Satellite GPS + Continuous Tracking)
let gpsWatchId = null;

window.locateDeviceGps = async function(userInitiated = true) {
  const btn = $('#map-gps-btn');
  if (btn) btn.classList.add('seeking');
  if (userInitiated) toast('Detecting device location…');

  const applyCoords = (lat, lng, acc, source = 'GPS', city = '') => {
    if (btn) btn.classList.remove('seeking');
    // If user explicitly chose simulation mode and this was not user-initiated, do not overwrite simulation
    if (S.isSimulated && !userInitiated) {
      return;
    }
    // If Satellite GPS is already locked, don't downgrade to Network IP
    if (S.gpsActive && S.gpsCoords && S.gpsCoords.source === 'Satellite GPS' && source !== 'Satellite GPS') {
      return;
    }
    S.isSimulated = false;
    const finalCity = city || (S.gpsCoords && S.gpsCoords.city) || '';
    S.gpsCoords = { lat, lng, acc, source, city: finalCity };
    S.gpsActive = true;
    S.gpsDenied = false;

    // Convert to map coordinates (or off-campus projection)
    S.pos = gpsToMap(lat, lng);
    const b = best();
    const dStr = window.fmtDist(dist(b));
    if (userInitiated) {
      toast(`Location locked (${finalCity ? finalCity + ' · ' : ''}${source}): ${dStr} to ${b.n}`);
    }
    rer();
  };

  // 1. Instant Network IP Fetch (Resolves in ~200ms with real city and coordinates!)
  const fetchNetworkLocation = async () => {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success && !isNaN(data.latitude) && !isNaN(data.longitude)) {
          applyCoords(parseFloat(data.latitude), parseFloat(data.longitude), 1000, 'Network IP', data.city || '');
          return true;
        }
      }
    } catch (e) {}

    try {
      const res2 = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (res2.ok) {
        const data2 = await res2.json();
        const lat = parseFloat(data2.latitude);
        const lng = parseFloat(data2.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          applyCoords(lat, lng, 1000, 'Network IP', data2.city || '');
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  // Query network IP immediately
  fetchNetworkLocation();

  // 2. High-Precision Browser GPS
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 10), 'Satellite GPS');
      },
      async err => {
        console.warn('Browser GPS notice:', err.message);
        if (btn) btn.classList.remove('seeking');
        if (err.code === 1) {
          S.gpsDenied = true;
          if (!S.gpsActive) await fetchNetworkLocation();
          if (userInitiated && !S.gpsActive) {
            toast('Browser location blocked. Click the lock 🔒 in URL bar to enable precise GPS.');
          }
        }
        rer();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );

    // Continuous watch for movement
    if (!gpsWatchId) {
      try {
        gpsWatchId = navigator.geolocation.watchPosition(
          pos => {
            applyCoords(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 10), 'Satellite GPS');
          },
          () => {},
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
      } catch (e) {}
    }
  }
};

window.setOnCampusPreset = function(id) {
  S.isSimulated = true;
  S.gpsActive = false;
  if (id === 'gate') {
    S.pos = { x: 360, y: 60, isOffCampus: false };
    toast('Set simulated location: RVCE Main Gate');
  } else if (id === 'library') {
    S.pos = { x: 425, y: 384, isOffCampus: false };
    toast('Set simulated location: Central Library');
  } else if (id === 'food') {
    S.pos = { x: 560, y: 377, isOffCampus: false };
    toast('Set simulated location: M.M Foods');
  }
  rer();
};

window.recenterMap = function() {
  const b = best();
  S.pick = b;
  toast(`Target locked to ${b.n}`);
  rer();
};

const mapIn = () => {
  const r = S.pick || best(),
    P = `M${S.pos.x} ${S.pos.y}L${r.x} ${r.y}`,
    f = S.vf || 'all',
    k = (S.vq || '').toLowerCase(),
    on = v =>
      (f == 'all' || (f == 'st' && v[7]) || (f == 'food' && v[6] == 'food') || (f == 'dept' && v[6] == 'dept')) &&
      (!k || v[1].toLowerCase().includes(k));

  // Concentric radar range rings around selected station
  const radarRings = `
    <g class="radar-range-rings" opacity="0.35" pointer-events="none">
      <circle cx="${r.x}" cy="${r.y}" r="70" fill="none" stroke="var(--ac)" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="${r.x + 74}" y="${r.y + 4}" font-size="9" font-family="'Barlow Condensed',monospace" fill="var(--ac)" font-weight="700">50m</text>
      <circle cx="${r.x}" cy="${r.y}" r="140" fill="none" stroke="var(--ac)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="${r.x + 144}" y="${r.y + 4}" font-size="9" font-family="'Barlow Condensed',monospace" fill="var(--ac)" font-weight="700">100m</text>
      <circle cx="${r.x}" cy="${r.y}" r="240" fill="none" stroke="var(--fg)" stroke-width="0.8" stroke-dasharray="6 6" opacity="0.5"/>
      <text x="${r.x + 244}" y="${r.y + 4}" font-size="9" font-family="'Barlow Condensed',monospace" fill="var(--mut)" font-weight="700">170m</text>
    </g>`;

  // Azimuth compass rose (top right)
  const compass = `
    <g transform="translate(820, 56)" class="map-azimuth-dial" aria-hidden="true">
      <circle cx="0" cy="0" r="32" fill="var(--bg)" stroke="var(--fg)" stroke-width="1.5"/>
      <circle cx="0" cy="0" r="28" fill="none" stroke="var(--ln)" stroke-width="1" stroke-dasharray="2 3"/>
      <circle cx="0" cy="0" r="2" fill="var(--ac)"/>
      <line x1="0" y1="-28" x2="0" y2="28" stroke="var(--fg)" stroke-width="0.8" opacity="0.6"/>
      <line x1="-28" y1="0" x2="28" y2="0" stroke="var(--fg)" stroke-width="0.8" opacity="0.6"/>
      <text x="0" y="-18" font-size="9" font-weight="800" text-anchor="middle" fill="var(--ac)" font-family="'Barlow Condensed',sans-serif">N</text>
      <text x="20" y="3" font-size="8" font-weight="700" text-anchor="middle" fill="var(--fg)" font-family="'Barlow Condensed',sans-serif">E</text>
      <text x="0" y="24" font-size="8" font-weight="700" text-anchor="middle" fill="var(--fg)" font-family="'Barlow Condensed',sans-serif">S</text>
      <text x="-20" y="3" font-size="8" font-weight="700" text-anchor="middle" fill="var(--fg)" font-family="'Barlow Condensed',sans-serif">W</text>
      <path d="M0 -26 L4 -14 L0 -17 L-4 -14 Z" fill="var(--ac)"/>
    </g>`;

  // Technical coordinate ruler markings along perimeter
  const rulers = `
    <g class="map-tech-rulers" font-size="8" font-family="'Barlow Condensed',monospace" fill="var(--mut)" opacity="0.75" aria-hidden="true">
      <rect x="0" y="0" width="880" height="26" fill="var(--ln)"/>
      <text x="14" y="17" font-weight="800" fill="var(--fg)">MYSORE ROAD · PATTANAGERE METRO GATE (NORTH)</text>
      <text x="440" y="17" text-anchor="middle" font-weight="700">GRID AZIMUTH 000° · 12.9237° N · 77.4987° E</text>
      <rect x="0" y="552" width="880" height="18" fill="var(--ln)"/>
      <text x="14" y="565" font-weight="700">SCALE 1:1200 // STEP INTERVAL: 0.7M // OFF-GRID SOLAR MATRIX</text>
      <text x="866" y="565" text-anchor="end" font-weight="800" fill="var(--ac)">RVCE CAMPUS</text>
    </g>`;

  // Selected station target reticle
  const reticle = `
    <g class="station-target-reticle" aria-hidden="true">
      <circle cx="${r.x}" cy="${r.y}" r="26" fill="none" stroke="var(--ac)" stroke-width="2" stroke-dasharray="6 4" class="auth-gear-spin"/>
      <circle cx="${r.x}" cy="${r.y}" r="32" fill="none" stroke="var(--fg)" stroke-width="1" opacity="0.4"/>
      <line x1="${r.x - 36}" y1="${r.y}" x2="${r.x - 12}" y2="${r.y}" stroke="var(--ac)" stroke-width="1.5"/>
      <line x1="${r.x + 12}" y1="${r.y}" x2="${r.x + 36}" y2="${r.y}" stroke="var(--ac)" stroke-width="1.5"/>
      <line x1="${r.x}" y1="${r.y - 36}" x2="${r.x}" y2="${r.y - 12}" stroke="var(--ac)" stroke-width="1.5"/>
      <line x1="${r.x}" y1="${r.y + 12}" x2="${r.x}" y2="${r.y + 36}" stroke="var(--ac)" stroke-width="1.5"/>
    </g>`;

  // Venues rendering
  const venuesSvg = VN.map(v => {
    const s = v[7],
      cx = v[2] + v[4] / 2,
      cy = v[3] + v[5] / 2,
      cat = v[6],
      isFood = cat === 'food' || cat === 'hub',
      isDept = cat === 'dept';

    return `<g class="v" tabindex="0" role="button" aria-label="${v[1]}" onkeydown="if(event.key=='Enter')this.dispatchEvent(new MouseEvent('click',{bubbles:true}))" opacity="${
      on(v) ? 1 : 0.22
    }" onclick="${s ? `pickSt('${v[0]}',event)` : `pickVenue('${v[0]}',event)`}">
      <rect x="${v[2]}" y="${v[3]}" width="${v[4]}" height="${v[5]}" rx="4" fill="${
        s ? 'var(--ac)' : isFood ? 'color-mix(in srgb, var(--card) 90%, #f08a24)' : isDept ? 'color-mix(in srgb, var(--card) 92%, #38bdf8)' : 'var(--card)'
      }" stroke="var(--fg)" stroke-width="${r.id == v[0] ? 3.5 : 1.2}"/>
      <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${
        s ? 'var(--on)' : 'var(--fg)'
      }">${v[1]}</text>
      ${s ? `<circle class="pl" cx="${v[2] + v[4] - 8}" cy="${v[3] + 8}" r="5" fill="var(--ac2)"/>` : ''}
    </g>`;
  }).join('');

  // Station badges over the map
  const stationsSvg = ST.map(st => {
    const isSel = r.id === st.id;
    return `<g class="map-station-pin" onclick="pickSt('${st.id}',event)" style="cursor:pointer">
      <circle cx="${st.x}" cy="${st.y}" r="${isSel ? 16 : 12}" fill="${isSel ? 'var(--ac)' : 'var(--card)'}" stroke="var(--fg)" stroke-width="2"/>
      <text x="${st.x}" y="${st.y + 4}" text-anchor="middle" font-size="${isSel ? 12 : 10}" font-weight="800" fill="${isSel ? 'var(--on)' : 'var(--fg)'}">⚡</text>
      <rect x="${st.x - 28}" y="${st.y + (isSel ? 18 : 14)}" width="56" height="15" rx="3" fill="#0b0b0c" stroke="var(--fg)" stroke-width="1"/>
      <text x="${st.x}" y="${st.y + (isSel ? 29 : 25)}" text-anchor="middle" font-size="9" font-weight="700" fill="#f5f5f0" font-family="'Barlow Condensed',monospace">${st.free} FREE</text>
    </g>`;
  }).join('');

  // Walking path with laser glow & moving energy photon
  const routeSvg = `
    <!-- Laser glow path underlay -->
    <path d="${P}" stroke="var(--ac)" stroke-width="6" fill="none" opacity="0.32" stroke-linecap="round"/>
    <!-- Crisp moving dash line -->
    <path class="rt" d="${P}" stroke="var(--fg)" stroke-width="2.2" stroke-dasharray="6 5" fill="none"/>
    <!-- Flowing photon pulse -->
    <circle r="5" fill="var(--ac)">
      <animateMotion dur="2.4s" repeatCount="indefinite" path="${P}"/>
    </circle>
    <circle r="2.5" fill="#fff">
      <animateMotion dur="2.4s" repeatCount="indefinite" path="${P}"/>
    </circle>`;

  // User beacon marker with live GPS telemetry
  const isOff = S.pos && S.pos.isOffCampus;
  const cityLabel = S.gpsCoords?.city ? S.gpsCoords.city.toUpperCase() + ' · ' : '';
  const userGpsBadge = S.gpsActive
    ? isOff
      ? `YOU: ${cityLabel}${window.fmtDist(S.pos.dCampus)} AWAY`
      : `GPS LOCKED (±${S.gpsCoords?.acc}m)`
    : 'YOU (TAP MAP)';

  const badgeWidth = S.gpsActive ? (isOff ? 165 : 105) : 80;

  const offCampusBeam = isOff
    ? `
    <!-- Off-campus bearing vector towards campus center -->
    <line x1="${S.pos.x}" y1="${S.pos.y}" x2="440" y2="285" stroke="var(--ac)" stroke-width="1.8" stroke-dasharray="4 4" opacity="0.6"/>
    <circle cx="440" cy="285" r="4" fill="var(--ac)" opacity="0.8"/>
    <text x="440" y="275" font-size="8" font-family="'Barlow Condensed',monospace" fill="var(--ac)" font-weight="700" text-anchor="middle">RVCE CAMPUS CENTER</text>
  `
    : '';

  const userSvg = `
    <g class="map-user-beacon" aria-label="Your current position">
      ${offCampusBeam}
      <!-- Expanding radar ping wave -->
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="22" fill="none" stroke="${S.gpsActive ? '#34A853' : 'var(--ac)'}" stroke-width="2" class="map-radar-ping"/>
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="8" fill="${S.gpsActive ? '#34A853' : 'var(--ac)'}" stroke="var(--fg)" stroke-width="2.5"/>
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="2.5" fill="#fff"/>
      <!-- User label chip -->
      <g transform="translate(${Math.min(690, Math.max(10, S.pos.x + 12))}, ${Math.max(28, Math.min(540, S.pos.y - 12))})">
        <rect x="0" y="0" width="${badgeWidth}" height="18" rx="3" fill="#0b0b0c" stroke="var(--fg)" stroke-width="1.2"/>
        <text x="6" y="13" font-size="9" font-weight="800" fill="${S.gpsActive ? '#c9d86a' : 'var(--ac)'}" font-family="'Barlow Condensed',monospace">${userGpsBadge}</text>
      </g>
    </g>`;

  return `<defs>
    <pattern id="radarBlueprintGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="40" y2="0" stroke="var(--ln)" stroke-width="0.8" opacity="0.35"/>
      <line x1="0" y1="0" x2="0" y2="40" stroke="var(--ln)" stroke-width="0.8" opacity="0.35"/>
      <circle cx="20" cy="20" r="0.8" fill="var(--fg)" opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="880" height="570" fill="url(#radarBlueprintGrid)"/>
  ${rulers}
  ${compass}
  ${radarRings}
  ${venuesSvg}
  ${reticle}
  ${stationsSvg}
  ${routeSvg}
  ${userSvg}`;
};

const mapSvg = () => {
  const r = S.pick || best(),
    dReal = dist(r),
    m = Math.max(1, Math.round(dReal / 80)),
    f = S.vf || 'all',
    gpsLocked = S.gpsActive && S.gpsCoords,
    isOff = S.pos && S.pos.isOffCampus;

  const gpsBtnLabel = gpsLocked
    ? `${S.gpsCoords.city ? S.gpsCoords.city : S.gpsCoords.source} (±${S.gpsCoords.acc}m)`
    : 'Use My Location';

  return `<div class="mp solarpunk-map-hud">
    <!-- Top Filter & GPS Command Deck -->
    <div class="mf map-command-deck">
      <div class="map-filter-group">
        ${[
          ['all', 'All'],
          ['st', '⚡ Solar stations'],
          ['food', '☕ Food & Cafés'],
          ['dept', '🎓 Depts']
        ]
          .map(
            a =>
              `<button class="chip ${f == a[0] ? 'active' : ''}" aria-pressed="${f == a[0]}" style="${
                f == a[0] ? 'background:var(--ac);color:var(--on);font-weight:700' : ''
              }" onclick="vf('${a[0]}')">${a[1]}</button>`
          )
          .join('')}
      </div>

      <div class="map-search-group">
        <input type="search" aria-label="Search venues" placeholder="Search campus venue..." value="${
          S.vq || ''
        }" oninput="vs(this.value)">
      </div>

      <div class="map-action-tools">
        <button id="map-gps-btn" class="chip map-tool-btn ${gpsLocked ? 'gps-active' : ''}" onclick="locateDeviceGps(true)" title="Acquire and track device GPS location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
          <span>${gpsBtnLabel}</span>
        </button>
        <button class="chip map-tool-btn" onclick="recenterMap()" title="Lock on nearest solar station">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          <span>Nearest</span>
        </button>
      </div>
    </div>

    <!-- Live Telemetry Status Banner -->
    ${
      gpsLocked && isOff
        ? `<div class="off-campus-telemetry-banner" role="status">
            <div class="off-campus-info">
              <i class="auth-dot-pulse" style="background:#34A853"></i>
              <span><strong>Live Device Location:</strong> ${
                S.gpsCoords.city ? S.gpsCoords.city + ', ' : ''
              }${S.gpsCoords.lat.toFixed(4)}°N, ${S.gpsCoords.lng.toFixed(4)}°E (${S.gpsCoords.source}) · <strong>${window.fmtDist(
            S.pos.dCampus
          )}</strong> from RVCE Campus</span>
            </div>
            <div class="off-campus-controls">
              <button type="button" class="btn btn-sm" onclick="setOnCampusPreset('library')" title="Simulate walking inside RVCE campus to test local routing">
                🏫 Walk Inside RVCE (Simulate)
              </button>
            </div>
          </div>`
        : !S.gpsActive && S.gpsCoords
        ? `<div class="sim-mode-banner" role="status">
            <div class="off-campus-info">
              <span class="badge" style="background:var(--ac);color:var(--on);font-weight:700">SIMULATION MODE</span>
              <span>Testing position inside RVCE Campus. Real device is in <strong>${
                S.gpsCoords.city || `${S.gpsCoords.lat.toFixed(2)}°, ${S.gpsCoords.lng.toFixed(2)}°`
              }</strong>.</span>
            </div>
            <button type="button" class="chip map-tool-btn" onclick="locateDeviceGps(true)" style="background:var(--ac);color:var(--on);font-weight:700">
              📍 Return to Real Location
            </button>
          </div>`
        : ''
    }

    <!-- Redesigned Solarpunk Blueprint Radar Canvas -->
    <div class="msv-frame">
      <svg viewBox="0 0 880 570" class="msv" onclick="mvp(event)" role="img" aria-label="RVCE campus blueprint radar map. Tap to set position or pick station.">
        ${mapIn()}
      </svg>
    </div>

    <!-- Station Quick-Picker Strip -->
    <div class="map-station-strip" role="region" aria-label="Campus Solar Stations">
      ${ST.map(s => {
        const isSel = r.id === s.id;
        return `<button type="button" class="map-station-pill ${isSel ? 'selected' : ''}" onclick="pickSt('${s.id}',event)">
          <div class="stn-pill-top">
            <span class="stn-pill-name"><b>${s.n}</b></span>
            <span class="badge ${isSel ? 'badge-on' : ''}">${window.fmtDist(dist(s))}</span>
          </div>
          <div class="stn-pill-sub">
            <span>⚡ ${s.free} free</span>
            <span>· ${s.stock[S.cat]} ${CATS[S.cat].n}</span>
          </div>
        </button>`;
      }).join('')}
    </div>

    <!-- Active Route Readout & Nav Controls -->
    <div class="map-route-card">
      <div class="route-details">
        <div class="route-target-name">
          <i class="auth-dot-pulse"></i>
          <span>Target: <b>${r.n}</b></span>
          ${gpsLocked ? `<span class="badge" style="background:#17140d;color:#34A853;border:1px solid #34A853;font-family:'Barlow Condensed',monospace">● LIVE GPS ACTIVE</span>` : ''}
        </div>
        <div class="route-target-metrics">
          <span><b>${window.fmtDist(dReal)}</b> from your current position${gpsLocked && S.gpsCoords.city ? ' in ' + S.gpsCoords.city : ''}</span>
          <span>· About <b>${m} min</b> walk</span>
          <span>· <b>${r.free}</b> slots ready</span>
        </div>
      </div>
      <div class="route-actions">
        <button class="btn btn-sm" onclick="startR()">⚡ Rent from ${r.n}</button>
        <button class="btn g btn-sm" onclick="nav(ST.find(x=>x.id=='${r.id}'))">Directions ↗</button>
      </div>
    </div>
  </div>`;
};

const rer = () => ($('#rb') ? rr() : go(1));

window.vf = f => {
  S.vf = f;
  rer();
};

window.vs = v => {
  S.vq = v;
  document.querySelectorAll('.msv').forEach(s => (s.innerHTML = mapIn()));
  if (!VN.some(x => x[1].toLowerCase().includes(v.toLowerCase()))) toast('No venues match');
};

window.pickSt = (id, e) => {
  if (e) e.stopPropagation();
  S.pick = ST.find(x => x.id == id);
  toast('Selected station: ' + S.pick.n);
  rer();
};

window.pickVenue = (id, e) => {
  if (e) e.stopPropagation();
  const v = VN.find(x => x[0] == id);
  S.pos = { x: (v[2] + v[4] / 2) | 0, y: (v[3] + v[5] / 2) | 0, isOffCampus: false };
  S.gpsActive = false;
  S.pick = null;
  const b = best();
  toast('Position set to ' + v[1] + ' · Nearest: ' + b.n + ' (' + window.fmtDist(dist(b)) + ')');
  rer();
};

window.mvp = e => {
  const rect = e.currentTarget.getBoundingClientRect();
  S.pos = {
    x: Math.max(20, Math.min(860, ((e.clientX - rect.left) / rect.width) * 880)) | 0,
    y: Math.max(20, Math.min(550, ((e.clientY - rect.top) / rect.height) * 570)) | 0,
    isOffCampus: false
  };
  S.gpsActive = false;
  S.pick = null;
  const nearest = best();
  toast('Custom position set on map · Nearest: ' + nearest.n + ' (' + window.fmtDist(dist(nearest)) + ')');
  rer();
};
