// js/state.js - Central Application State and Storage Helpers
const $ = s => document.querySelector(s);
const q = (k, d) => {
  try {
    return localStorage.getItem(k) || d;
  } catch (e) {
    return d;
  }
};
const sv = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch (e) {}
};
window.sv = sv;
window.q = q;

window.toast = function(m) {
  const e = $('#toast');
  if (!e) return;
  e.textContent = typeof trT === 'function' ? trT(m) : m;
  e.classList.add('on');
  setTimeout(() => e.classList.remove('on'), 2200);
};
var toast = window.toast;

const S = {
  l: q('l', 'en'),
  th: ['olive', 'amber'].includes(q('th', 'olive')) ? q('th', 'olive') : 'olive',
  u: null,
  rt: { step: 1, st: 'library', slot: null, t0: 0, res: 0 },
  pos: { x: 360, y: 60 },
  cat: 'std',
  dur: 2,
  pick: null,
  rent: null,
  speed: 1,
  hist: [
    { id: 'LG-1041', d: '03 Nov', st: 'Library', cat: 'std', h: '1 h 05 m', s: 'Completed' },
    { id: 'LG-1038', d: '01 Nov', st: 'Big Mingoes', cat: 'lap', h: '0 h 40 m', s: 'Completed' }
  ],
  pay: null,
  vf: 'all',
  vq: '',
  authStep: 'email',
  authEmail: '',
  tempName: '',
  tempPhone: '',
  rm: q('rm', '0') === '1',
  favStn: q('lg_fav_stn', 'library'),
  liveTelemetry: q('lg_telemetry', '1') === '1',
  gpsActive: false,
  gpsCoords: null,
  profile: (() => {
    try {
      const p = q('lg_profile_custom', '');
      if (p) return JSON.parse(p);
    } catch (e) {}
    return {
      archetype: 'helios',
      callsign: '',
      dept: 'CSE',
      year: '3rd Year',
      accent: '#f08a24'
    };
  })()
};

window.S = S;

try {
  const u = q('lg_user', '');
  if (u) S.u = JSON.parse(u);
} catch (e) {}
