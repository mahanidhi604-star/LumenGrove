// js/map.js - RVCE Campus Map and Spatial Navigation

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

const mapIn = () => {
  const r = S.pick || best(),
    P = `M${S.pos.x} ${S.pos.y}L${r.x} ${r.y}`,
    f = S.vf || 'all',
    k = (S.vq || '').toLowerCase(),
    on = v =>
      (f == 'all' || (f == 'st' && v[7]) || (f == 'food' && v[6] == 'food') || (f == 'dept' && v[6] == 'dept')) &&
      (!k || v[1].toLowerCase().includes(k));
  return (
    `<rect width="880" height="26" fill="var(--ln)"/><text x="12" y="18" font-size="12" font-weight="700" fill="var(--mut)">MYSORE ROAD · PATTANAGERE METRO</text>` +
    VN.map(v => {
      const s = v[7],
        cx = v[2] + v[4] / 2,
        cy = v[3] + v[5] / 2;
      return `<g class="v" tabindex="0" role="button" aria-label="${v[1]}" onkeydown="if(event.key=='Enter')this.dispatchEvent(new MouseEvent('click',{bubbles:true}))" opacity="${
        on(v) ? 1 : 0.22
      }" onclick="${s ? `pickSt('${v[0]}',event)` : `pickVenue('${v[0]}',event)`}"><rect x="${v[2]}" y="${v[3]}" width="${
        v[4]
      }" height="${v[5]}" rx="4" fill="${s ? 'var(--ac)' : 'var(--card)'}" stroke="var(--fg)" stroke-width="${
        r.id == v[0] ? 4 : 1.5
      }"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${
        s ? 'var(--on)' : 'var(--fg)'
      }">${v[1]}</text>${s ? `<circle class="pl" cx="${v[2] + v[4] - 8}" cy="${v[3] + 8}" r="5" fill="var(--ac2)"/>` : ''}</g>`;
    }).join('') +
    `<path class="rt" d="${P}" stroke="var(--ac)" stroke-width="3" fill="none"/><circle r="5" fill="var(--ac2)"><animateMotion dur="2.4s" repeatCount="indefinite" path="${P}"/></circle><circle cx="${S.pos.x}" cy="${S.pos.y}" r="8" fill="var(--ac2)" stroke="var(--fg)" stroke-width="2"/><text x="${S.pos.x + 12}" y="${S.pos.y - 10}" font-size="12" font-weight="800" fill="var(--fg)">YOU</text>`
  );
};

const mapSvg = () => {
  const r = S.pick || best(),
    m = Math.max(1, Math.round(dist(r) / 80)),
    f = S.vf || 'all';
  return `<div class="mp"><div class="mf">${[
    ['all', 'All'],
    ['st', 'Solar stations'],
    ['food', 'Food'],
    ['dept', 'Depts']
  ]
    .map(
      a =>
        `<button class="chip" aria-pressed="${f == a[0]}" style="${
          f == a[0] ? 'background:var(--ac);color:var(--on)' : ''
        }" onclick="vf('${a[0]}')">${a[1]}</button>`
    )
    .join('')}<input type="search" aria-label="Search venues" placeholder="Search venue" value="${
    S.vq || ''
  }" oninput="vs(this.value)"></div><svg viewBox="0 0 880 570" class="msv" onclick="mvp(event)" role="img" aria-label="RVCE campus map. Tap to set your position.">${mapIn()}</svg><p><b>${
    r.n
  }</b> · ${dist(r)} m · about ${m} min walk. Tap a building to set where you are.</p></div>`;
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
  e.stopPropagation();
  S.pick = ST.find(x => x.id == id);
  toast('Selected station: ' + S.pick.n);
  rer();
};

window.pickVenue = (id, e) => {
  e.stopPropagation();
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
