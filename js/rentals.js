// js/rentals.js - Rental Flow, Duration Controls, Payment View, Kiosk Simulator, and Timers

const pad = n => String(n).padStart(2, '0');

const fmt = x => {
  x = Math.max(0, x | 0);
  return pad((x / 3600) | 0) + ':' + pad(((x % 3600) / 60) | 0) + ':' + pad(x % 60);
};

const el = () => {
  if (!S.rent || !S.rent.started) return 0;
  const startTs = (typeof S.rent.started === 'number' && S.rent.started > 1000000000) 
    ? S.rent.started 
    : (typeof S.rent.t === 'number' && S.rent.t > 1000000000 ? S.rent.t : Date.now());
  return Math.max(0, ((Date.now() - startTs) / 1000) * (S.speed || 1));
};

const DL = h => (h < 1 ? '30 min' : h == 1 ? '1 hour' : h + ' hours');
const DS = h => (h <= 1 ? 'Quick top-up' : h <= 2 ? 'Standard' : h <= 4 ? 'Long session' : 'Extended');

window.durIn = v => {
  S.dur = +v;
  const dt = $('.dt');
  if (dt) dt.style.setProperty('--f', (S.dur - 0.5) / 5.5);
  const dl = $('#dl');
  if (dl) dl.textContent = DL(S.dur);
  const s = $('#ds'),
    mx = S.dur >= 6;
  if (s) {
    s.textContent = mx ? 'Longest rental · charges apply per hour' : DS(S.dur);
    s.classList.toggle('mx', mx);
  }
  const currentRate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const de = $('#d-est');
  if (de) de.textContent = '₹ ' + (S.dur * currentRate).toFixed(0);
  const cp = $('#checkout-est-cost');
  if (cp) cp.textContent = '₹ ' + (S.dur * currentRate).toFixed(0);
};

addEventListener('pointerdown', e => {
  if (e.target && e.target.id == 'du') {
    const dc = $('#dc');
    if (dc) dc.classList.add('on');
  }
});

addEventListener('pointerup', () => {
  const d = $('#dc');
  if (d) d.classList.remove('on');
});

const stp = () => {
  const n = !S.pay ? 1 : S.pay.paid ? 3 : 2;
  return `<ol class="stp" aria-label="Rental progress">${['Choose', 'Pay', 'PIN']
    .map(
      (x, i) =>
        `<li class="${i + 1 == n ? 'on' : i + 1 < n ? 'dn' : ''}"${i + 1 == n ? ' aria-current="step"' : ''}><b>${
          i + 1 < n ? '✓' : i + 1
        }</b>${x}</li>${i < 2 ? '<i></i>' : ''}`
    )
    .join('')}</ol>`;
};

const rentBody = () => {
  const bs = best(),
    cur = S.pick || bs;
  return `<div class="grid">${Object.entries(CATS)
    .map(
      ([k, c]) =>
        `<button class="card pick${
          S.cat == k ? ' sel' : ''
        }" style="color:var(--fg);font:inherit;cursor:pointer" onclick="S.cat='${k}';S.pick=null;rr()">${ic(
          c.i
        )}<h3>${c.n}</h3><p>${c.d}</p><span class="badge">${c.p}</span></button>`
    )
    .join('')}</div><div class="grid" style="margin-top:16px"><div class="card"><label>Duration</label><div class="dur" id="dc"><div class="dh"><b id="dl">${DL(
    S.dur
  )}</b><small id="ds" class="${S.dur >= 6 ? 'mx' : ''}">${
    S.dur >= 6 ? 'Longest rental · charges apply per hour' : DS(S.dur)
  }</small></div><div class="dt" style="--f:${(S.dur - 0.5) / 5.5}"><div class="dtr"><div class="dfl"></div><canvas id="pc" aria-hidden="true"></canvas></div><input id="du" type="range" min="0.5" max="6" step="0.5" value="${
    S.dur
  }" aria-label="Rental duration in hours" oninput="durIn(this.value)"></div><div class="dd" aria-hidden="true">${'<i></i>'.repeat(
    12
  )}</div></div><p>Rate: ₹ ${PR.rate || '—'} per hour (set by admin).</p><h3>Best station</h3>${[...ST]
    .sort((a, c) => score(a) - score(c))
    .map(
      s =>
        `<button class="card pick${
          cur.id == s.id ? ' sel' : ''
        }" style="display:block;width:100%;margin:8px 0;color:var(--fg);font:inherit;cursor:pointer" onclick="S.pick=ST.find(x=>x.id=='${
          s.id
        }');rr()"><b>${s.n}</b> ${s.id == bs.id ? '<span class="badge">best</span>' : ''}<br><small>${dist(s)} m · ${
          s.stock[S.cat]
        } in stock${s.ok ? '' : ' · offline'}</small></button>`
    )
    .join('')}</div><div class="card">${mapSvg()}<p>Tap the map to set your position.</p><button class="btn" onclick="startR()">Rent from ${
    cur.n
  }</button> <button class="btn g" onclick="nav(ST.find(x=>x.id=='${cur.id}'))">Navigate</button></div></div>`;
};

const payView = () => {
  const p = S.pay,
    c = CATS[S.cat],
    r = S.rent;
  if (p.paid && r)
    return `<div class="card"><span class="k">Payment received</span><h2>Your PIN</h2><div class="num" style="font-size:3.4rem;letter-spacing:.3em">${r.pin}</div><p>${c.n} at ${r.st.n}. Enter this PIN at the station kiosk to unlock your slot.</p><a class="btn" href="#app-rentals">View current rental</a> <button class="btn g" onclick="S.pay=null;rr()">Done</button></div>`;
  const currentRate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const payTotal = ((S.dur || 1) * currentRate).toFixed(0);
  return `<div class="card pay"><div style="color:#000;width:200px;background:#fff;padding:10px;border-radius:6px">${qr(
    p.b.id + S.dur
  )}</div><div><span class="k">Step 2 of 3 · Pay</span><h2>Scan to pay</h2><p>${c.n} · ${S.dur} h · ${
    p.b.n
  }</p><p>Amount: <b>₹ ${payTotal}</b> (₹ ${currentRate}/hr rate set by admin). The UPI QR is a demo.</p><p class="badge">Auto-confirming in <b id="pcd">6</b> s</p><p><button class="btn" onclick="paid()">I’ve paid</button> <button class="btn g" onclick="S.pay=null;rr()">Cancel</button></p></div></div>`;
};

const rb2 = () => stp() + (S.pay ? payView() : rentBody());

window.rr = () => {
  const rb = $('#rb');
  if (rb) rb.innerHTML = rb2();
  else if (location.hash.slice(1) === 'app-home' || location.hash.slice(1) === 'plug') go(1);
  if (typeof xl === 'function') xl(location.hash.slice(1));
};

window.startR = (stnId) => {
  if (stnId) {
    const s = ST.find(x => x.id === stnId);
    if (s) S.pick = s;
  }
  if (typeof stu === 'function' && !stu()) {
    toast('Student sign-in required to rent a power bank.');
    sessionStorage.setItem('lg_redirect_hash', '#app-home');
    location.hash = 'signin';
    return;
  }
  if (S.rent) return toast('You already have an active rental.');
  const b = S.pick || best();
  if (b.stock[S.cat] < 1) return toast('No stock at this station for that category.');
  S.pay = { t: Date.now(), b, paid: false };
  const payCardContainer = document.querySelector('.bento-pay-card-wrapper');
  if (payCardContainer) {
    payCardContainer.innerHTML = `<div class="card s4 bento-pay-card" style="--i:2">${payView()}</div>`;
    payCardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`Checkout initiated at ${b.n} · Scan QR code to unlock`);
  } else {
    rr();
    setTimeout(() => {
      document.querySelector('.bento-pay-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }
};

window.paid = () => {
  const p = S.pay;
  if (!p || p.paid) return;
  if (typeof stu === 'function' && !stu()) {
    toast('Authentication required to complete rental.');
    location.hash = 'signin';
    return;
  }
  p.paid = true;
  S.rent = {
    id: 'LG-' + (1042 + S.hist.length),
    pin: String(100000 + ((Math.random() * 900000) | 0)),
    st: p.b,
    cat: S.cat,
    dur: S.dur * 3600,
    started: 0,
    batt: 100,
    slot: null,
    done: false
  };
  p.b.stock[S.cat]--;
  toast('Payment received');
  if ($('#rb')) rr();
  else if (location.hash.slice(1) === 'app-home' || location.hash.slice(1) === 'plug') go(1);
};

setInterval(() => {
  const p = S.pay;
  if (!p || p.paid) return;
  const l = 6 - (Date.now() - p.t) / 1000;
  if (l <= 0) paid();
  else {
    const e = $('#pcd');
    if (e) e.textContent = Math.ceil(l);
  }
}, 250);

window.kiosk = () => {
  const r = S.rent;
  const kp = $('#kp'),
    ke = $('#ke');
  if (!kp || !ke) return;
  if (kp.value !== r.pin) return (ke.textContent = 'Wrong PIN.');
  r.slot = 1 + ((Math.random() * 8) | 0);
  r.started = Date.now();
  r.st.free = Math.max(0, r.st.free - 1);
  go(1);
};

// Compute live rental cost, grace period, and late penalty
window.computeRentalCost = (r) => {
  if (!r) return { totalCost: 0, baseCost: 0, lateFee: 0, isGrace: false, isOverdue: false, remainingGraceSec: 0, rate: 10, graceMins: 15, lateRate: 20, elapsedSec: 0 };
  const rate = Number(window.PR ? window.PR.rate : ((typeof PR !== 'undefined' && PR.rate) ? PR.rate : 10)) || 10;
  const graceMins = Number(window.PR ? window.PR.grace : ((typeof PR !== 'undefined' && PR.grace) ? PR.grace : 15)) || 15;
  const lateRate = Number(window.PR ? window.PR.late : ((typeof PR !== 'undefined' && PR.late) ? PR.late : 20)) || 20;
  const graceSec = graceMins * 60;

  const elapsedSec = el();
  const durSec = r.dur || 3600;
  const durHours = Math.max(0.5, durSec / 3600);
  const baseCost = Math.round(durHours * rate);

  let lateFee = 0;
  let isGrace = false;
  let isOverdue = false;
  let remainingGraceSec = 0;

  if (elapsedSec <= durSec) {
    // Normal rental duration window
    isGrace = false;
    isOverdue = false;
  } else if (elapsedSec <= durSec + graceSec) {
    // Within grace period (no penalty yet!)
    isGrace = true;
    isOverdue = false;
    remainingGraceSec = Math.max(0, (durSec + graceSec) - elapsedSec);
  } else {
    // Overdue: late fee applies
    isGrace = false;
    isOverdue = true;
    const overdueSec = elapsedSec - (durSec + graceSec);
    const overdueHours = Math.ceil(overdueSec / 3600);
    lateFee = overdueHours * lateRate;
  }

  const totalCost = baseCost + lateFee;
  return {
    rate,
    graceMins,
    lateRate,
    baseCost,
    lateFee,
    totalCost,
    isGrace,
    isOverdue,
    remainingGraceSec,
    elapsedSec
  };
};

window.updateRentalTimerDom = () => {
  const r = S.rent;
  if (!r || !r.started) return;

  const cost = window.computeRentalCost(r);
  const elapsedSec = cost.elapsedSec;
  const remSec = r.dur - elapsedSec;

  // 1. Digital Countdown & Elapsed Display
  const tEl = document.getElementById('tm');
  if (tEl) {
    if (remSec > 0) {
      tEl.textContent = fmt(remSec);
      tEl.style.color = remSec < 300 ? '#f08a24' : 'var(--fg)';
    } else {
      tEl.textContent = `+${fmt(Math.abs(remSec))}`;
      tEl.style.color = '#f87171';
    }
  }

  const elapsedEl = document.getElementById('tm-elapsed');
  if (elapsedEl) {
    elapsedEl.textContent = fmt(elapsedSec);
  }

  // 2. Battery Percentage & Segmented Readout
  const battDrainRate = (window.CATS && window.CATS[r.cat]?.dr) || 16;
  r.batt = Math.max(0, 100 - (elapsedSec / 3600) * battDrainRate);
  const battPct = Math.max(0, r.batt) | 0;

  const bt = document.getElementById('bt');
  if (bt) bt.textContent = `${battPct}%`;
  const bb = document.getElementById('bb');
  if (bb) bb.style.width = `${battPct}%`;

  // 3. Live Cell Voltage & Temperature Telemetry
  const volt = (3.60 + (r.batt / 100) * 0.58).toFixed(2);
  const temp = (28.0 + (elapsedSec / 800) % 8).toFixed(1);

  const voltEl = document.getElementById('rental-volt');
  if (voltEl) voltEl.textContent = `${volt} V`;
  const tempEl = document.getElementById('rental-temp');
  if (tempEl) tempEl.textContent = `${temp} °C`;

  // 4. Live Cost Ticker & Grace Readout
  const costEl = document.getElementById('live-rental-cost');
  if (costEl) costEl.textContent = `₹ ${cost.totalCost}`;

  const rateEl = document.getElementById('live-rental-rate');
  if (rateEl) rateEl.textContent = `Rate: ₹ ${cost.rate}/hr · Base: ₹ ${cost.baseCost}`;

  const graceEl = document.getElementById('live-rental-grace');
  if (graceEl) {
    if (cost.isGrace) {
      const gMin = Math.floor(cost.remainingGraceSec / 60);
      const gSec = Math.floor(cost.remainingGraceSec % 60);
      graceEl.innerHTML = `<span style="color:#f08a24;font-weight:700">⚡ Grace Period: ${gMin}m ${gSec}s remaining (no late fee)</span>`;
    } else if (cost.isOverdue) {
      graceEl.innerHTML = `<span style="color:#f87171;font-weight:700">⚠️ Session Overdue · Late Fee Applied (+₹${cost.lateFee})</span>`;
    } else {
      graceEl.innerHTML = `<span style="color:var(--mut)">Standard Session · ${cost.graceMins} min grace window on expiry</span>`;
    }
  }

  // 5. Smart Return Station Recommender
  const returnRecEl = document.getElementById('rental-return-rec');
  if (returnRecEl && typeof best === 'function' && typeof dist === 'function' && typeof fmtDist === 'function') {
    const targetStn = best(true);
    if (targetStn) {
      returnRecEl.textContent = `${targetStn.n} · ${fmtDist(dist(targetStn))} away (${targetStn.free} bays free)`;
    }
  }
};

window.retn = () => {
  const r = S.rent;
  if (!r) return;
  const cost = window.computeRentalCost ? window.computeRentalCost(r) : { totalCost: 20 };
  S.hist.unshift({
    id: r.id,
    d: 'Today',
    st: r.st.n,
    cat: r.cat,
    h: fmt(el()).slice(0, 5).replace(':', ' h ') + ' m',
    cost: `₹ ${cost.totalCost}`,
    s: 'Completed'
  });
  S.pay = null;
  const b = best(true);
  b.free = Math.max(0, b.free - 1);
  b.stock[r.cat]++;
  S.rent = null;
  toast(`Returned at ${b.n}. Total billed: ₹${cost.totalCost}. Thanks for using solar power.`);
  go(1);
};

// 1-second active rental timer, cost ticker and discharge
setInterval(() => {
  const r = S.rent;
  if (r && r.started) {
    window.updateRentalTimerDom();

    if (!r.done && el() >= r.dur) {
      r.done = true;
      const b = best(true);
      toast("Time's up! Return your power bank to " + b.n + ' (' + dist(b) + ' m away).');
    }
  }
}, 1000);
