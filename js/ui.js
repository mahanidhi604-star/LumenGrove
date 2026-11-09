// js/ui.js - View Renderers, Page Routing, Modals, Header/Tabs, Toast, and Lumi Bot

const slots = id =>
  [...Array(10)].map((_, i) => {
    const c = (i * 37 + id.length * 13) % 100,
      r = i % 7 == 3;
    return { i, c, s: r ? 'out' : c >= 90 ? 'ready' : 'charging' };
  });

const free = id => {
  const s = ST.find(x => x.id == id);
  return s ? s.free : 0;
};

const logo = (s = 34) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3c11 6 16 15 16 26a16 16 0 0 1-32 0C8 18 13 9 24 3z" fill="var(--ac2)"/><path class="bolt" d="M27 13 17 28h6l-2 9 11-16h-7z" fill="var(--ac)"/><circle cx="24" cy="42" r="1.8" fill="var(--ac)"/></svg>`;

const qr = id => {
  let r = '',
    h = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      if (h % 3) r += `<rect x="${x * 8}" y="${y * 8}" width="7" height="7" fill="currentColor"/>`;
    }
  }
  return `<svg viewBox="0 0 72 72" width="96" role="img" aria-label="QR placeholder for ${id}">${r}</svg>`;
};

const sol = () => `<span class="badge sol">Solar now · 38 W</span>`;

const need = `<section class="wrap"><h1 tabindex="-1">Sign in to rent</h1><p>Guests can browse stations. Renting needs a student account.</p><a class="btn" href="#signin" onclick="sessionStorage.setItem('lg_redirect_hash',location.hash)">Sign in</a></section>`;

const stn = s =>
  `<a class="card tile" href="#app-station-${s.id}"><span class="k">${free(s.id)}/10 free</span><h3>${s.n}</h3>${sol()}</a>`;

const ic = p =>
  `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" stroke-width="1.6" aria-hidden="true"><path d="${p}"/></svg>`;

const pill = (k, a, f) =>
  `<button class="chip" style="${
    S[k] == a[0] ? 'background:var(--ac);color:var(--on)' : ''
  }" aria-pressed="${S[k] == a[0]}" onclick="${f(a[0])}">${a[1]}</button>`;

window.toast = m => {
  const e = $('#toast');
  if (!e) return;
  e.textContent = typeof trT === 'function' ? trT(m) : m;
  e.classList.add('on');
  setTimeout(() => e.classList.remove('on'), 2200);
};

window.theme = x => {
  S.th = x;
  sv('th', x);
  document.documentElement.dataset.t = x;
};

window.cu = on => {
  const c = $('#cu');
  if (c) c.classList.toggle('on', on);
};

window.cmp = id => {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="cm" onclick="if(event.target==this)this.remove()"><div class="card" style="width:min(460px,92%);background:var(--card)" role="dialog" aria-label="File a complaint"><h3>File a complaint</h3><label for="ct">Issue</label><select id="ct" style="width:100%"><option>Paid but no PIN</option><option>Lock stuck</option><option>Bank not charging</option><option>Wrong amount</option><option>Other</option></select><label for="cn">Details ${
      id ? '(transaction ' + id + ')' : ''
    }</label><textarea id="cn" rows="4" style="width:100%"></textarea><p><button class="btn" onclick="$('#cm').remove();toast('Complaint filed (demo)')">Submit</button> <button class="btn g" onclick="$('#cm').remove()">Cancel</button></p></div></div>`
  );
  const e = $('#ct');
  if (e) e.focus();
};

function stDetail(id) {
  const s = ST.find(x => x.id == id);
  if (!s) return PG.home();
  return `<div class="wrap"><h1 tabindex="-1">${s.n}</h1>${sol()} <div class="slots" style="margin:20px 0">${slots(
    id
  )
    .map(
      x =>
        `<div class="slot"><b>#${x.i + 1}</b> ${
          x.s == 'ready' ? 'Ready' : x.s == 'out' ? 'Out' : 'Charging'
        }<div class="bar"><i style="width:${x.c}%"></i></div><small>${x.c}%</small></div>`
    )
    .join('')}</div><div class="card" style="display:inline-block;color:var(--fg)">${qr(
    id
  )}<p>Station QR (placeholder)</p></div><p><a class="btn" href="#app-rent" onclick="S.pick=ST.find(x=>x.id=='${
    id
  }')">${t('rent')}</a></p></div>`;
}

// Lumi bot messaging
const say = (x, u) => {
  const m = $('#lmm');
  if (!m) return;
  m.insertAdjacentHTML('beforeend', `<div class="m${u ? ' u' : ''}"></div>`);
  m.lastChild.textContent = x;
  m.scrollTop = 1e5;
};

const reply = x => {
  const h = KB.find(k => k[0].test(x.toLowerCase()));
  setTimeout(() => say(h ? h[1] : 'I am not sure. Please contact management using your registered phone or email.'), 400);
};

window.lumi = x => {
  const lmp = $('#lmp');
  if (lmp) lmp.style.display = 'block';
  const lmm = $('#lmm');
  if (lmm && !lmm.children.length) say('Hi, I am Lumi. Ask me about PINs, bank types, returns or charging.');
  say(x, 1);
  reply(x);
};

const hs = (x, u) => {
  const m = $('#hm');
  if (!m) return;
  m.insertAdjacentHTML('beforeend', '<div class="m' + (u ? ' u' : '') + '"></div>');
  m.lastChild.textContent = x;
  m.scrollTop = 1e5;
};

window.hask = x => {
  x = x.trim();
  if (!x) return;
  const hi = $('#hi');
  if (hi) hi.value = '';
  hs(x, 1);
  const h = KB.find(k => k[0].test(x.toLowerCase()));
  setTimeout(() => hs(h ? h[1] : 'I am not sure. Please file a complaint or contact management.'), 400);
};

// --- Solarpunk Auth Poster Collages & Banners ---
function renderAuthBanner(errorMsg, isDevNote) {
  if (!errorMsg) return '';
  if (isDevNote) {
    return `<div class="auth-dev-note" role="note"><span class="k">${t('dev_note_title')}</span><p>${window.escapeHtml ? window.escapeHtml(errorMsg) : errorMsg}</p></div>`;
  }
  return `<div class="err-box auth-banner err" role="alert" aria-live="polite">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${window.escapeHtml ? window.escapeHtml(errorMsg) : errorMsg}</span>
  </div>`;
}

function renderStudentCollage() {
  return `<svg class="auth-collage-svg" viewBox="0 0 400 540" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solarpunk poster artwork">
    <defs>
      <radialGradient id="sunGlow" cx="65%" cy="30%" r="60%">
        <stop offset="0%" stop-color="var(--ac)" stop-opacity="1"/>
        <stop offset="45%" stop-color="#f5b73b" stop-opacity="0.85"/>
        <stop offset="75%" stop-color="var(--ac)" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="var(--ac)" stop-opacity="0"/>
      </radialGradient>
      <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="var(--fg)" opacity="0.18"/>
      </pattern>
      <pattern id="diagHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="12" stroke="var(--fg)" stroke-width="1.2" opacity="0.15"/>
      </pattern>
    </defs>
    <rect width="400" height="540" fill="url(#dotGrid)"/>
    <g stroke="var(--fg)" stroke-width="1.2" opacity="0.45">
      <line x1="16" y1="24" x2="32" y2="24"/><line x1="24" y1="16" x2="24" y2="32"/>
      <line x1="368" y1="24" x2="384" y2="24"/><line x1="376" y1="16" x2="376" y2="32"/>
      <line x1="16" y1="516" x2="32" y2="516"/><line x1="24" y1="508" x2="24" y2="524"/>
      <line x1="368" y1="516" x2="384" y2="516"/><line x1="376" y1="508" x2="376" y2="524"/>
      <circle cx="200" cy="24" r="3" fill="var(--fg)"/>
    </g>
    <g transform="translate(24, 28)" opacity="0.55" fill="var(--fg)" font-family="'Barlow Condensed', monospace" font-size="7.5" letter-spacing="0.12em">
      <text x="0" y="8">01 02 03 04 05 06 07 08 09 10</text>
      <text x="0" y="18">11 12 13 14 15 16 17 18 19 20</text>
      <text x="0" y="28">21 22 23 24 25 26 27 28 29 30</text>
      <rect x="-2" y="-2" width="138" height="34" fill="none" stroke="var(--fg)" stroke-width="0.8" stroke-dasharray="3 2"/>
    </g>
    <g class="auth-sun-breathe">
      <circle cx="280" cy="150" r="125" fill="url(#sunGlow)"/>
      <circle cx="280" cy="150" r="95" fill="var(--ac)" opacity="0.88"/>
      <circle cx="280" cy="150" r="115" fill="none" stroke="var(--fg)" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.5"/>
    </g>
    <g class="auth-gear-spin" style="transform-origin: 280px 150px">
      <circle cx="280" cy="150" r="140" fill="none" stroke="var(--ac2)" stroke-width="2.5" stroke-dasharray="14 8" opacity="0.75"/>
      <circle cx="280" cy="150" r="75" fill="none" stroke="var(--fg)" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.4"/>
      <line x1="280" y1="8" x2="280" y2="32" stroke="var(--ac2)" stroke-width="3"/>
      <line x1="280" y1="268" x2="280" y2="292" stroke="var(--ac2)" stroke-width="3"/>
      <line x1="138" y1="150" x2="162" y2="150" stroke="var(--ac2)" stroke-width="3"/>
      <line x1="398" y1="150" x2="422" y2="150" stroke="var(--ac2)" stroke-width="3"/>
    </g>
    <rect x="24" y="160" width="60" height="90" fill="url(#diagHatch)" stroke="var(--fg)" stroke-width="1.2"/>
    <g transform="translate(85, 195)">
      <rect x="0" y="0" width="220" height="64" fill="#0b0b0c" stroke="var(--fg)" stroke-width="1.5"/>
      <text x="12" y="26" fill="#f5f5f0" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="16" letter-spacing="0.06em">FUTURE IS SOLAR-CHARGED.</text>
      <text x="12" y="48" fill="var(--ac)" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="14" letter-spacing="0.08em">SOLARPUNK CAMPUS · RVCE</text>
    </g>
    <g transform="translate(140, 395)" class="auth-drift">
      <path d="M0 -65 L12 -28 L0 0 L-12 -28 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M46 -46 L20 -10 L0 0 L10 -20 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M65 0 L28 12 L0 0 L28 -12 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M46 46 L10 20 L0 0 L20 10 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M0 65 L-12 28 L0 0 L12 28 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M-46 46 L-20 10 L0 0 L-10 20 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M-65 0 L-28 -12 L0 0 L-28 12 Z" fill="var(--ac2)" opacity="0.5"/>
      <path d="M-46 -46 L-10 -20 L0 0 L-20 -10 Z" fill="var(--ac2)" opacity="0.5"/>
      <circle cx="0" cy="0" r="44" fill="var(--card)" stroke="var(--fg)" stroke-width="1.8"/>
      <ellipse cx="0" cy="0" rx="20" ry="44" fill="none" stroke="var(--fg)" stroke-width="1.2" opacity="0.75"/>
      <line x1="-44" y1="0" x2="44" y2="0" stroke="var(--fg)" stroke-width="1.2" opacity="0.75"/>
      <line x1="-38" y1="-18" x2="38" y2="-18" stroke="var(--fg)" stroke-width="1" opacity="0.6"/>
      <line x1="-38" y1="18" x2="38" y2="18" stroke="var(--fg)" stroke-width="1" opacity="0.6"/>
    </g>
    <g transform="translate(372, 480) rotate(-90)">
      <text x="0" y="0" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="74" fill="none" stroke="var(--fg)" stroke-width="1.6" letter-spacing="0.14em" opacity="0.9">SOLAR</text>
    </g>
    <g transform="translate(24, 470)" fill="var(--fg)">
      <rect x="0" y="0" width="3" height="32"/>
      <rect x="5" y="0" width="1.5" height="32"/>
      <rect x="9" y="0" width="4" height="32"/>
      <rect x="15" y="0" width="2" height="32"/>
      <rect x="19" y="0" width="1" height="32"/>
      <rect x="23" y="0" width="3" height="32"/>
      <rect x="28" y="0" width="5" height="32"/>
      <rect x="35" y="0" width="2" height="32"/>
      <rect x="39" y="0" width="3" height="32"/>
      <rect x="44" y="0" width="1.5" height="32"/>
      <rect x="48" y="0" width="4" height="32"/>
      <rect x="54" y="0" width="2" height="32"/>
      <rect x="58" y="0" width="3.5" height="32"/>
      <rect x="64" y="0" width="1.5" height="32"/>
      <rect x="68" y="0" width="4" height="32"/>
      <text x="0" y="44" font-family="'Barlow Condensed', monospace" font-size="9" letter-spacing="0.1em">RVCE-LG-2026</text>
    </g>
    <g transform="translate(200, 464)">
      <rect x="0" y="0" width="44" height="44" fill="var(--card)" stroke="var(--fg)" stroke-width="1.5"/>
      <rect x="4" y="4" width="12" height="12" fill="var(--fg)"/>
      <rect x="6" y="6" width="8" height="8" fill="var(--card)"/>
      <rect x="28" y="4" width="12" height="12" fill="var(--fg)"/>
      <rect x="30" y="6" width="8" height="8" fill="var(--card)"/>
      <rect x="4" y="28" width="12" height="12" fill="var(--fg)"/>
      <rect x="6" y="30" width="8" height="8" fill="var(--card)"/>
      <rect x="20" y="8" width="4" height="4" fill="var(--fg)"/>
      <rect x="20" y="20" width="8" height="8" fill="var(--fg)"/>
      <rect x="28" y="28" width="6" height="6" fill="var(--fg)"/>
      <rect x="36" y="36" width="4" height="4" fill="var(--fg)"/>
    </g>
  </svg>`;
}

function renderStaffCollage() {
  return `<svg class="auth-collage-svg" viewBox="0 0 400 540" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Staff operations blueprint artwork">
    <defs>
      <pattern id="admGrid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.14"/>
      </pattern>
      <pattern id="admStripes" width="14" height="14" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="14" stroke="var(--ac)" stroke-width="2.5" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="400" height="540" fill="url(#admGrid)"/>
    <g stroke="currentColor" stroke-width="1.2" opacity="0.5">
      <line x1="20" y1="30" x2="380" y2="30"/>
      <line x1="20" y1="510" x2="380" y2="510"/>
      <line x1="30" y1="20" x2="30" y2="520"/>
      <line x1="370" y1="20" x2="370" y2="520"/>
      <circle cx="30" cy="30" r="4" fill="currentColor"/>
      <circle cx="370" cy="30" r="4" fill="currentColor"/>
      <circle cx="30" cy="510" r="4" fill="currentColor"/>
      <circle cx="370" cy="510" r="4" fill="currentColor"/>
    </g>
    <g transform="translate(48, 48)">
      <rect x="0" y="0" width="130" height="34" fill="var(--card)" stroke="currentColor" stroke-width="1.5"/>
      <rect x="90" y="0" width="40" height="34" fill="url(#admStripes)"/>
      <text x="12" y="23" fill="currentColor" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="15" letter-spacing="0.1em">CONTROL·OPS</text>
    </g>
    <g transform="translate(200, 48)" font-family="'Barlow Condensed', monospace" font-size="8.5" fill="currentColor" opacity="0.75" letter-spacing="0.08em">
      <text x="0" y="12">LAT 12.9238° N · LON 77.4987° E</text>
      <text x="0" y="25">ELEV 840M · 4 STATIONS ONLINE</text>
    </g>
    <g transform="translate(200, 240)">
      <circle cx="0" cy="0" r="130" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 6" opacity="0.4"/>
      <circle cx="0" cy="0" r="105" fill="none" stroke="var(--ac)" stroke-width="1.8" opacity="0.6"/>
      <circle cx="0" cy="0" r="85" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <g font-family="'Barlow Condensed', monospace" font-size="9" fill="currentColor" opacity="0.6" text-anchor="middle">
        <text x="0" y="-112">000°</text>
        <text x="114" y="4">090°</text>
        <text x="0" y="122">180°</text>
        <text x="-114" y="4">270°</text>
      </g>
      <g class="auth-gear-spin">
        <circle cx="0" cy="0" r="64" fill="var(--card)" stroke="currentColor" stroke-width="2"/>
        <circle cx="0" cy="0" r="74" fill="none" stroke="var(--ac)" stroke-width="4" stroke-dasharray="8 8"/>
        <line x1="-80" y1="0" x2="80" y2="0" stroke="currentColor" stroke-width="1.5"/>
        <line x1="0" y1="-80" x2="0" y2="80" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="28" fill="var(--ac)" opacity="0.85"/>
        <circle cx="0" cy="0" r="8" fill="currentColor"/>
      </g>
    </g>
    <g transform="translate(48, 410)">
      <rect x="0" y="0" width="160" height="42" fill="#17140d" stroke="currentColor" stroke-width="1.5"/>
      <rect x="0" y="0" width="28" height="42" fill="url(#admStripes)"/>
      <text x="38" y="26" fill="#f5f5f0" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="14" letter-spacing="0.1em">SEC·AUTH REQ</text>
    </g>
    <g transform="translate(366, 470) rotate(-90)">
      <text x="0" y="0" font-family="'Barlow Condensed', sans-serif" font-weight="800" font-size="64" fill="none" stroke="currentColor" stroke-width="1.5" letter-spacing="0.12em" opacity="0.85">RESTRICTED</text>
    </g>
    <g transform="translate(48, 470)" fill="currentColor">
      <rect x="0" y="0" width="3" height="24"/>
      <rect x="6" y="0" width="2" height="24"/>
      <rect x="10" y="0" width="4" height="24"/>
      <rect x="16" y="0" width="1.5" height="24"/>
      <rect x="20" y="0" width="3" height="24"/>
      <rect x="25" y="0" width="5" height="24"/>
      <rect x="33" y="0" width="2" height="24"/>
      <rect x="38" y="0" width="4" height="24"/>
      <text x="0" y="34" font-family="'Barlow Condensed', monospace" font-size="8" letter-spacing="0.1em">ESP32·SOLAR·GATEWAY</text>
    </g>
  </svg>`;
}

const PG = {
  home: () =>
    `<div class="wrap" style="position:relative"><div class="sun"></div><div class="hero"><div><span class="k">LumenGrove · campus power</span><h1 tabindex="-1">${t(
      'h1'
    )}</h1><p>${t('sub')}</p><p><a class="btn plug" href="#plug">${t(
      'plug'
    )} ⚡</a> <a class="btn g" href="#how">${t(
      'how'
    )}</a></p></div><div class="g3" role="img" aria-label="Interactive 3D power bank"><canvas id="cv"></canvas></div></div>
  <h2>Three steps</h2><div class="grid"><div class="card"><span class="num">01</span><h3>Find</h3><p>Pick a station with free, fully charged banks.</p></div><div class="card"><span class="num">02</span><h3>Unlock</h3><p>Reserve, pay and the lock opens from your phone.</p></div><div class="card"><span class="num">03</span><h3>Return</h3><p>Drop it at any station. Return is checked automatically.</p></div></div>
  <h2 style="margin-top:48px">Inside a station</h2><div class="s3w" id="s3w"><div class="s3c"><canvas id="cv2" role="img" aria-label="Interactive 3D solar station. Scroll, or tap a part."></canvas><div class="card" id="s3t" aria-live="polite"></div></div></div><h2 style="margin-top:48px">Live stations</h2><div class="grid">${ST.map(
      stn
    ).join('')}</div></div>`,

  how: () =>
    `<div class="wrap"><h1 tabindex="-1">${t(
      'how'
    )}</h1><h3>Power path</h3><div class="flow"><span>Solar panel</span><i>→</i><span>Charge controller</span><i>→</i><span>Station battery</span><i>→</i><span>5 V slot chargers</span></div><h3 style="margin-top:32px">Control path</h3><div class="flow"><span>Mobile app</span><i>→</i><span>ESP32 allocates a slot</span><i>→</i><span>Solenoid lock</span><i>→</i><span>Return check: RFID · 5 V · switch</span></div></div>`,

  tech: () =>
    `<div class="wrap"><h1 tabindex="-1">${t(
      'tech'
    )}</h1><div class="grid"><div class="card"><h3>Hardware</h3><p>ESP32, RFID RC522, INA219 sensors, SW-420 vibration sensor, solenoid locks, solar panel with charge controller.</p></div><div class="card"><h3>Solar-aware slot allocation</h3><p>The station hands out the best-charged bank, based on current solar yield.</p></div><div class="card"><h3>Multi-factor return check</h3><p>RFID, 5 V current draw and a limit switch must all agree.</p></div></div></div>`,

  impact: () =>
    `<div class="wrap"><h1 tabindex="-1">${t(
      'impact'
    )}</h1><div class="grid"><div class="card"><div class="num">1,284</div><p>kWh solar used (demo data)</p></div><div class="card"><div class="num">1,053 kg</div><p>CO₂ avoided (demo data)</p></div><div class="card"><div class="num">SDG 7 · 12</div><p>Clean energy and responsible consumption.</p></div></div></div>`,

  about: () =>
    `<div class="wrap"><h1 tabindex="-1">${t(
      'about'
    )}</h1><p>LumenGrove is an IoT, solar-powered power bank rental network for campus. Phase 1 plans the idea, Phase 2 builds the hardware, Phase 3 tests and presents.</p><h2>FAQ</h2><details><summary>Is it safe?</summary><p>Banks are charged within safe limits and locked in station slots.</p></details><details><summary>What if a bank is stolen?</summary><p>Locks, RFID and vibration sensing flag unauthorised removal.</p></details><details><summary>Something is not charging</summary><p>Use “Report a problem” in Plug In.</p></details></div>`,

  plug: () =>
    `<div class="wrap hub"><span class="k">LumenGrove hub</span><h1 tabindex="-1">${t(
      'greet'
    )}</h1><div class="grid">${[
      ['app-stations', t('find'), 'Stations and free banks'],
      ['app-rent', t('rent'), 'Reserve, pay, unlock'],
      ['app-rentals', t('rentals'), 'Active rental and history'],
      ['app-report', 'Report a problem', 'Lock stuck? Not charging?'],
      ['app-impact', 'My impact', 'kWh and CO₂'],
      ['app-settings', t('me'), 'Language, theme, motion'],
      ['signin', t('si'), 'Or continue as guest']
    ]
      .map(a => `<a class="card tile" href="#${a[0]}"><span class="k">${a[1]}</span><p>${a[2]}</p></a>`)
      .join('')}</div></div>`,

  signin: () => {
    if (S.needsProfile && S.u) {
      return `<div class="wrap auth-wrap">
        <div class="auth-poster-frame">
          <div class="auth-split">
            <div class="auth-form-card" role="region" aria-label="Profile completion form">
              <span class="auth-step-pill">${t('step_1_of_1')}</span>
              <span class="k" style="margin-top:14px">${t('rvce_portal')}</span>
              <h1 tabindex="-1">${t('complete_profile')}</h1>
              <p>${t('profile_sub')}</p>

              <label for="prof_name">${t('full_name_label')}</label>
              <input id="prof_name" type="text" autocomplete="name" style="width:100%" value="${window.escapeHtml ? window.escapeHtml(S.u.name || '') : (S.u.name || '')}">

              <label for="prof_phone">${t('phone_label')}</label>
              <input id="prof_phone" type="tel" placeholder="+919876543210" style="width:100%" value="${window.escapeHtml ? window.escapeHtml(S.u.phone || '') : (S.u.phone || '')}">

              <div class="err" id="prof_err" role="alert" aria-live="polite"></div>

              <p style="margin-top:24px">
                <button class="btn auth-full-btn" onclick="completeProfile()">${t('save_continue')}</button>
              </p>
            </div>
            <div class="auth-collage" aria-hidden="true">
              ${renderStudentCollage()}
            </div>
          </div>
        </div>
      </div>`;
    }

    return `<div class="wrap auth-wrap">
      <div class="auth-poster-frame">
        <div class="auth-split">
          <div class="auth-form-card" role="region" aria-label="Student sign in">
            <span class="k">${t('rvce_portal')}</span>
            <h1 tabindex="-1">${t('student_signin_title')}</h1>
            <p>${t('student_signin_sub')}</p>

            ${renderAuthBanner(S.authError, S.authIsDevNote)}

            <p style="margin-top:20px;margin-bottom:8px">
              <button class="btn-google" onclick="signInWithGoogle()" aria-label="${t('google_signin')}">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <span>${t('google_signin')}</span>
              </button>
            </p>

            <p class="auth-trust">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>${t('trust_line')}</span>
            </p>

            <div class="auth-divider" aria-hidden="true"><span>${t('or_divider')}</span></div>

            <p style="margin-top:14px">
              <button class="btn g auth-full-btn" onclick="continueAsGuest()">${t('guest')}</button>
            </p>

            ${
              window.ENABLE_DEMO
                ? `<div class="demo-box auth-demo-box">
                    <span class="k">${t('demo_box_title')}</span>
                    <p style="margin:4px 0 12px;font-size:.85rem">${t('demo_box_sub')}</p>
                    <button class="btn g" onclick="loginDemoStudent()">${t('demo_student')}</button>
                  </div>`
                : ''
            }

            <div class="auth-footer-nav">
              <a href="#home">${t('back_to_site')}</a> · <a href="#app-help">${t('Help')}</a>
            </div>
          </div>
          <div class="auth-collage" aria-hidden="true">
            ${renderStudentCollage()}
          </div>
        </div>
      </div>
    </div>`;
  },

  'admin-login': () =>
    `<div class="wrap auth-wrap auth-admin-scope">
      <div class="auth-poster-frame">
        <div class="auth-split">
          <div class="auth-form-card" role="region" aria-label="Staff sign in">
            <div class="auth-station-ticker" aria-hidden="true">
              <span><i class="auth-dot-pulse"></i> LIB: READY</span>
              <span><i class="auth-dot-pulse"></i> MM: READY</span>
              <span><i class="auth-dot-pulse"></i> MING: READY</span>
              <span><i class="auth-dot-pulse"></i> CAUV: READY</span>
            </div>

            <span class="auth-restricted-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ${t('staff_portal_tag')}
            </span>

            <h1 tabindex="-1" style="margin-top:8px">${t('staff_signin_title')}</h1>
            <p>${t('staff_signin_sub')}</p>

            ${renderAuthBanner(S.adminError, S.adminIsDevNote)}

            <p style="margin-top:20px;margin-bottom:8px">
              <button class="btn-google" onclick="signInWithGoogle('#admin')" aria-label="${t('google_signin')}">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                </svg>
                <span>${t('google_signin')}</span>
              </button>
            </p>

            <p class="auth-trust">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Authorized personnel only. Sessions are audit-logged.</span>
            </p>

            ${
              window.ENABLE_DEMO
                ? `<div class="demo-box auth-demo-box">
                    <span class="k">${t('demo_box_title')}</span>
                    <p style="margin:4px 0 12px;font-size:.85rem">${t('demo_box_sub')}</p>
                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                      <button class="btn g" onclick="loginDemoStaff('technician')">${t('demo_technician')}</button>
                      <button class="btn g" onclick="loginDemoStaff('super_admin')">${t('demo_super_admin')}</button>
                    </div>
                  </div>`
                : ''
            }

            <div class="auth-footer-nav" style="margin-top:24px">
              <a href="#home">${t('back_to_site')}</a> · <a href="#app-help">${t('Help')}</a>
            </div>
          </div>
          <div class="auth-collage" aria-hidden="true">
            ${renderStaffCollage()}
          </div>
        </div>
      </div>
    </div>`,

  'app-stations': () =>
    `<div class="wrap"><h1 tabindex="-1">${t(
      'find'
    )}</h1>${mapSvg()}<p>Tap the map to set your position.</p><div class="grid" style="margin-top:20px">${ST.map(
      stn
    ).join('')}</div></div>`,

  'app-impact': () => PG.impact(),

  'app-report': () =>
    S.u && S.u.role == 'student'
      ? `<div class="wrap" style="max-width:520px"><h1 tabindex="-1">Report a problem</h1><label for="pb">What happened?</label><select id="pb" style="width:100%"><option>Bank not charging</option><option>Lock stuck</option><option>Station offline</option></select><label for="nt">Details</label><textarea id="nt" rows="4" style="width:100%"></textarea><p><button class="btn" onclick="toast('Report sent (demo)')">Send report</button></p></div>`
      : need,

  'app-settings': () => {
    const u = S.u,
      P = u && u.role == 'student' ? `<b>${u.name}</b><br>${u.email}<br>${u.phone}` : 'Browsing as guest';
    return `<div class="wrap"><span class="k">Account</span><h1 tabindex="-1">${t(
      'me'
    )}</h1><div class="grid"><div class="card"><h3>Profile</h3><p>${P}</p>${
      u
        ? `<button class="btn g" onclick="signOut()">Sign out</button>`
        : `<a class="btn" href="#signin" onclick="sessionStorage.setItem('lg_redirect_hash','#app-settings')">${t('si')}</a>`
    }</div><div class="card"><h3>Language</h3>${[
      ['en', 'English'],
      ['kn', 'ಕನ್ನಡ'],
      ['hi', 'हिन्दी']
    ]
      .map(a => pill('l', a, x => `S.l='${x}';sv('l',S.l);go(1)`))
      .join(' ')}</div><div class="card"><h3>Theme</h3>${[
      ['olive', 'Olive Night'],
      ['amber', 'Amber Sun']
    ]
      .map(a => pill('th', a, x => `theme('${x}');go(1)`))
      .join(' ')}</div><div class="card"><h3>Motion</h3><label style="display:flex;gap:10px;align-items:center;margin:0"><input type="checkbox" onchange="document.documentElement.classList.toggle('rm',this.checked)"> Reduce motion</label></div></div></div>`;
  },

  'app-rentals': () => {
    if (!stu()) return need;
    const r = S.rent,
      rows = (r ? [{ id: r.id, d: 'Today', st: r.st.n, cat: r.cat, h: r.dur / 3600 + ' h', s: r.started ? 'Active' : 'Paid' }] : []).concat(
        S.hist
      );
    return `<div class="wrap"><h1 tabindex="-1">${t(
      'rentals'
    )}</h1><p><button class="btn g" onclick="cmp()">File a complaint</button></p><h2>Current rental</h2>${
      !r
        ? '<p>No active rental.</p><a class="btn" href="#app-rent">' + t('rent') + '</a>'
        : `<div class="grid"><div class="card"><span class="badge">${CATS[r.cat].n}</span><p>Your 6-digit PIN</p><div class="num" style="font-size:3rem;letter-spacing:.3em">${
            r.pin
          }</div><p>Pickup: <b>${r.st.n}</b>. Enter the PIN at the station kiosk.</p>${
            r.started
              ? `<div class="num" id="tm">${fmt(
                  r.dur - el()
                )}</div><label>Power bank charge <b id="bt">${Math.max(
                  0,
                  r.batt
                ) | 0}%</b></label><div class="bar"><i id="bb" style="width:${Math.max(
                  0,
                  r.batt
                )}%"></i></div><p><button class="btn" onclick="retn()">Return power bank</button> <a class="btn g" href="#app-report">Report a problem</a></p>`
              : `<button class="btn g" onclick="nav(S.rent.st)">Navigate to station</button>`
          }</div><div class="card"><h3>Station kiosk (simulator)</h3><div class="grid" style="grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0">${[
            ...Array(8)
          ]
            .map((_, i) => `<div class="kd${r.slot == i + 1 ? ' lit' : ''}">SLOT ${i + 1}</div>`)
            .join('')}</div>${
            r.started
              ? `<p>Slot <b>${r.slot}</b> unlocked. Timer started.</p><label for="sp">Demo speed</label><select id="sp" onchange="S.speed=+this.value"><option value="1">1×</option><option value="60"${
                  S.speed == 60 ? ' selected' : ''
                }>60× (demo)</option></select>`
              : `<label for="kp">Enter PIN</label><input id="kp" maxlength="6" inputmode="numeric" style="width:100%"><div class="err" id="ke"></div><button class="btn" onclick="kiosk()">Unlock slot</button>`
          }</div></div>`
    }<h2 style="margin-top:32px">Transaction history</h2><div class="tw"><table><tr><th>ID</th><th>Date</th><th>Station</th><th>Bank</th><th>Duration</th><th>Amount</th><th>Status</th><th></th></tr>${rows
      .map(
        x =>
          `<tr><td>${x.id}</td><td>${x.d}</td><td>${x.st}</td><td>${CATS[x.cat].n}</td><td>${x.h}</td><td>₹ —</td><td><span class="badge">${x.s}</span></td><td><button class="btn g" onclick="cmp('${x.id}')">Complain</button></td></tr>`
      )
      .join('')}</table></div></div>`;
  },

  'app-rent': () =>
    stu()
      ? `<div class="wrap"><h1 tabindex="-1">${t('rent')}</h1><div id="rb">${rb2()}</div></div>`
      : need,

  'app-home': () => {
    const r = S.rent,
      b = best(),
      H = new Date().getHours(),
      g = H < 12 ? 'Good morning' : H < 17 ? 'Good afternoon' : 'Good evening',
      n = stu() ? ', ' + S.u.name.split(' ')[0] : '',
      c = (x, i, k) => `<div class="card ${x}" style="--i:${i}">${k}</div>`,
      bc = [...Array(26)]
        .map((_, i) => `<rect x="${i * 7}" y="0" width="${1 + ((i * 5) % 4)}" height="26" fill="var(--fg)"/>`)
        .join(''),
      hero = `<div class="card s4 hero2" style="--i:0"><svg class="dc" viewBox="0 0 200 200" style="right:60px;top:-40px;width:260px" aria-hidden="true"><circle cx="100" cy="100" r="62" fill="var(--ac)" opacity=".9"/><circle class="spin" cx="100" cy="100" r="84" fill="none" stroke="var(--fg)" stroke-width="12" stroke-dasharray="9 7"/><g fill="none" stroke="var(--fg)" stroke-width="1.2"><circle cx="100" cy="100" r="40"/><ellipse cx="100" cy="100" rx="16" ry="40"/><ellipse cx="100" cy="100" rx="32" ry="40"/><path d="M60 100h80"/></g></svg><span class="vt" aria-hidden="true">SOLARPUNK</span><span class="k">LumenGrove · Plug In</span><h1 tabindex="-1">${g}${n}</h1><span class="tag">Future is solar-charged.</span> ${sol()}<svg viewBox="0 0 182 26" width="182" height="26" style="display:block;margin-top:18px" aria-hidden="true">${bc}</svg></div>`,
      prim = !stu()
        ? `<span class="k">Welcome</span><h2>Sign in to charge up</h2><p>Browse stations as a guest, or sign in with your RVCE email to rent a power bank.</p><a class="btn" href="#signin" onclick="sessionStorage.setItem('lg_redirect_hash','#app-home')">${t(
            'si'
          )}</a><p style="margin-top:16px">Best station right now: <b>${b.n}</b> (${dist(b)} m)</p>`
        : r && r.started
        ? `<span class="k">Active rental</span><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div class="ring2" style="--p:${
            Math.max(0, r.batt) | 0
          }"><b id="bt">${Math.max(0, r.batt) | 0}%</b></div><div><div class="num" id="tm">${fmt(
            r.dur - el()
          )}</div><p>${CATS[r.cat].n} · slot ${r.slot}</p></div></div><div class="bar"><i id="bb" style="width:${Math.max(
            0,
            r.batt
          )}%"></i></div><p><a class="btn" href="#app-rentals">Open rental</a></p>`
        : r
        ? `<span class="k">Payment received</span><p>Open My rentals for your PIN, then go to ${r.st.n}.</p><a class="btn" href="#app-rentals">Go to kiosk</a>`
        : `<span class="k">Charge up</span><h2>${b.n}</h2><p>${dist(b)} m away · ${b.free} slots free · ${
            b.stock[S.cat]
          } ${CATS[S.cat].n} in stock</p><p><a class="btn" href="#app-rent" onclick="S.pick=best()">Rent here</a> <button class="btn g" onclick="nav(best())">Navigate</button></p>`;

    return `<div class="wrap"><div class="bento">${hero}${c('s2 r2', 1, prim)}${c(
      's2',
      2,
      mapSvg() + '<p>Tap the map to set your position.</p>'
    )}${c(
      's2',
      3,
      '<h3>Stations</h3>' +
        ST.map(
          s =>
            `<a href="#app-station-${s.id}" style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--ln);color:var(--fg);text-decoration:none"><b>${
              s.n
            }</b><span class="badge">${s.ok ? s.free + ' free' : 'offline'}</span></a>`
        ).join('')
    )}${c(
      's4',
      4,
      '<h3>Grove banks</h3><div class="bk">' +
        Object.entries(CATS)
          .map(
            ([k, x]) =>
              `<a class="card" style="color:var(--fg);text-decoration:none" href="#app-rent" onclick="S.cat='${k}'">${ic(
                x.i
              )}<h3>${x.n}</h3><p>${x.p}</p><span class="badge">${best().stock[k]} nearby</span></a>`
          )
          .join('') +
        '</div>'
    )}${c(
      '',
      5,
      '<span class="k">Campus impact</span><div class="num" data-n="1284">0</div><p>kWh solar used (demo)</p><div class="num" data-n="1053">0</div><p>kg CO₂ avoided (demo)</p>'
    )}${c(
      '',
      6,
      '<h3>Recent</h3><table><tr><td>Library</td><td>1 h 05 m</td></tr><tr><td>Big Mingoes</td><td>0 h 40 m</td></tr></table>'
    )}${c(
      's4',
      7,
      '<h3>Ask Lumi</h3>' +
        ['How do I get my PIN?', 'Which bank fits my laptop?', 'How long can I rent?']
          .map(x => `<button class="chip" onclick="lumi('${x}')">${x}</button> `)
          .join('')
    )}</div></div>`;
  },

  'app-help': () =>
    `<div class="wrap" id="hp"><span class="k">Support</span><h1 tabindex="-1">Help</h1><div class="grid"><div class="card" style="grid-column:1/-1"><h3>Ask Lumi</h3><div id="hm" class="hm"><div class="m">Hi, I am Lumi. Ask me about payment, PINs, bank types or returns.</div></div><div>${[
      'Why no PIN after paying?',
      'How long can I rent?',
      'Which bank fits my laptop?'
    ]
      .map(x => `<button class="chip" onclick="hask('${x}')">${x}</button>`)
      .join(
        ' '
      )}</div><input id="hi" aria-label="Message Lumi" placeholder="Type your question and press Enter" style="width:100%;margin-top:10px" onkeydown="if(event.key=='Enter')hask(this.value)"></div><div class="card"><h3>FAQ</h3><details><summary>How does renting work?</summary><p>Choose a bank and duration, pay by QR, then enter your PIN at the station kiosk.</p></details><details><summary>Charged but no PIN?</summary><p>File a complaint with the transaction ID from My rentals.</p></details><details><summary>How long can I rent?</summary><p>From 30 minutes to 6 hours.</p></details><details><summary>What if I return late?</summary><p>Late rules will be announced with pricing.</p></details><details><summary>Which bank fits my laptop?</summary><p>Grove Laptop for laptops only, Grove Fast for a laptop and phone together.</p></details></div><div class="card"><h3>Something wrong?</h3><p>Tell us about a stuck lock, a bank that is not charging, or a wrong amount.</p><button class="btn" onclick="cmp()">File a complaint</button></div><div class="card"><h3>Contact management</h3><p>Phone: to be added<br>Email: to be added<br>Office hours: to be added</p></div></div></div>`
};

function hdr(h) {
  const app = /^(app|plug|signin)/.test(h),
    ad = h.startsWith('admin'),
    ex = ['home', 'how', 'tech', 'impact', 'about'],
    ap = [
      ['app-home', t('hub')],
      ['app-stations', t('find')],
      ['app-rent', t('rent')],
      ['app-rentals', t('rentals')],
      ['app-settings', t('me')],
      ['app-help', 'Help']
    ],
    demoBanner = S.isDemo
      ? `<div class="demo-banner" role="status"><span>Demo mode. Nothing here is real.</span><button onclick="exitDemo()">Exit demo</button></div>`
      : '';
  document.body.className = app || ad ? 'ap' : '';
  $('#hd').innerHTML = `${demoBanner}<header><a class="brand" href="#home">${logo()}LumenGrove</a><nav aria-label="Main">${
    app || ad
      ? `<div class="sw"><a href="#home">Explore</a><a href="#app-home" class="on">Plug In</a></div>` +
        ap.map(a => `<a href="#${a[0]}" class="${h == a[0] ? 'on' : ''}">${a[1]}</a>`).join('')
      : ex.map(k => `<a href="#${k}" class="${h == k ? 'on' : ''}">${t(k)}</a>`).join('') +
        `<a class="btn plug" href="#plug">${t('plug')} ⚡</a>`
  }</nav><select aria-label="Theme" onchange="theme(this.value)">${[
    ['olive', 'Olive Night'],
    ['amber', 'Amber Sun']
  ]
    .map(a => `<option value="${a[0]}"${S.th == a[0] ? ' selected' : ''}>${a[1]}</option>`)
    .join('')}</select><select aria-label="Language" onchange="S.l=this.value;sv('l',S.l);go()">${[
    ['en', 'EN'],
    ['kn', 'ಕನ್'],
    ['hi', 'हि']
  ]
    .map(a => `<option value="${a[0]}"${S.l == a[0] ? ' selected' : ''}>${a[1]}</option>`)
    .join('')}</select></header>`;
  $('#tb').innerHTML = app
    ? ap
        .slice(0, 5)
        .map(a => `<a href="#${a[0]}" class="${h == a[0] ? 'on' : ''}">${a[1]}</a>`)
        .join('')
    : '';
}

function go(same) {
  let h = location.hash.slice(1) || 'home';
  if (h == 'plug') {
    h = 'app-home';
    history.replaceState(null, '', '#app-home');
  }
  const v = $('#v'),
    draw = () => {
      hdr(h);
      v.innerHTML = h.startsWith('app-station-') ? stDetail(h.slice(12)) : h == 'admin' ? admin() : (PG[h] || PG.home)();
      v.className = 'in';
      fx();
      if (typeof xl === 'function') xl(h);
      const f = v.querySelector('h1');
      if (f && !same) f.focus({ preventScroll: true });
      if (!same) scrollTo(0, 0);
    };
  if (
    same ||
    matchMedia('(prefers-reduced-motion:reduce)').matches ||
    document.documentElement.classList.contains('rm')
  )
    draw();
  else {
    v.className = 'out';
    cu(1);
    setTimeout(() => {
      draw();
      cu(0);
    }, 460);
  }
}

// 1-second interval to update solar badge readings across the page
setInterval(() => {
  document
    .querySelectorAll('.sol')
    .forEach(b => (b.textContent = 'Solar now · ' + (34 + Math.floor(Math.random() * 9)) + ' W'));
}, 1000);

// Pause GPU animations when tab is hidden
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('auth-paused', document.hidden);
});
