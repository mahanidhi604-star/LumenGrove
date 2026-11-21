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

window.setRentalSpeed = (newSpeed) => {
  S.speed = Number(newSpeed) || 1;
  if (window.updateRentalTimerDom) window.updateRentalTimerDom();
};

const DL = h => (h < 1 ? '30 min' : h == 1 ? '1 hour' : h + ' hours');
const DS = h => (h <= 1 ? 'Quick top-up' : h <= 2 ? 'Standard' : h <= 4 ? 'Long session' : 'Extended');

window.durIn = v => {
  S.dur = +v;
  // Invalidate unconfirmed pass when duration is changed, requiring user to click "⚡ Generate UPI / QR Pass"
  if (S.pay && !S.pay.paid) {
    if (window._paySyncInterval) clearInterval(window._paySyncInterval);
    if (window._activePayChannel && window.supabaseClient) {
      try { window.supabaseClient.removeChannel(window._activePayChannel); } catch (e) {}
    }
    S.pay = null;
    const payCardContainer = document.querySelector('.bento-pay-card-wrapper');
    if (payCardContainer) {
      go(1);
    }
  }
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

window.initUpiQrCode = (uri) => {
  const mount = document.getElementById('upi-qrcode-mount');
  if (!mount) return;
  mount.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(mount, {
        text: uri,
        width: 176,
        height: 176,
        colorDark: '#041628',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    } catch (e) {
      console.warn('QRCode generation exception:', e);
    }
  }
  // Fallback if QRCode script is still loading
  mount.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.8rem;color:#041628;font-weight:700">QR Loading...</div>`;
};

// Two-way synchronization between Mobile Payment Simulation Page and Main Kiosk
window.startPaymentSyncListener = (sessionId) => {
  if (!sessionId) return;
  console.log('[PaySync] Starting sync listener for session:', sessionId);

  if (window._paySyncInterval) {
    clearInterval(window._paySyncInterval);
    window._paySyncInterval = null;
  }
  if (window._paySyncBc) {
    try { window._paySyncBc.close(); } catch (e) {}
    window._paySyncBc = null;
  }
  if (window._activePayChannel && window.supabaseClient) {
    try { window.supabaseClient.removeChannel(window._activePayChannel); } catch (e) {}
    window._activePayChannel = null;
  }

  // 1. Supabase Realtime Broadcast (Internet / Vercel cross-device sync)
  if (window.supabaseClient) {
    try {
      const channelName = 'lg_pay_' + sessionId;
      const payChannel = window.supabaseClient.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      payChannel
        .on('broadcast', { event: 'payment_approved' }, (data) => {
          console.log('[PaySync] Supabase Realtime broadcast received:', data);
          const payload = data && data.payload ? data.payload : data;
          if (payload && (payload.sessionId === sessionId || !payload.sessionId)) {
            window.onLivePaymentReceived(sessionId);
          }
        })
        .subscribe((status, err) => {
          console.log(`[PaySync] Supabase Realtime channel [${channelName}] status:`, status, err || '');
        });

      window._activePayChannel = payChannel;
    } catch (err) {
      console.warn('[PaySync] Supabase Realtime setup error:', err);
    }
  }

  // 2. BroadcastChannel API (Instant multi-tab communication)
  try {
    window._paySyncBc = new BroadcastChannel('lumengrove_pay_bus');
    window._paySyncBc.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'PAYMENT_APPROVED' && ev.data.sessionId === sessionId) {
        console.log('[PaySync] BroadcastChannel message received:', ev.data);
        window.onLivePaymentReceived(sessionId);
      }
    };
  } catch (e) {}

  // 3. Storage event listener (across browser tabs)
  const onStorage = (e) => {
    if (e.key === 'lg_pay_status_' + sessionId) {
      try {
        const val = JSON.parse(e.newValue || '{}');
        if (val.status === 'APPROVED') {
          console.log('[PaySync] Storage event approval received:', val);
          window.onLivePaymentReceived(sessionId);
        }
      } catch (err) {}
    }
  };
  window.addEventListener('storage', onStorage);

  // 4. Polling Fallback (Checking localStorage and local/server status endpoint every 500ms)
  window._paySyncInterval = setInterval(async () => {
    if (!S.pay || S.pay.paid) {
      clearInterval(window._paySyncInterval);
      window._paySyncInterval = null;
      return;
    }

    try {
      const raw = localStorage.getItem('lg_pay_status_' + sessionId);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.status === 'APPROVED') {
          window.onLivePaymentReceived(sessionId);
          return;
        }
      }
    } catch (e) {}

    try {
      const res = await fetch('/api/pay/status/' + encodeURIComponent(sessionId), { cache: 'no-store' });
      if (res.ok) {
        const apiData = await res.json();
        if (apiData && apiData.status === 'APPROVED') {
          window.onLivePaymentReceived(sessionId);
          return;
        }
      }
    } catch (e) {}
  }, 500);
};

window.onLivePaymentReceived = async (sessionId) => {
  if (!S.pay || S.pay.paid) return;
  console.log('[PaySync] onLivePaymentReceived triggering simulation flow for session:', sessionId);
  if (window._paySyncInterval) {
    clearInterval(window._paySyncInterval);
    window._paySyncInterval = null;
  }
  toast(`✓ Live Mobile Payment Received (${sessionId}) · Kiosk Slot Unlocked`);
  await window.simulateBankWebhookApproval();
};

window.publishMqttRentCommand = async (rentPayload) => {
  return new Promise((resolve, reject) => {
    const mqttLib = window.mqtt || (typeof mqtt !== 'undefined' ? mqtt : null);
    if (!mqttLib || !mqttLib.connect) {
      const err = new Error('MQTT library (mqtt.js) is not available. Please ensure vendor/mqtt.min.js is loaded.');
      console.error('[MQTT]', err.message);
      return reject(err);
    }

    const brokerUrl = window.MQTT_BROKER_WSS || 'wss://broker.hivemq.com:8884/mqtt';
    const topic = window.MQTT_RENT_TOPIC || 'lumengrove/stations/station_01/rent';
    const clientId = 'lumengrove_web_' + Math.random().toString(16).substring(2, 10);

    console.log(`[MQTT] 1. Initiating connection to HiveMQ broker: ${brokerUrl}`);
    console.log(`[MQTT]    Client ID: ${clientId}`);

    let client;
    try {
      client = mqttLib.connect(brokerUrl, {
        clientId,
        clean: true,
        keepalive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 0
      });
    } catch (e) {
      console.error('[MQTT] ✗ Connection initialization failed:', e);
      return reject(e);
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error('[MQTT] ✗ Connection timed out after 10s (HiveMQ broker was unreachable)');
      try { client.end(true); } catch (e) {}
      reject(new Error('MQTT connection timeout'));
    }, 10000);

    client.on('connect', () => {
      console.log(`[MQTT] 2. ✓ Connected successfully to HiveMQ broker (${brokerUrl})`);
      const message = JSON.stringify(rentPayload);
      console.log(`[MQTT] 3. Publishing rent command to topic: "${topic}"`);
      console.log(`[MQTT]    Payload:`, message);

      client.publish(topic, message, { qos: 0 }, (err) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;

        if (err) {
          console.error(`[MQTT] ✗ Failed to publish to topic "${topic}":`, err);
          try { client.end(true); } catch (e) {}
          reject(err);
        } else {
          console.log(`[MQTT] 4. ✓ Successfully published rent command to topic "${topic}"!`);
          console.log(`[MQTT]    Message dispatched to ESP32:`, message);
          setTimeout(() => {
            try { client.end(false); } catch (e) {}
          }, 500);
          resolve(rentPayload);
        }
      });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      console.error('[MQTT] ✗ Connection error event received:', err);
      try { client.end(true); } catch (e) {}
      reject(err);
    });

    client.on('offline', () => {
      console.warn('[MQTT] Client went offline');
    });

    client.on('close', () => {
      console.log('[MQTT] Client connection closed.');
    });
  });
};

window.simulateBankWebhookApproval = async () => {
  let p = S.pay;
  if (!p || p.paid) {
    console.log('[SimulatePay] Initializing/resetting active checkout session for testing...');
    if (!p) {
      p = S.pay = {
        id: 'UPI-' + Math.floor(100000 + Math.random() * 900000),
        amount: 10,
        dur: 1,
        cat: 'std',
        b: { id: 'station_01', n: 'Central Library Kiosk' },
        paid: false
      };
    } else {
      p.paid = false;
    }
  }

  const txnId = p.id || ('UPI-' + Math.floor(100000 + Math.random() * 900000));
  toast(`⚡ Bank Webhook: Instant Approval Received (${txnId})`);

  // 1. Dynamically fetch first available power bank from Supabase banks table (is_rented = false)
  console.log('[Rentals] 1. Querying Supabase for first available power bank (is_rented = false)...');
  let bankId = null;
  if (window.supabaseClient) {
    try {
      let { data, error } = await window.supabaseClient
        .from('banks')
        .select('id, rfid_tag, bank_type_id, is_rented')
        .eq('is_rented', false)
        .limit(1);

      if ((error || !data || data.length === 0) && window.supabaseClient.from) {
        const pbRes = await window.supabaseClient
          .from('power_banks')
          .select('id, rfid_tag, bank_type_id, is_rented')
          .eq('is_rented', false)
          .limit(1);
        if (!pbRes.error && Array.isArray(pbRes.data) && pbRes.data.length > 0) {
          data = pbRes.data;
          error = null;
        }
      }

      if (!error && Array.isArray(data) && data.length > 0) {
        bankId = data[0].id;
        console.log('[Rentals] ✓ Fetched available bank from Supabase:', bankId);
      } else {
        console.warn('[Rentals] Supabase returned no rows with is_rented=false. Error:', error);
      }
    } catch (e) {
      console.warn('[Rentals] Error fetching bank from Supabase:', e);
    }
  }

  // Fallback to verified seeded bank UUID if database query returns empty
  if (!bankId) {
    bankId = '1fb492d3-9244-455c-a13f-071f14436393';
    console.log('[Rentals] Using fallback seeded bank ID:', bankId);
  }

  // 2. Identify student user UUID (or fallback demo student UUID for foreign key validity)
  const userId = (S.u && S.u.id && S.u.id.length > 20)
    ? S.u.id
    : '015eb091-8a66-4f25-a96f-2880378fb9b1';

  // 3. Before inserting a new rental, close/complete any existing open/active rental for this user in Supabase
  if (window.supabaseClient && userId) {
    try {
      console.log('[Rentals] Closing/completing prior open/active rentals for user:', userId);
      const { error: patchErr } = await window.supabaseClient
        .from('rentals')
        .update({ status: 'completed' })
        .eq('user_id', userId)
        .in('status', ['pending', 'active']);
      if (patchErr) console.warn('[Rentals] Notice closing pending/active rentals:', patchErr);
      else console.log('[Rentals] ✓ Prior open rentals successfully marked as completed.');
    } catch (closeErr) {
      console.warn('[Rentals] Notice closing prior open rentals:', closeErr);
    }

    try {
      await window.supabaseClient
        .from('rentals')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'paid');
    } catch (paidErr) {
      // Non-critical cleanup
    }
  }

  // 4. Formulate JSON rent command for ESP32
  const stationId = 'station_01';
  const rentPayload = {
    action: 'rent',
    station_id: stationId,
    bank_id: bankId,
    user_id: userId
  };

  console.log('[Rentals] Formulated Rent Payload:', JSON.stringify(rentPayload));

  // 5. Publish via MQTT over WebSockets
  try {
    console.log('[Rentals] Publishing MQTT rent command to HiveMQ broker...');
    await window.publishMqttRentCommand(rentPayload);
    toast(`⚡ MQTT Sent: Renting Bank [${bankId.substring(0, 8)}] at Station [${stationId}]`);
  } catch (mqttErr) {
    console.error('[MQTT] Publish error:', mqttErr);
    toast('⚠️ MQTT publish failed, check browser console');
  }

  // 6. Complete website rental processing with the selected bankId
  paid(rentPayload);
};

// Alias for convenience so simulatePayment() also triggers this handler
window.simulatePayment = window.simulateBankWebhookApproval;

window.cancelPayment = () => {
  if (window._paySyncInterval) {
    clearInterval(window._paySyncInterval);
    window._paySyncInterval = null;
  }
  if (window._activePayChannel && window.supabaseClient) {
    try { window.supabaseClient.removeChannel(window._activePayChannel); } catch (e) {}
    window._activePayChannel = null;
  }
  S.pay = null;
  if ($('#rb')) rr();
  else go(1);
};

// Minimal Clean Mobile Payment Simulation View (#pay-sim)
window.renderPaySimView = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const qIdx = hash.indexOf('?');
  const hashParams = new URLSearchParams(qIdx !== -1 ? hash.slice(qIdx + 1) : '');

  const getParam = (k) => hashParams.get(k) || searchParams.get(k);

  const sessionId = getParam('id') || (S.pay ? S.pay.id : 'PAY-DEMO');
  const amount = getParam('amount') || (S.pay ? S.pay.amount : '10');
  const stnId = getParam('stn') || (S.pay && S.pay.b ? S.pay.b.id : 'library');
  const dur = getParam('dur') || (S.pay && S.pay.dur ? S.pay.dur : (S.dur || '1'));
  const cat = getParam('cat') || (S.pay && S.pay.cat ? S.pay.cat : (S.cat || 'std'));

  const stn = (typeof getStn === 'function' ? getStn(stnId) : null) || (window.ST && window.ST.find(s => s.id === stnId)) || { n: 'Central Library' };
  const catObj = (window.CATS && window.CATS[cat]) || { n: 'Grove Phone' };

  return `
    <div class="wrap" style="max-width:440px;margin:28px auto;padding:16px">
      <div class="card pay-sim-card">
        <div class="pay-sim-header">
          <div style="display:flex;align-items:center;gap:10px">
            ${logo(28)}
            <div>
              <b style="display:block;font-size:1.15rem;line-height:1.2;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.04em">LumenGrove Mobile Pay</b>
              <small style="color:var(--mut);font-size:0.75rem">RVCE Solar Microgrid Kiosk Gateway</small>
            </div>
          </div>
          <span class="badge" style="background:#072418;color:#34d399;border:1px solid #059669;font-weight:700">● SECURE GATEWAY</span>
        </div>

        <div class="pay-sim-summary">
          <small class="summary-tag">SESSION BILLING SUMMARY</small>
          <div class="summary-amount">₹ ${amount}</div>
          <div class="summary-details">
            <div class="summary-row"><span>Campus Kiosk:</span> <b>${stn.n}</b></div>
            <div class="summary-row"><span>Power Bank:</span> <b>${catObj.n}</b></div>
            <div class="summary-row"><span>Duration:</span> <b>${dur} Hour(s)</b></div>
            <div class="summary-row"><span>Session Ref:</span> <b style="font-family:monospace;color:#00e5ff">${sessionId}</b></div>
          </div>
        </div>

        <!-- Minimal clean simulation action -->
        <div id="pay-sim-actions">
          <button type="button" class="btn btn-authorize-pay" onclick="authorizeSimulatedPayment('${sessionId}')">
            <span>⚡ Authorize Payment · ₹ ${amount}</span>
          </button>
          <p style="text-align:center;font-size:0.8rem;color:var(--mut);margin:12px 0 0;line-height:1.4">
            Clicking Authorize simulates instant payment authorization. Your station kiosk on your laptop will automatically detect this approval in real time.
          </p>
        </div>

        <!-- Success confirmation block -->
        <div id="pay-sim-confirmed" style="display:none;margin-top:16px">
          <div style="text-align:center;padding:22px 16px;background:rgba(52,211,153,0.12);border:1.5px solid #34d399;border-radius:14px">
            <div style="font-size:2.8rem;color:#34d399;line-height:1;margin-bottom:6px">✓</div>
            <h3 style="color:#34d399;margin:0 0 6px;font-size:1.3rem">Payment Authorized!</h3>
            <p style="font-size:0.92rem;color:var(--fg);margin:0">Kiosk at <b>${stn.n}</b> has received confirmation.</p>
            <div style="margin-top:12px;padding:8px 12px;background:rgba(0,0,0,0.25);border-radius:8px;font-size:0.82rem;color:#00e5ff">
              Slot solenoid unlocked · You may collect your power bank at the kiosk
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.authorizeSimulatedPayment = async (sessionId) => {
  console.log('[PaySim] Authorizing payment for session:', sessionId);
  const actionsEl = document.getElementById('pay-sim-actions');
  const confirmedEl = document.getElementById('pay-sim-confirmed');

  // 1. Instant UI update so user immediately sees approval confirmation
  if (actionsEl) actionsEl.style.display = 'none';
  if (confirmedEl) confirmedEl.style.display = 'block';

  // 2. Write to localStorage (detected by storage event & kiosk poller if same browser)
  try {
    localStorage.setItem('lg_pay_status_' + sessionId, JSON.stringify({
      status: 'APPROVED',
      sessionId: sessionId,
      time: Date.now()
    }));
  } catch (e) {}

  // 3. BroadcastChannel (instant tab-to-tab messaging)
  try {
    const bc = new BroadcastChannel('lumengrove_pay_bus');
    bc.postMessage({ type: 'PAYMENT_APPROVED', sessionId: sessionId });
    setTimeout(() => { try { bc.close(); } catch(e){} }, 800);
  } catch (e) {}

  // 4. Supabase Realtime Broadcast (Internet / Vercel cross-device sync)
  if (window.supabaseClient) {
    try {
      const channelName = 'lg_pay_' + sessionId;
      const sendChannel = window.supabaseClient.channel(channelName, {
        config: { broadcast: { self: false } }
      });

      const emitBroadcast = async () => {
        try {
          await sendChannel.send({
            type: 'broadcast',
            event: 'payment_approved',
            payload: {
              sessionId: sessionId,
              status: 'APPROVED',
              time: Date.now()
            }
          });
          console.log('[PaySim] Supabase Realtime broadcast sent for session:', sessionId);
        } catch (bErr) {
          console.warn('[PaySim] Realtime broadcast error:', bErr);
        }
      };

      sendChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await emitBroadcast();
          setTimeout(emitBroadcast, 400);
          setTimeout(emitBroadcast, 1200);
        }
      });
    } catch (err) {
      console.warn('[PaySim] Supabase channel error:', err);
    }
  }

  // 5. Backend API notification if local server / LAN
  try {
    fetch('/api/pay/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId })
    }).catch(() => {});
  } catch (e) {}

  // 6. Update in-memory session if present in same window
  if (window.S && window.S.pay && (window.S.pay.id === sessionId || sessionId.startsWith('PAY-'))) {
    window.S.pay.paid = true;
    if (typeof window.paid === 'function' && !window.S.rent) {
      window.paid();
    }
  }

  toast('✓ Payment Authorized! Kiosk confirmed.');
};

const payView = () => {
  const p = S.pay;
  if (!p) return '';

  // Check if session was approved via mobile storage
  if (p.id) {
    try {
      const raw = localStorage.getItem('lg_pay_status_' + p.id);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.status === 'APPROVED') {
          p.paid = true;
        }
      }
    } catch (e) {}
  }

  if (p.paid && !S.rent) {
    paid();
    return '';
  }

  const c = (window.CATS && window.CATS[p.cat || S.cat]) || CATS.std,
    r = S.rent;
  if (p.paid && r)
    return `
      <div class="card" style="padding:24px;border:1px solid var(--ln);border-radius:18px;background:color-mix(in srgb,var(--card) 96%,transparent)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="tag" style="background:#34d399;color:#021626;font-size:0.75rem;padding:3px 8px;border-radius:4px;font-weight:800">✓ PAYMENT CONFIRMED</span>
          <span class="badge" style="background:var(--ac);color:var(--on);font-weight:700">PIN ISSUED</span>
        </div>
        <h2 style="margin:4px 0">Your 6-Digit Kiosk PIN</h2>
        <div class="num" style="font-size:3.6rem;letter-spacing:0.25em;color:var(--ac,#00e5ff);font-family:'Barlow Condensed',monospace;margin:8px 0">${r.pin}</div>
        <p style="color:var(--fg);line-height:1.4">Power bank at <b>${r.st.n}</b> is ready for pickup. Enter this PIN at the station kiosk simulator below to unlock your slot.</p>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <a class="btn" href="#app-rentals" onclick="S.pay=null;go(1)">View Active Rental & Timer →</a>
          <button type="button" class="btn g" onclick="S.pay=null;go(1)">Done</button>
        </div>
      </div>
    `;

  const currentRate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const durHours = p.dur || S.dur || 1;
  const payTotal = p.amount || Math.round(durHours * currentRate);

  // Ensure unique session ID and amount
  if (!p.id) {
    p.id = 'PAY-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  p.amount = payTotal;

  // Build the mobile payment simulation URL encoded into the QR code
  const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
  let pathname = window.location.pathname || '/';
  pathname = pathname.replace(/\/Index\.html$/i, '/').replace(/\/index\.html$/i, '/');
  if (!pathname.endsWith('/')) pathname += '/';
  const paySimUrl = `${origin}${pathname}#pay-sim?id=${p.id}&amount=${payTotal}&stn=${encodeURIComponent(p.b.id)}&dur=${durHours}&cat=${p.cat || S.cat}`;

  // Start two-way real-time listener for mobile approval
  window.startPaymentSyncListener(p.id);

  setTimeout(() => {
    if (window.initUpiQrCode) window.initUpiQrCode(paySimUrl);
  }, 40);

  return `
    <div class="card pay authentic-upi-card">
      <!-- 1. Left QR Code Column (Scanned by Mobile Device) -->
      <div class="upi-qr-column">
        <div class="upi-brand-header">
          <span class="upi-bhim-tag">MOBILE SIMULATION QR</span>
          <span class="upi-live-tag">● TWO-WAY SYNC</span>
        </div>
        
        <div class="upi-qr-frame">
          <div id="upi-qrcode-mount" class="upi-qrcode-mount" title="Scan with mobile phone to open payment simulation"></div>
          <div class="upi-scan-hint">Scan with Mobile Phone Camera</div>
        </div>

        <a href="${paySimUrl}" target="_blank" class="btn btn-sm g btn-open-sim" style="width:100%;font-size:0.75rem;padding:6px;text-align:center;text-decoration:none">
          📱 Open Mobile Page ↗
        </a>
      </div>

      <!-- 2. Right Payment Details Column -->
      <div class="upi-info-column" style="display:flex;flex-direction:column;gap:10px;width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span class="k" style="margin:0">Step 2 of 3 · Mobile Payment Checkout</span>
          <span class="badge" style="background:#072418;color:#34d399;border:1px solid #059669">REALTIME KIOSK SYNC</span>
        </div>

        <div>
          <h2 style="margin:2px 0 4px">Scan or Simulate Pay</h2>
          <p style="color:var(--mut);font-size:0.88rem;margin:0">
            ${c.n} · <b>${durHours} hour rental</b> at <b>${p.b.n}</b>
          </p>
        </div>

        <div class="upi-price-highlight">
          <div class="price-val">₹ ${payTotal}</div>
          <div class="price-meta">₹ ${currentRate}/hr base rate set by Admin · Session Ref: <span style="font-family:monospace;color:#00e5ff">${p.id}</span></div>
        </div>

        <!-- Manual Webhook Approval Action (For Kiosk Examiner / Viva Speed) -->
        <div class="upi-simulation-section" style="margin-top:4px">
          <button type="button" class="btn btn-simulate-webhook" onclick="simulateBankWebhookApproval()" title="Simulate instant bank authorization webhook">
            <span class="webhook-bolt">⚡</span>
            <div style="text-align:left">
              <div style="font-size:0.95rem;font-weight:800;line-height:1.2">Simulate Payment (Bank Webhook Approval)</div>
              <small style="font-size:0.72rem;opacity:0.9;display:block;text-transform:none;font-weight:normal">Dispatches MQTT rent command to ESP32 Station 01</small>
            </div>
          </button>
          <button type="button" class="btn g btn-cancel-checkout" onclick="cancelPayment()" style="width:100%;margin-top:6px;padding:8px">↺ Change Configuration / Cancel</button>
        </div>

        <div class="upi-status-indicator">
          <span class="datav-dot-pulse" style="display:inline-block;width:6px;height:6px;background:#00e5ff;border-radius:50%;margin-right:6px"></span>
          <span>Live sync active · Authorizing on mobile instantly unlocks this kiosk</span>
        </div>
      </div>
    </div>
  `;
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
  const currentCat = S.cat || 'std';
  if (!b.stock[currentCat] || b.stock[currentCat] < 1) {
    return toast(`No stock for ${CATS[currentCat]?.n || 'selected bank'} at ${b.n}. Please choose another station or bank.`);
  }

  const currentRate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const durHours = S.dur || 1;
  const payTotal = Math.round(durHours * currentRate);
  const paySessionId = 'PAY-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

  S.pay = {
    id: paySessionId,
    t: Date.now(),
    b: b,
    stnId: b.id,
    cat: currentCat,
    dur: durHours,
    amount: payTotal,
    paid: false
  };

  try {
    localStorage.setItem('lg_active_pay_session', JSON.stringify(S.pay));
  } catch (e) {}

  const payCardContainer = document.querySelector('.bento-pay-card-wrapper');
  if (payCardContainer) {
    payCardContainer.innerHTML = `<div class="card s4 bento-pay-card" style="--i:2">${payView()}</div>`;
    payCardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast(`Checkout pass generated for ${b.n} · ₹ ${payTotal} (${durHours}h)`);
  } else {
    rr();
    setTimeout(() => {
      document.querySelector('.bento-pay-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }
};

window.paid = (customCmd) => {
  const p = S.pay;
  if (!p || S.rent) return;
  if (typeof stu === 'function' && !stu()) {
    toast('Authentication required to complete rental.');
    location.hash = 'signin';
    return;
  }
  p.paid = true;
  const targetStation = p.b || S.pick || best();
  const targetCat = p.cat || S.cat || 'std';
  const targetDur = (p.dur || S.dur || 1);
  const selectedBankId = (customCmd && customCmd.bank_id) ? customCmd.bank_id : null;

  const currentRate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const amountPaise = Math.round(targetDur * currentRate * 100);
  const rentalId = (customCmd && customCmd.rental_id) 
    ? customCmd.rental_id 
    : `LG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  S.rent = {
    id: rentalId,
    pin: String(100000 + ((Math.random() * 900000) | 0)),
    st: targetStation,
    cat: targetCat,
    bank_id: selectedBankId,
    dur: targetDur * 3600,
    started: 0,
    batt: 100,
    slot: null,
    done: false
  };

  if (targetStation.stock && targetStation.stock[targetCat] > 0) {
    targetStation.stock[targetCat]--;
  }

  const initialRecord = {
    id: rentalId,
    d: 'Today',
    st: targetStation.n,
    station_id: targetStation.id,
    bank_id: selectedBankId,
    cat: targetCat,
    bank_type_id: targetCat,
    h: `${targetDur} h`,
    duration_hours: targetDur,
    cost: `₹ ${Math.round(amountPaise / 100)}`,
    amount_paise: amountPaise,
    s: 'Paid',
    status: 'paid',
    created_at: new Date().toISOString()
  };

  if (!Array.isArray(S.hist)) S.hist = [];
  S.hist.unshift(initialRecord);
  if (typeof window.saveUserRentalHistory === 'function') {
    window.saveUserRentalHistory(initialRecord);
  }

  // Configure & insert rental into Supabase database table 'rentals'
  if (window.supabaseClient && S.u && !S.isDemo) {
    const targetUserId = (S.u.id && S.u.id.length > 20) ? S.u.id : null;
    const dbRecord = {
      id: rentalId,
      user_id: targetUserId,
      station_id: targetStation.id,
      bank_id: selectedBankId,
      bank_type_id: targetCat,
      duration_hours: targetDur,
      amount_paise: amountPaise,
      status: 'paid',
      created_at: new Date().toISOString()
    };

    (async () => {
      // Close/complete any prior open rentals for this user before inserting to satisfy idx_one_open_rental_per_user
      if (targetUserId) {
        try {
          const { error: patchErr } = await window.supabaseClient
            .from('rentals')
            .update({ status: 'completed' })
            .eq('user_id', targetUserId)
            .in('status', ['pending', 'active']);
          if (patchErr) console.warn('[Rentals DB] Notice completing pending/active rentals:', patchErr);
          else console.log('[Rentals DB] Prior open rentals completed for user:', targetUserId);
        } catch (closeErr) {
          console.warn('[Rentals DB] Notice closing prior open rentals:', closeErr);
        }

        try {
          await window.supabaseClient
            .from('rentals')
            .update({ status: 'cancelled' })
            .eq('user_id', targetUserId)
            .eq('status', 'paid');
        } catch (paidErr) {
          // Non-critical cleanup
        }
      }

      window.supabaseClient.from('rentals').upsert(dbRecord, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('[Rentals DB] Insert/Upsert error (table rentals):', error);
        else console.log('[Rentals DB] Configured & recorded rental in rentals table:', rentalId);
      }).catch(err => console.warn('[Rentals DB] Insert exception:', err));
    })();
  }

  toast('Payment received');
  if ($('#rb')) rr();
  else go(1);
};

// Auto-confirm countdown disabled per viva requirements: approval is triggered manually via [⚡ Simulate Bank Webhook Approval]

window.kiosk = () => {
  const r = S.rent;
  const kp = $('#kp'),
    ke = $('#ke');
  if (!kp || !ke) return;
  if (kp.value !== r.pin) return (ke.textContent = 'Wrong PIN.');
  r.slot = 1 + ((Math.random() * 8) | 0);
  r.started = Date.now();
  r.st.free = Math.max(0, r.st.free - 1);

  if (Array.isArray(S.hist)) {
    const hItem = S.hist.find(x => x.id === r.id);
    if (hItem) {
      hItem.s = 'Active';
      hItem.status = 'active';
      if (typeof window.saveUserRentalHistory === 'function') {
        window.saveUserRentalHistory(hItem);
      }
    }
  }

  if (window.supabaseClient && S.u && !S.isDemo) {
    window.supabaseClient.from('rentals').update({
      status: 'active',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', r.id).then(({ error }) => {
      if (error) console.warn('[Rentals DB] Update to active error:', error);
    }).catch(() => {});
  }

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

// Account-scoped database rental history functions
window.formatRentalRow = (r) => {
  const stObj = (window.ST && window.ST.find(s => s.id === (r.station_id || r.st))) || { n: r.st || r.station_id || 'Station' };
  const catObj = (window.CATS && window.CATS[r.bank_type_id || r.cat]) || { n: r.bank_type_id || r.cat || 'Standard Bank' };

  let dateStr = r.d;
  if (!dateStr && r.created_at) {
    try {
      dateStr = new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch (e) {
      dateStr = 'Recent';
    }
  }
  if (!dateStr) dateStr = 'Recent';

  let durStr = r.h;
  if (!durStr && r.duration_hours) {
    durStr = `${r.duration_hours} h`;
  } else if (!durStr && r.dur) {
    durStr = `${(r.dur / 3600).toFixed(1)} h`;
  }
  if (!durStr) durStr = '1 h';

  let costStr = r.cost;
  if (!costStr && typeof r.amount_paise === 'number') {
    costStr = `₹ ${(r.amount_paise / 100).toFixed(0)}`;
  }
  if (!costStr) costStr = '₹ 20';

  let statusStr = r.s;
  if (!statusStr && r.status) {
    statusStr = r.status.charAt(0).toUpperCase() + r.status.slice(1);
  }
  if (!statusStr) statusStr = 'Completed';

  return {
    id: r.id || ('LG-' + Math.floor(1000 + Math.random() * 9000)),
    d: dateStr,
    st: stObj.n || r.st || 'Library',
    station_id: r.station_id || stObj.id || 'library',
    cat: r.bank_type_id || r.cat || 'std',
    h: durStr,
    cost: costStr,
    s: statusStr,
    created_at: r.created_at || new Date().toISOString()
  };
};

window.loadUserRentalHistory = async () => {
  // If not logged in or guest, retain in-memory history or load last active account's history so sign out doesn't clear view
  if (!S.u || S.u.role === 'guest') {
    try {
      const last = localStorage.getItem('lg_last_hist');
      if (last) {
        const parsed = JSON.parse(last);
        if (Array.isArray(parsed) && parsed.length > 0) {
          S.hist = parsed.map(window.formatRentalRow);
          return S.hist;
        }
      }
    } catch (e) {}
    if (Array.isArray(S.hist) && S.hist.length > 0) return S.hist;
    return [];
  }

  const accountId = S.u.id || S.u.email || 'student';
  const storageKey = `lg_hist_${accountId}`;

  // 1. If Supabase is connected and this is not a mock demo session, query public.rentals for this account
  if (window.supabaseClient && !S.isDemo) {
    try {
      let query = window.supabaseClient
        .from('rentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (S.u.id && S.u.id.length > 20) {
        query = query.eq('user_id', S.u.id);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data) && data.length > 0) {
        S.hist = data.map(window.formatRentalRow);
        try {
          localStorage.setItem(storageKey, JSON.stringify(S.hist));
          localStorage.setItem('lg_last_hist', JSON.stringify(S.hist));
        } catch (e) {}
        console.log(`[Rentals DB] Fetched ${S.hist.length} real rentals from table 'rentals' for ${accountId}`);
        return S.hist;
      }
    } catch (err) {
      console.warn('[Rentals DB] Supabase fetch error:', err);
    }
  }

  // 2. Check account-scoped local cache
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        S.hist = parsed.map(window.formatRentalRow);
        try { localStorage.setItem('lg_last_hist', JSON.stringify(S.hist)); } catch (e) {}
        return S.hist;
      }
    }
  } catch (e) {}

  // 3. Initial authentic historical records seeded for student accounts
  // (Different accounts get their own personalized historical sessions)
  const isDemoStudent = S.u.email === 'student@rvce.edu.in' || accountId === 'demo-student-sim';
  const seededHistory = [
    {
      id: isDemoStudent ? 'LG-1041' : ('LG-' + (1030 + (accountId.length * 7) % 50)),
      d: '18 Nov',
      st: 'Library',
      station_id: 'library',
      cat: 'std',
      h: '1 h 05 m',
      cost: '₹ 15',
      s: 'Completed',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: isDemoStudent ? 'LG-1038' : ('LG-' + (1020 + (accountId.length * 3) % 50)),
      d: '15 Nov',
      st: 'Big Mingoes',
      station_id: 'mingoes',
      cat: 'lap',
      h: '0 h 40 m',
      cost: '₹ 20',
      s: 'Completed',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ];

  S.hist = seededHistory;
  try {
    localStorage.setItem(storageKey, JSON.stringify(seededHistory));
    localStorage.setItem('lg_last_hist', JSON.stringify(seededHistory));
  } catch (e) {}
  return S.hist;
};

window.saveUserRentalHistory = (rentalItem) => {
  const accountId = (S.u && (S.u.id || S.u.email)) ? (S.u.id || S.u.email) : 'student';
  const storageKey = `lg_hist_${accountId}`;

  let existing = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {}

  existing = existing.filter(x => x.id !== rentalItem.id);
  existing.unshift(rentalItem);

  try {
    localStorage.setItem(storageKey, JSON.stringify(existing));
    localStorage.setItem('lg_last_hist', JSON.stringify(existing));
  } catch (e) {}
};

window.retn = async () => {
  const r = S.rent;
  if (!r) return;
  const cost = window.computeRentalCost ? window.computeRentalCost(r) : { totalCost: 20 };
  const b = best(true);
  const durHours = +(el() / 3600).toFixed(1) || 0.5;
  const amountPaise = Math.round(cost.totalCost * 100);

  const completedItem = {
    id: r.id,
    d: 'Today',
    st: r.st.n,
    station_id: r.st.id,
    cat: r.cat,
    bank_type_id: r.cat,
    h: fmt(el()).slice(0, 5).replace(':', ' h ') + ' m',
    duration_hours: durHours,
    cost: `₹ ${cost.totalCost}`,
    amount_paise: amountPaise,
    s: 'Completed',
    status: 'completed',
    created_at: new Date().toISOString()
  };

  if (!Array.isArray(S.hist)) S.hist = [];
  const exIdx = S.hist.findIndex(x => x.id === r.id);
  if (exIdx !== -1) {
    S.hist[exIdx] = completedItem;
  } else {
    S.hist.unshift(completedItem);
  }
  if (typeof window.saveUserRentalHistory === 'function') {
    window.saveUserRentalHistory(completedItem);
  }

  S.pay = null;
  b.free = Math.max(0, b.free - 1);
  b.stock[r.cat]++;
  S.rent = null;
  toast(`Returned at ${b.n}. Total billed: ₹${cost.totalCost}. Thanks for using solar power.`);
  go(1);

  // Sync completed state to Supabase table 'rentals'
  if (window.supabaseClient && S.u && !S.isDemo) {
    try {
      await window.supabaseClient.from('rentals').update({
        status: 'completed',
        returned_at: new Date().toISOString(),
        return_station_id: b.id,
        duration_hours: durHours,
        amount_paise: amountPaise,
        updated_at: new Date().toISOString()
      }).eq('id', r.id);
      console.log('[Rentals DB] Updated rental to completed in rentals table:', r.id);
    } catch (e) {
      console.warn('[Rentals DB] Supabase update completed error:', e);
    }
  }
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

// ============================================================
// SUPABASE REALTIME SUBSCRIPTION FOR LIVE RENTAL UPDATES
// ============================================================
window.initRentalsRealtime = () => {
  if (!window.supabaseClient) {
    setTimeout(window.initRentalsRealtime, 800);
    return;
  }
  if (window._rentalsRealtimeSubscribed) return;
  window._rentalsRealtimeSubscribed = true;

  try {
    const channel = window.supabaseClient
      .channel('public:rentals-kiosk-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rentals' },
        (payload) => {
          console.log('[Supabase Realtime] Event on rentals table:', payload);
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new;
            toast(`⚡ Hardware Kiosk Confirmed: Bank Taken [${(newRow.bank_id || '').substring(0, 8)}]`);
          }
          if (typeof window.loadUserRentalHistory === 'function') {
            window.loadUserRentalHistory().then(() => {
              const currentHash = location.hash.slice(1).split('?')[0];
              if (currentHash === 'app-rentals' || currentHash === 'app-home') {
                go(1);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] rentals channel status:', status);
      });
    window._rentalsRealtimeChannel = channel;
  } catch (err) {
    console.warn('[Supabase Realtime] Initialization warning:', err);
  }
};

// Initialize Supabase Realtime on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initRentalsRealtime);
  } else {
    setTimeout(window.initRentalsRealtime, 500);
  }
}
