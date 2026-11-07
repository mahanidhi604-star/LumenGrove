// js/three-scenes.js - Three.js 3D Hero, Scroll-driven Station Inspection, Particle Animations, and Visual FX

let R3,
  IO = new IntersectionObserver(
    es =>
      es.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('on');
          IO.unobserve(e.target);
        }
      }),
    { threshold: 0.12 }
  );

let R5;
const S3 = [
  ['Solar panel', 'Converts sunlight to DC power. Its temperature sensor reports to the admin dashboard.', [0, 2.7, 0], [3.2, 3.4, 4.2]],
  ['Charge controller', 'Regulates panel output and protects the battery from overcharge.', [-1.5, 1.2, 0], [-3.4, 1.8, 3.6]],
  ['Station battery', 'Stores solar energy so banks keep charging after sunset.', [1.6, 0.4, 0], [3.4, 1.2, 3.6]],
  ['Slot cabinet', 'Eight locked slots. RFID, current sensing and a limit switch check every return.', [0, 1, 0.5], [0, 1.5, 4.4]]
];

function st3() {
  if (R5) {
    cancelAnimationFrame(R5.id);
    R5.r.dispose();
    R5 = null;
  }
  const c = $('#cv2');
  if (!c || !window.THREE) return;
  const T = THREE,
    cs = getComputedStyle(document.documentElement),
    ac = new T.Color(cs.getPropertyValue('--ac').trim()),
    fg = new T.Color(cs.getPropertyValue('--fg').trim()),
    w = c.clientWidth || 400,
    h = c.clientHeight || 400,
    sc = new T.Scene(),
    cam = new T.PerspectiveCamera(40, w / h, 0.1, 60),
    r = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, navigator.hardwareConcurrency <= 4 ? 1 : 2));
  r.setSize(w, h, false);

  const mk = (g, col, k, x, y, z) => {
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: col, metalness: 0.5, roughness: 0.4 }));
    m.position.set(x, y, z);
    m.userData.k = k;
    sc.add(m);
    return m;
  };
  const P = [
    mk(new T.BoxGeometry(2.6, 0.1, 1.6), 0x1b2a44, 0, 0, 2.7, 0),
    mk(new T.BoxGeometry(0.7, 0.6, 0.4), 0x555555, 1, -1.5, 1.2, 0),
    mk(new T.BoxGeometry(0.9, 0.6, 0.6), 0x2d3b2b, 2, 1.6, 0.4, 0),
    mk(new T.BoxGeometry(1.8, 1.8, 0.9), 0x20241c, 3, 0, 0.9, 0)
  ];
  P[0].rotation.x = -0.5;

  const pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.8), new T.MeshStandardMaterial({ color: 0x888888 }));
  pole.position.set(0, 1.9, -0.1);
  sc.add(pole);

  const base = new T.Mesh(
    new T.BoxGeometry(5, 0.1, 2.4),
    new T.MeshStandardMaterial({ color: fg.clone().multiplyScalar(0.4) })
  );
  base.position.y = -0.05;
  sc.add(base);

  for (let i = 0; i < 8; i++) {
    const s = new T.Mesh(new T.BoxGeometry(0.6, 0.28, 0.04), new T.MeshBasicMaterial({ color: ac }));
    s.position.set(i % 2 ? 0.4 : -0.4, 0.35 + (i >> 1) * 0.4, 0.47);
    sc.add(s);
  }

  sc.add(new T.AmbientLight(0xffffff, 0.7));
  const dl = new T.DirectionalLight(0xffffff, 1);
  dl.position.set(3, 5, 4);
  sc.add(dl);

  let sel = 0,
    vis = true,
    ls = -1;
  const look = new T.Vector3(...S3[0][2]),
    rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  cam.position.set(...S3[0][3]);
  new IntersectionObserver(e => (vis = e[0].isIntersecting)).observe(c);

  const pick = k => {
    sel = k;
    const t = $('#s3t');
    if (t) t.innerHTML = '<h3>' + S3[k][0] + '</h3><p>' + S3[k][1] + '</p>';
  };
  const rc = new T.Raycaster(),
    pt = new T.Vector2();
  c.onpointerdown = e => {
    const b = c.getBoundingClientRect();
    pt.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    rc.setFromCamera(pt, cam);
    const i = rc.intersectObjects(P)[0];
    if (i) pick(i.object.userData.k);
  };

  R5 = { r };
  const loop = () => {
    if (vis && !document.hidden) {
      const s3w = $('#s3w');
      if (s3w) {
        const b = s3w.getBoundingClientRect(),
          p = Math.min(1, Math.max(0, -b.top / (b.height - innerHeight))),
          s = Math.min(3, (p * 4) | 0);
        if (s != ls) {
          ls = s;
          pick(s);
        }
      }
      const k = rm ? 1 : 0.06;
      look.lerp(new T.Vector3(...S3[sel][2]), k);
      cam.position.lerp(new T.Vector3(...S3[sel][3]), k);
      cam.lookAt(look);
      P.forEach((m, i) => m.material.emissive.setHex(i == sel ? 0x553300 : 0));
      r.render(sc, cam);
    }
    R5.id = requestAnimationFrame(loop);
  };
  loop();
}

// Particle stream on duration slider canvas
const PA = [];
let pf = 0,
  pcol = '';
(function L() {
  const c = $('#pc');
  if (
    c &&
    !matchMedia('(prefers-reduced-motion:reduce)').matches &&
    !document.documentElement.classList.contains('rm')
  ) {
    const d = devicePixelRatio || 1,
      w = c.clientWidth,
      h = c.clientHeight;
    if (c.width != w * d) {
      c.width = w * d;
      c.height = h * d;
    }
    const x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0);
    x.clearRect(0, 0, w, h);
    if (pf++ % 40 == 0) pcol = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim();
    const fw = (w - 32) * ((S.dur - 0.5) / 5.5) + 16,
      n = 14 + S.dur * 6;
    while (PA.length < n)
      PA.push({ x: Math.random() * w, y: Math.random() * h, v: 0.8 + Math.random() * 2, p: Math.random() * 6 });
    PA.length = n;
    PA.forEach(p => {
      p.x += p.v * (0.6 + S.dur / 3);
      p.p += 0.15;
      if (p.x > fw) {
        p.x = -20;
        p.y = Math.random() * h;
      }
      const y = p.y + Math.sin(p.p) * 3,
        l = 14 + p.v * 10,
        gr = x.createLinearGradient(p.x - l, 0, p.x, 0);
      gr.addColorStop(0, 'transparent');
      gr.addColorStop(1, pcol);
      x.strokeStyle = gr;
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(p.x - l, y);
      x.lineTo(p.x, y);
      x.stroke();
      x.fillStyle = pcol;
      x.shadowColor = pcol;
      x.shadowBlur = 8;
      x.beginPath();
      x.arc(p.x, y, 1.8, 0, 6.3);
      x.fill();
      x.shadowBlur = 0;
    });
  }
  requestAnimationFrame(L);
})();

function fx() {
  if (R3) {
    cancelAnimationFrame(R3.id);
    R3.r.dispose();
    R3 = null;
  }
  document.querySelectorAll('#v .card,#v h2,#v .flow').forEach(e => {
    e.classList.add('rv');
    IO.observe(e);
  });
  document.querySelectorAll('.btn').forEach(b => {
    b.onpointermove = e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px,${
        (e.clientY - r.top - r.height / 2) * 0.25
      }px)`;
    };
    b.onpointerleave = () => (b.style.transform = '');
  });

  const c = $('#cv');
  if (c && window.THREE) {
    const T = THREE,
      cs = getComputedStyle(document.documentElement),
      ac = new T.Color(cs.getPropertyValue('--ac').trim()),
      g2 = new T.Color(cs.getPropertyValue('--ac2').trim()),
      W = c.parentElement.clientWidth || 400;
    const sc = new T.Scene(),
      cam = new T.PerspectiveCamera(35, 1, 0.1, 50);
    cam.position.z = 8;
    const r = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(W, W, false);

    const sh = new T.Shape(),
      w = 0.8,
      h = 1.5,
      k = 0.3;
    sh.moveTo(-w + k, -h);
    sh.lineTo(w - k, -h);
    sh.quadraticCurveTo(w, -h, w, -h + k);
    sh.lineTo(w, h - k);
    sh.quadraticCurveTo(w, h, w - k, h);
    sh.lineTo(-w + k, h);
    sh.quadraticCurveTo(-w, h, -w, h - k);
    sh.lineTo(-w, -h + k);
    sh.quadraticCurveTo(-w, -h, -w + k, -h);

    const gb = new T.ExtrudeGeometry(sh, {
      depth: 0.4,
      bevelEnabled: true,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      bevelSegments: 5
    });
    gb.translate(0, 0, -0.2);

    const G = new T.Group(),
      body = new T.Mesh(gb, new T.MeshStandardMaterial({ color: 0x1a231c, metalness: 0.7, roughness: 0.3 }));
    G.add(body);

    const bs = new T.Shape();
    [
      [0.15, 0.8],
      [-0.4, -0.05],
      [-0.03, -0.05],
      [-0.15, -0.8],
      [0.4, 0.1],
      [0.03, 0.1]
    ].forEach((p, i) => (i ? bs.lineTo(p[0], p[1]) : bs.moveTo(p[0], p[1])));
    const bolt = new T.Mesh(
      new T.ExtrudeGeometry(bs, { depth: 0.04, bevelEnabled: false }),
      new T.MeshBasicMaterial({ color: ac })
    );
    bolt.position.z = 0.28;
    G.add(bolt);

    [-0.3, 0, 0.3].forEach(x => {
      const d = new T.Mesh(new T.SphereGeometry(0.05, 12, 12), new T.MeshBasicMaterial({ color: g2 }));
      d.position.set(x, -1.25, 0.28);
      G.add(d);
    });

    const ring = new T.Mesh(new T.TorusGeometry(2.1, 0.02, 8, 100), new T.MeshBasicMaterial({ color: ac }));
    G.add(ring);

    const n = 160,
      pa = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28,
        b = Math.acos(2 * Math.random() - 1),
        d = 2.5 + Math.random() * 1.2;
      pa.set([d * Math.sin(b) * Math.cos(a), d * Math.sin(b) * Math.sin(a), d * Math.cos(b)], i * 3);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute('position', new T.BufferAttribute(pa, 3));
    const pts = new T.Points(pg, new T.PointsMaterial({ color: ac, size: 0.05 }));
    sc.add(G, pts);

    sc.add(new T.AmbientLight(0xffffff, 0.55));
    const dl = new T.DirectionalLight(0xffffff, 1.1);
    dl.position.set(3, 4, 5);
    sc.add(dl);
    const pl = new T.PointLight(ac, 1.4, 12);
    pl.position.set(-3, -2, 3);
    sc.add(pl);

    let mx = 0,
      my = 0;
    const mv = e => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
    };
    addEventListener('pointermove', mv);

    const still =
      matchMedia('(prefers-reduced-motion:reduce)').matches || document.documentElement.classList.contains('rm');
    R3 = { r };
    let t0 = 0;
    const loop = () => {
      if (document.hidden || scrollY > innerHeight * 1.2) {
        R3.id = requestAnimationFrame(loop);
        return;
      }
      t0 += 0.012;
      G.rotation.y = Math.sin(t0) * 0.5 + mx * 0.8;
      G.rotation.x = my * 0.4;
      G.position.y = Math.sin(t0 * 1.5) * 0.12;
      ring.rotation.x = 1.2 + t0 * 0.3;
      ring.rotation.y = t0 * 0.2;
      pts.rotation.y = t0 * 0.15;
      r.render(sc, cam);
      if (!still) R3.id = requestAnimationFrame(loop);
    };
    loop();
  }

  // Animated numbers
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  document.querySelectorAll('[data-n]').forEach(e => {
    const n = +e.dataset.n,
      t0 = performance.now();
    (function f(t) {
      const p = rm ? 1 : Math.min(1, (t - t0) / 1200);
      e.textContent = ((n * (1 - Math.pow(1 - p, 3))) | 0).toLocaleString();
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  });

  st3();
  const g = $('.g3');
  if (g) setTimeout(() => g.classList.add('rdy'), 700);
}
