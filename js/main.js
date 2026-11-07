// js/main.js - App Bootstrap, Global Listeners, Cursor FX, and Initial Route

// Skip to content for keyboard accessibility
document.body.insertAdjacentHTML(
  'afterbegin',
  '<a class="skip" href="#" onclick="event.preventDefault();$(\'#v\').focus()">Skip to content</a>'
);
const vEl = $('#v');
if (vEl) vEl.tabIndex = -1;

addEventListener('keydown', e => {
  if (e.key == 'Escape') {
    const m = $('#cm');
    if (m) m.remove();
  }
});

// Dynamic UI elements: Curtain transition and Lumi floating panel
document.body.insertAdjacentHTML(
  'beforeend',
  '<div id="cu"><i></i><i></i><i></i><i></i></div><div id="lmp" class="card"><b class="k">Lumi · help</b><div id="lmm"></div><input id="lmi" aria-label="Message Lumi" placeholder="Ask about PINs, returns, charging…" style="width:100%"></div><button id="lm" class="btn" aria-label="Open Lumi help chat">Lumi</button>'
);

const lm = $('#lm');
if (lm) {
  lm.onclick = () => {
    const c = $('#lmp');
    if (!c) return;
    c.style.display = c.style.display == 'block' ? 'none' : 'block';
    const lmm = $('#lmm');
    if (lmm && !lmm.children.length) say('Hi, I am Lumi. Ask me about PINs, bank types, returns or charging.');
  };
}

const lmi = $('#lmi');
if (lmi) {
  lmi.onkeydown = e => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    const x = e.target.value;
    e.target.value = '';
    say(x, 1);
    const h = KB.find(k => k[0].test(x.toLowerCase()));
    setTimeout(
      () => say(h ? h[1] : 'I am not sure. Please contact management using your registered phone or email.'),
      400
    );
  };
}

// Splash loader and fine cursor trails
if (!matchMedia('(prefers-reduced-motion:reduce)').matches) {
  const l = document.createElement('div');
  l.id = 'ld';
  l.innerHTML = logo(96);
  document.body.append(l);
  setTimeout(() => l.classList.add('x'), 1300);
  setTimeout(() => l.remove(), 1900);

  if (matchMedia('(pointer:fine)').matches) {
    document.body.insertAdjacentHTML('beforeend', '<div id="cg"></div>' + '<i class="tr"></i>'.repeat(8));
    const g = $('#cg'),
      tr = [...document.querySelectorAll('.tr')],
      P = tr.map(() => [0, 0]);
    let mx = -300,
      my = -300,
      gx = -300,
      gy = -300;
    addEventListener('pointermove', e => {
      mx = e.clientX;
      my = e.clientY;
    });
    (function f() {
      gx += (mx - gx) * 0.12;
      gy += (my - gy) * 0.12;
      if (g) g.style.transform = `translate(${gx}px,${gy}px)`;
      let px = mx,
        py = my;
      tr.forEach((d, i) => {
        P[i][0] += (px - P[i][0]) * 0.35;
        P[i][1] += (py - P[i][1]) * 0.35;
        px = P[i][0];
        py = P[i][1];
        d.style.transform = `translate(${px}px,${py}px) scale(${1 - i / 9})`;
        d.style.opacity = 0.6 - i * 0.07;
      });
      requestAnimationFrame(f);
    })();
  }
}

// Initial theme and routing
document.documentElement.dataset.t = S.th;
addEventListener('hashchange', () => go());
go(1);
