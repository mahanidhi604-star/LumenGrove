// js/admin.js - Staff Administration, Station Command, Solar Chart, Heatmap, and Pricing Rules

window.bill = () => {
  const bl = $('#bl');
  if (bl) bl.textContent = PR.rate ? '₹ ' + PR.rate * 2 : '—';
};

const chart = () => {
  const W = 600,
    H = 160,
    C = ['var(--ac)', 'var(--ac2)', 'var(--fg)', 'var(--mut)'],
    D = ['', '6 4', '2 3', '10 3'];
  return `<h2 style="margin-top:32px">Solar output (W)</h2><div class="card"><svg viewBox="0 0 ${W} ${
    H + 10
  }" style="width:100%" role="img" aria-label="Solar output per station over time">${ST.map(
    (s, i) =>
      `<polyline fill="none" stroke="${C[i]}" stroke-width="2.5" stroke-dasharray="${D[i]}" points="${s.h
        .map((v, j) => (((j * W) / 29) | 0) + ',' + (H - ((((v - 60) / 360) * H) | 0)))
        .join(' ')}"/>`
  ).join('')}</svg><p>${ST.map(
    (s, i) =>
      `<span class="badge" style="margin-right:8px"><svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="${C[i]}" stroke-width="3" stroke-dasharray="${D[i]}"/></svg>${s.n}</span>`
  ).join('')}</p></div>`;
};

const cards = () =>
  `<div class="grid">${ST.map(
    s =>
      `<div class="card"><div style="display:flex;justify-content:space-between"><h3>${
        s.n
      }</h3><span class="badge">${s.ok ? 'online' : 'offline'}</span></div><p>Slots free <b>${s.free}/${
        s.slots
      }</b> · Solar <b>${s.solar | 0} W</b> · Panel temp <b>${s.temp.toFixed(
        1
      )}°C</b></p><div class="bar"><i style="width:${s.batt}%"></i></div><small>Battery reserve ${
        s.batt | 0
      }% · ${Object.keys(CATS)
        .map(k => CATS[k].n.replace('Grove ', '') + ' ' + s.stock[k])
        .join(' · ')}</small><p><button class="btn g" onclick="tg('${s.id}')">Toggle status</button></p></div>`
  ).join('')}</div>${chart()}`;

window.tg = id => {
  const s = ST.find(x => x.id == id);
  if (s) s.ok = !s.ok;
  const adm = $('#adm');
  if (adm) adm.innerHTML = cards();
};

function admin() {
  const a = S.u && (S.u.role == 'super' || S.u.role == 'tech');
  if (!a) return PG['admin-login']();
  const sup = S.u.role == 'super',
    hrs = [2, 1, 1, 1, 2, 3, 5, 8, 9, 7, 6, 6, 7, 6, 5, 6, 8, 9, 7, 5, 4, 3, 2, 2];
  return `<div class="wrap"><span class="k">${sup ? 'Super admin' : 'Technician'}</span><h1 tabindex="-1">Fleet</h1><div class="grid"><div class="card"><div class="num">${ST.length}</div>stations</div><div class="card"><div class="num">${ST.reduce(
    (a, s) => a + free(s.id),
    0
  )}</div>banks ready</div><div class="card"><div class="num">${sol().replace(
    /<[^>]+>/g,
    ''
  )}</div>solar input</div><div class="card"><div class="num">2</div>low-solar alerts</div></div>
  <h2 style="margin-top:32px">Station command</h2><div id="adm">${cards()}</div>
  <h2 style="margin-top:32px">Busy hours</h2><div class="heat">${hrs
    .map((v, i) => `<b title="${i}:00" style="opacity:${0.2 + v / 10}">${i}</b>`)
    .join('')}</div>
  <h2 style="margin-top:32px">Security events</h2><table><tr><td>09:12</td><td>Vibration at Big Mingoes slot 4</td></tr><tr><td>11:40</td><td>Return check failed, Library slot 2</td></tr></table><h2 style="margin-top:32px">Service queue</h2><table><tr><td>Bank #7 · M.M Foods</td><td>Low health</td></tr><tr><td>Lock · Library slot 9</td><td>Sticking</td></tr></table>
  <p><button class="btn g" onclick="toast('CSV export needs the backend')">Export logs (CSV)</button></p>${
    sup
      ? `<h2 style="margin-top:32px">Pricing rules</h2><div class="card"><label for="pr">Hourly rate (₹)</label><input id="pr" type="number" value="${
          PR.rate
        }" oninput="PR.rate=this.value;bill()"><label for="pg">Grace period (min)</label><input id="pg" type="number" value="${
          PR.grace
        }" oninput="PR.grace=this.value"><label for="pl">Late fee (₹)</label><input id="pl" type="number" value="${
          PR.late
        }" oninput="PR.late=this.value"><label for="pd">Deposit (₹)</label><input id="pd" type="number" value="${
          PR.dep
        }" oninput="PR.dep=this.value"><p>Bill preview, 2 h rental: <b id="bl">—</b></p></div>`
      : ''
  }</div>`;
}

// Telemetry history update loop for solar chart
setInterval(() => {
  ST.forEach(s => {
    if (!s.h) s.h = [];
    s.h.push(s.solar);
    if (s.h.length > 30) s.h.shift();
  });
}, 2000);

// Admin telemetry simulation interval
let tk = 0;
setInterval(() => {
  tk++;
  ST.forEach(s => {
    s.solar = Math.max(80, s.solar + Math.random() * 30 - 15);
    s.batt = Math.min(100, Math.max(20, s.batt + Math.random() * 2 - 1));
    s.temp = Math.min(55, Math.max(28, s.temp + Math.random() - 0.5));
  });
  if (
    tk % 2 == 0 &&
    location.hash == '#admin' &&
    $('#adm') &&
    !/INPUT|SELECT/.test(document.activeElement.tagName)
  ) {
    $('#adm').innerHTML = cards();
  }
}, 1000);
