// js/map.js - RVCE Campus Map and Spatial Navigation (Solarpunk Blueprint Radar)

const dist = s => (Math.hypot(s.x - S.pos.x, s.y - S.pos.y) * 0.7) | 0;

const score = (s, ret) =>
  !s.ok
    ? 1e9
    : dist(s) + ((ret ? s.free < 1 : s.stock[S.cat] < 1) ? 1e6 : 0) + (8 - s.free) * 8;

const best = ret => [...ST].sort((a, b) => score(a, ret) - score(b, ret))[0];

window.nav = s =>
  s.lat == null
    ? toast('Station coordinates pending')
    : open(
        `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking`,
        '_blank',
        'noopener'
      );

// Convert real-world GPS coordinates to RVCE SVG Map coordinates (880 x 570)
function gpsToMap(lat, lng) {
  // RVCE Campus bounding box
  const NW = { lat: 12.9265, lng: 77.4960 };
  const SE = { lat: 12.9205, lng: 77.5020 };

  const normX = (lng - NW.lng) / (SE.lng - NW.lng);
  const normY = (NW.lat - lat) / (NW.lat - SE.lat);

  // Clamp within map bounds
  const x = Math.round(Math.max(40, Math.min(840, 40 + normX * 800)));
  const y = Math.round(Math.max(40, Math.min(530, 40 + normY * 490)));
  return { x, y };
}

// Device Geolocation query (Strict browser GPS)
window.locateDeviceGps = function() {
  if (!('geolocation' in navigator)) {
    toast('Geolocation not supported on this browser');
    return;
  }
  toast('Acquiring satellite GPS lock…');
  const btn = $('#map-gps-btn');
  if (btn) btn.classList.add('seeking');

  navigator.geolocation.getCurrentPosition(
    pos => {
      if (btn) btn.classList.remove('seeking');
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy || 10);
      S.gpsCoords = { lat, lng, acc };
      S.gpsActive = true;

      // Update position on campus blueprint
      S.pos = gpsToMap(lat, lng);
      S.pick = null;
      const b = best();
      toast(`GPS locked: ±${acc}m · Nearest: ${b.n} (${dist(b)}m)`);
      rer();
    },
    err => {
      if (btn) btn.classList.remove('seeking');
      S.gpsActive = false;
      let msg = 'GPS acquisition failed';
      if (err.code === 1) msg = 'Location access denied by user';
      else if (err.code === 2) msg = 'GPS position unavailable';
      else if (err.code === 3) msg = 'GPS request timed out';
      toast(msg);
      rer();
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 10000 }
  );
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

  // User beacon marker with GPS pulse
  const userGpsBadge = S.gpsActive ? 'GPS LOCKED' : 'YOU';
  const userSvg = `
    <g class="map-user-beacon" aria-label="Your current position">
      <!-- Expanding radar ping wave -->
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="22" fill="none" stroke="${S.gpsActive ? '#34A853' : 'var(--ac)'}" stroke-width="2" class="map-radar-ping"/>
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="8" fill="${S.gpsActive ? '#34A853' : 'var(--ac)'}" stroke="var(--fg)" stroke-width="2.5"/>
      <circle cx="${S.pos.x}" cy="${S.pos.y}" r="2.5" fill="#fff"/>
      <!-- User label chip -->
      <g transform="translate(${S.pos.x + 12}, ${S.pos.y - 12})">
        <rect x="0" y="0" width="${S.gpsActive ? 72 : 36}" height="18" rx="3" fill="#0b0b0c" stroke="var(--fg)" stroke-width="1.2"/>
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
    m = Math.max(1, Math.round(dist(r) / 80)),
    f = S.vf || 'all',
    gpsLocked = S.gpsActive && S.gpsCoords;

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
        <button id="map-gps-btn" class="chip map-tool-btn ${gpsLocked ? 'gps-active' : ''}" onclick="locateDeviceGps()" title="Locate using Device GPS">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>
          <span>${gpsLocked ? `GPS (${S.gpsCoords.acc}m)` : 'Locate Me'}</span>
        </button>
        <button class="chip map-tool-btn" onclick="recenterMap()" title="Lock on nearest solar station">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
          <span>Nearest</span>
        </button>
      </div>
    </div>

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
            <span class="badge ${isSel ? 'badge-on' : ''}">${dist(s)} m</span>
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
        </div>
        <div class="route-target-metrics">
          <span><b>${dist(r)} m</b> walking distance</span>
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
  S.pos = { x: (v[2] + v[4] / 2) | 0, y: (v[3] + v[5] / 2) | 0 };
  S.pick = null;
  const b = best();
  toast('You are at ' + v[1] + '. Nearest: ' + b.n + ' (' + dist(b) + ' m)');
  rer();
};

window.mvp = e => {
  const b = e.currentTarget.getBoundingClientRect();
  S.pos = {
    x: Math.max(20, Math.min(860, ((e.clientX - b.left) / b.width) * 880)) | 0,
    y: Math.max(20, Math.min(550, ((e.clientY - b.top) / b.height) * 570)) | 0
  };
  S.pick = null;
  rer();
};
