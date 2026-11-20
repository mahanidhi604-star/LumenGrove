// js/admin.js - DataV Aerospace Telemetry Command Center for Super Admin & Field Technician
// Full-bleed cyber telemetry mission control with rotating 3D wireframe globe, station inspection HUD,
// customer complaints resolution hub, and 8-bay hardware diagnostics.

window.bill = () => {
  const bl = $('#bl') || document.getElementById('bl');
  const rate = (window.PR && window.PR.rate) ? Number(window.PR.rate) : 10;
  if (bl) bl.textContent = `₹ ${rate * 2}`;
};

// Immediate DOM Synchronizer for Public Portal & Student Bento Hub
window.updatePricingDom = () => {
  const rate = (window.PR && window.PR.rate !== undefined && window.PR.rate !== '') 
    ? Number(window.PR.rate) 
    : ((typeof PR !== 'undefined' && PR.rate) ? Number(PR.rate) : 10);
  const grace = (window.PR && window.PR.grace !== undefined && window.PR.grace !== '') 
    ? Number(window.PR.grace) 
    : ((typeof PR !== 'undefined' && PR.grace) ? Number(PR.grace) : 15);
  const dur = (window.S && window.S.dur) ? Number(window.S.dur) : 1;
  const est = (dur * rate).toFixed(0);

  // 1. Update Rate Badge on #app-home
  const rb = document.getElementById('rate-badge');
  if (rb) rb.textContent = `₹ ${rate} / hr`;

  // 2. Update Estimated Cost on #app-home duration card
  const de = document.getElementById('d-est');
  if (de) de.textContent = `₹ ${est}`;

  // 3. Update Rate & Grace info text on #app-home duration card
  const ri = document.getElementById('rate-info-text');
  if (ri) ri.textContent = `Rate: ₹ ${rate} per hour · Grace period ${grace} min`;

  // 4. Update Checkout Preview card on #app-home if present
  const cp = document.getElementById('checkout-est-cost');
  if (cp) cp.textContent = `₹ ${est}`;

  // 5. Update Admin billing preview if present
  if (typeof window.bill === 'function') window.bill();
};

// Listen for cross-tab storage updates from admin
window.addEventListener('storage', e => {
  if (e.key === 'lg_pricing_override' && e.newValue) {
    try {
      const p = JSON.parse(e.newValue);
      if (p.rate !== undefined) {
        if (typeof PR !== 'undefined') PR.rate = Number(p.rate);
        if (window.PR) window.PR.rate = Number(p.rate);
      }
      if (p.grace !== undefined) {
        if (typeof PR !== 'undefined') PR.grace = Number(p.grace);
        if (window.PR) window.PR.grace = Number(p.grace);
      }
      if (p.late !== undefined) {
        if (typeof PR !== 'undefined') PR.late = Number(p.late);
        if (window.PR) window.PR.late = Number(p.late);
      }
      if (p.dep !== undefined) {
        if (typeof PR !== 'undefined') PR.dep = Number(p.dep);
        if (window.PR) window.PR.dep = Number(p.dep);
      }
      window.updatePricingDom();
    } catch (err) {}
  }
});

window.exportLogsCsv = () => {
  const headers = ['Timestamp', 'Station', 'Event_Type', 'Severity', 'Details'];
  const rows = [
    [new Date(Date.now() - 3600000).toISOString(), 'Library', 'SOLAR_SYNC', 'INFO', 'Solar array generating 312W'],
    [new Date(Date.now() - 2800000).toISOString(), 'Big Mingoes', 'VIBRATION_ALERT', 'WARN', 'Vibration detected at slot 4'],
    [new Date(Date.now() - 1900000).toISOString(), 'Library', 'RETURN_CHECK', 'WARN', 'Return check retry succeeded slot 2'],
    [new Date(Date.now() - 900000).toISOString(), 'M.M Foods', 'TEMP_THRESHOLD', 'NOTICE', 'Panel temperature reached 41.2C'],
    [new Date().toISOString(), 'Cauvery', 'SLOT_OCCUPIED', 'INFO', 'Power bank rented pin verified']
  ];
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(',')).join('\n')].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `lumengrove_telemetry_audit_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('Telemetry logs exported to CSV');
};

// Two-way Supabase Synchronizers
window.commitPricingToSupabase = async () => {
  const rate = Number(window.PR ? window.PR.rate : 10) || 10;
  const grace = Number(window.PR ? window.PR.grace : 15) || 15;
  const late = Number(window.PR ? window.PR.late : 20) || 20;
  const dep = Number(window.PR ? window.PR.dep : 0) || 0;
  const now = Date.now();

  const policy = { rate, grace, late, dep, timestamp: now };

  // Ensure both window.PR and lexical PR are synchronized
  if (window.PR) Object.assign(window.PR, policy);
  if (typeof PR !== 'undefined') Object.assign(PR, policy);

  // Persist locally for immediate reactive update across entire app
  localStorage.setItem('lg_pricing_override', JSON.stringify(policy));

  // Write live policy to Supabase pricing_rules table
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.from('pricing_rules').insert({
        hourly_rate_paise: Math.round(rate * 100),
        grace_period_mins: grace,
        late_fee_per_hour_paise: Math.round(late * 100),
        deposit_paise: Math.round(dep * 100),
        is_active: true
      }).select();
      if (!error && data && data[0]) {
        policy.timestamp = new Date(data[0].created_at).getTime();
        localStorage.setItem('lg_pricing_override', JSON.stringify(policy));
        console.log('LumenGrove: Pricing policy successfully written to Supabase:', data);
      }
    } catch (e) {
      console.warn('Supabase pricing write notice:', e);
    }
  }

  // Immediately propagate to student bento hub (#app-home) and toast
  window.updatePricingDom();
  toast(`⚡ Pricing Policy Committed: ₹${rate}/hr · Synced to Supabase & Live Fleet!`);
};

window.adjustPricing = (key, delta) => {
  if (!window.PR) window.PR = (typeof PR !== 'undefined') ? PR : { rate: 10, grace: 15, late: 20, dep: 0 };
  let cur = Number(window.PR[key]) || 0;
  cur = Math.max(0, cur + delta);
  window.PR[key] = cur;
  if (typeof PR !== 'undefined') PR[key] = cur;
  window.PR.timestamp = Date.now();
  if (typeof PR !== 'undefined') PR.timestamp = window.PR.timestamp;

  // Update digital displays
  const dispMap = {
    rate: `₹ ${window.PR.rate}`,
    grace: `${window.PR.grace} MIN`,
    late: `₹ ${window.PR.late}`,
    dep: `₹ ${window.PR.dep}`
  };
  const el = document.getElementById(`disp-${key}`);
  if (el) el.textContent = dispMap[key];

  // Immediately propagate to student bento hub (#app-home)
  window.updatePricingDom();
};

window.tg = id => {
  const s = ST.find(x => x.id == id);
  if (s) {
    s.ok = !s.ok;
    toast(`Station ${s.n} set to ${s.ok ? 'ONLINE' : 'MAINTENANCE MODE'}`);

    // Sync station status to Supabase stations table
    if (window.supabaseClient) {
      window.supabaseClient.from('stations')
        .update({ is_online: s.ok, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(({ error }) => {
          if (!error) console.log(`Station ${id} state synced to Supabase`);
        }).catch(() => {});
    }
  }
  const statusElem = $(`#stn-status-${id}`);
  if (statusElem) {
    statusElem.textContent = s.ok ? 'ONLINE' : 'OFFLINE';
    statusElem.className = `datav-status-tag ${s.ok ? 'online' : 'offline'}`;
  }
  const inspectStatus = $('#inspect-stn-status');
  if (inspectStatus && s) {
    inspectStatus.textContent = s.ok ? 'ONLINE' : 'OFFLINE';
    inspectStatus.className = `datav-status-tag ${s.ok ? 'online' : 'offline'}`;
  }
};

const getStn = id => (typeof ST !== 'undefined' ? ST : (window.ST || [])).find(x => x.id === id) || (typeof ST !== 'undefined' ? ST[0] : (window.ST?.[0] || { id, n: 'Central Library', batt: 82, temp: 28.4, slots: 8, free: 6 }));

window.initStationBays = (stnId) => {
  window.S.bayStates = window.S.bayStates || {};
  if (!window.S.bayStates[stnId]) {
    const s = getStn(stnId);
    const defaultTypes = ['fast', 'wireless', 'standard', 'standard', 'empty', 'empty', 'fast', 'laptop'];
    window.S.bayStates[stnId] = defaultTypes.map((type, idx) => {
      const slotNum = idx + 1;
      const isEmpty = type === 'empty';
      const soc = isEmpty ? 0 : Math.min(100, Math.max(45, 100 - (idx * 9) + (((s.batt || 80) * 0.1) | 0)));
      const volt = isEmpty ? '0.00' : (3.7 + (soc / 100) * 0.5).toFixed(2);
      const temp = isEmpty ? '26.5' : (29 + (idx * 1.2) + (((s.temp || 28) * 0.1))).toFixed(1);
      const status = isEmpty ? 'AVAILABLE' : (soc < 95 ? 'CHARGING' : 'READY');
      return {
        slotNum,
        type,
        isEmpty,
        soc,
        volt,
        temp,
        status,
        isWarning: !isEmpty && Number(temp) > 35,
        isUnlocking: false,
        isRestocking: false,
        isRecalibrating: false
      };
    });
  }
  return window.S.bayStates[stnId];
};

window.techUnlockSlot = (stnId, slotNum) => {
  const s = getStn(stnId);
  const bays = window.initStationBays(stnId);
  const bay = bays.find(b => b.slotNum === slotNum);
  if (!bay) return;

  const card = document.getElementById(`bay-card-${stnId}-${slotNum}`);
  if (card) {
    card.classList.add('slot-unlocking');
    const pill = card.querySelector('.slot-status-pill');
    if (pill) {
      pill.textContent = '⚡ UNLOCKED';
      pill.className = 'slot-status-pill rdy';
      pill.style.background = '#34d399';
      pill.style.color = '#021626';
    }
  }

  toast(`⚡ Solenoid Bay #${slotNum} RELEASED at ${s.n}! Pin disengaged.`);

  setTimeout(() => {
    // Option A: Transitions to AVAILABLE (EMPTY) with Restock button
    bay.type = 'empty';
    bay.isEmpty = true;
    bay.soc = 0;
    bay.volt = '0.00';
    bay.temp = '26.0';
    bay.status = 'AVAILABLE';
    bay.isWarning = false;
    bay.isUnlocking = false;

    // Increment station free count
    s.free = Math.min(s.slots, (s.free || 0) + 1);

    // Update inspection HUD & fleet table
    const hud = document.getElementById('datav-station-inspection-hud');
    if (hud && typeof renderStationInspectionCard === 'function') {
      hud.innerHTML = renderStationInspectionCard(stnId);
    }

    const row = document.getElementById(`stn-row-${stnId}`);
    if (row) {
      const freeCell = row.querySelectorAll('td')[1];
      if (freeCell) freeCell.innerHTML = `<b>${s.free}/${s.slots}</b>`;
    }

    // Refresh bays container
    const techBayContainer = document.getElementById('datav-tech-bays-container');
    if (techBayContainer) {
      techBayContainer.innerHTML = renderTechnicianSlotMatrix(stnId);
    }

    // Sync to Supabase slots table if available
    if (window.supabaseClient) {
      window.supabaseClient.from('slots')
        .update({ status: 'out', updated_at: new Date().toISOString() })
        .eq('station_id', stnId)
        .eq('slot_number', slotNum)
        .then(() => {}).catch(() => {});
    }
  }, 1200);
};

window.techRestockSlot = (stnId, slotNum) => {
  const s = getStn(stnId);
  const bays = window.initStationBays(stnId);
  const bay = bays.find(b => b.slotNum === slotNum);
  if (!bay) return;

  const card = document.getElementById(`bay-card-${stnId}-${slotNum}`);
  if (card) {
    card.classList.add('slot-restocking');
    const pill = card.querySelector('.slot-status-pill');
    if (pill) {
      pill.textContent = '📥 LATCHING...';
      pill.className = 'slot-status-pill chg';
      pill.style.background = '#00e5ff';
      pill.style.color = '#021626';
    }
  }

  toast(`📥 Restock detected at Bay #${slotNum}: Solenoid auto-latched & RFID verified.`);

  setTimeout(() => {
    bay.isEmpty = false;
    bay.type = slotNum === 8 ? 'laptop' : (slotNum === 2 ? 'wireless' : 'fast');
    bay.soc = 98;
    bay.volt = '4.18';
    bay.temp = '28.2';
    bay.status = 'READY';
    bay.isWarning = false;
    bay.isRestocking = false;

    // Decrement station free count
    s.free = Math.max(0, (s.free || 1) - 1);

    // Update inspection HUD & fleet table
    const hud = document.getElementById('datav-station-inspection-hud');
    if (hud && typeof renderStationInspectionCard === 'function') {
      hud.innerHTML = renderStationInspectionCard(stnId);
    }

    const row = document.getElementById(`stn-row-${stnId}`);
    if (row) {
      const freeCell = row.querySelectorAll('td')[1];
      if (freeCell) freeCell.innerHTML = `<b>${s.free}/${s.slots}</b>`;
    }

    // Refresh bays container
    const techBayContainer = document.getElementById('datav-tech-bays-container');
    if (techBayContainer) {
      techBayContainer.innerHTML = renderTechnicianSlotMatrix(stnId);
    }

    // Sync to Supabase slots table if available
    if (window.supabaseClient) {
      window.supabaseClient.from('slots')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('station_id', stnId)
        .eq('slot_number', slotNum)
        .then(() => {}).catch(() => {});
    }
  }, 1100);
};

window.techClearJam = (stnId, slotNum) => {
  const s = getStn(stnId);
  const bays = window.initStationBays(stnId);
  const bay = bays.find(b => b.slotNum === slotNum);
  if (!bay) return;

  const card = document.getElementById(`bay-card-${stnId}-${slotNum}`);
  if (card) {
    card.classList.add('slot-recalibrating');
    const pill = card.querySelector('.slot-status-pill');
    if (pill) {
      pill.textContent = '🔄 RECALIBRATING...';
      pill.className = 'slot-status-pill stby';
      pill.style.background = '#f08a24';
      pill.style.color = '#021626';
    }
  }

  toast(`🔄 Bay #${slotNum} at ${s.n} recalibrated. Return lock cleared & sensor normalized.`);

  setTimeout(() => {
    bay.isWarning = false;
    bay.temp = '28.5';
    bay.status = 'READY';
    bay.isRecalibrating = false;

    const techBayContainer = document.getElementById('datav-tech-bays-container');
    if (techBayContainer) {
      techBayContainer.innerHTML = renderTechnicianSlotMatrix(stnId);
    }

    if (window.supabaseClient) {
      window.supabaseClient.from('slots')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .eq('station_id', stnId)
        .eq('slot_number', slotNum)
        .then(() => {}).catch(() => {});
    }
  }, 900);
};

window.techCalibrate = (stnId) => {
  const s = getStn(stnId);
  toast(`🩺 Initiating 8-bay sequential solenoid & ADC bus ping sweep at ${s.n}...`);

  // Sequential ping sweep across 8 bays
  for (let slotNum = 1; slotNum <= 8; slotNum++) {
    setTimeout(() => {
      const card = document.getElementById(`bay-card-${stnId}-${slotNum}`);
      if (card) {
        card.classList.add('slot-pinging');
        setTimeout(() => card.classList.remove('slot-pinging'), 320);
      }
    }, (slotNum - 1) * 160);
  }

  setTimeout(() => {
    toast(`🩺 Station ${s.n}: 8/8 bay solenoids & ADC sensors verified nominal. MPPT lock 100%.`);
  }, 8 * 160 + 200);
};

// Customer Complaints Hub State & Actions
let cachedComplaints = [];
try {
  cachedComplaints = JSON.parse(localStorage.getItem('lg_complaints_cache') || '[]');
} catch (e) {}

const defaultComplaints = [
  {
    id: 'CMP-1048',
    student: 'Aarav Sharma',
    email: 'aarav.sharma@rvce.edu.in',
    phone: '+919876543210',
    station: 'Central Library',
    stationId: 'library',
    slotNum: 2,
    issue: 'Lock stuck after payment',
    category: 'Lock Stuck',
    time: '12 mins ago',
    status: 'OPEN',
    details: 'QR payment of ₹20 completed successfully via UPI, but slot 2 solenoid did not release the power bank.'
  },
  {
    id: 'CMP-1047',
    student: 'Priya Patel',
    email: 'priya.patel@rvce.edu.in',
    phone: '+919812345678',
    station: 'M.M Foods',
    stationId: 'mm',
    slotNum: 4,
    issue: 'Power bank not charging device',
    category: 'Bank Fault',
    time: '45 mins ago',
    status: 'INVESTIGATING',
    details: 'Grove Fast power bank output port seems loose. Disconnects charging repeatedly.'
  },
  {
    id: 'CMP-1045',
    student: 'Rohan Deshmukh',
    email: 'rohan.d@rvce.edu.in',
    phone: '+919988776655',
    station: 'Big Mingoes',
    stationId: 'mingoes',
    slotNum: 1,
    issue: 'Charged twice during payment',
    category: 'Wrong Amount',
    time: '2 hours ago',
    status: 'RESOLVED',
    details: 'Transaction duplicated on Google Pay. Transaction reference LG-TX-8829.'
  },
  {
    id: 'CMP-1042',
    student: 'Sneha Kulkarni',
    email: 'sneha.k@rvce.edu.in',
    phone: '+919765432109',
    station: 'Cauvery Hostel',
    stationId: 'cauvery',
    slotNum: 6,
    issue: 'Station touchscreen unresponsive',
    category: 'Kiosk Offline',
    time: 'Yesterday',
    status: 'RESOLVED',
    details: 'Touchscreen digitizer froze while typing PIN. Kiosk soft reboot performed.'
  }
];

if (!window.S.complaints || window.S.complaints.length === 0) {
  const existingIds = new Set(cachedComplaints.map(c => c.id));
  window.S.complaints = [...cachedComplaints, ...defaultComplaints.filter(c => !existingIds.has(c.id))];
}
window.S.complaintFilter = window.S.complaintFilter || 'ALL';
window.S.complaintSearch = window.S.complaintSearch || '';
window.S.complaintStation = window.S.complaintStation || 'ALL';
window.S.adminTab = window.S.adminTab || 'telemetry';
window.S.inspectedStation = window.S.inspectedStation || 'library';

window.rerAdmin = () => {
  const v = $('#v');
  if (v && location.hash === '#admin') {
    v.innerHTML = admin();
  }
};

window.switchAdminTab = (tab) => {
  window.S.adminTab = tab;
  window.rerAdmin();
};

window.resolveComplaint = (id) => {
  const item = (window.S.complaints || []).find(c => c.id === id);
  if (item) {
    item.status = 'RESOLVED';
    item.isNew = false;
    localStorage.setItem('lg_complaints_cache', JSON.stringify(window.S.complaints));
    toast(`Ticket ${id} marked as RESOLVED`);
    if (window.supabaseClient) {
      window.supabaseClient.from('complaints')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {}).catch(() => {});
    }
    window.rerAdmin();
  }
};

window.dispatchTech = (id) => {
  const item = (window.S.complaints || []).find(c => c.id === id);
  if (item) {
    item.status = 'INVESTIGATING';
    item.isNew = false;
    localStorage.setItem('lg_complaints_cache', JSON.stringify(window.S.complaints));
    toast(`Field Technician dispatched to ${item.station} for ${id}`);
    if (window.supabaseClient) {
      window.supabaseClient.from('complaints')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(() => {}).catch(() => {});
    }
    window.rerAdmin();
  }
};

window.filterComplaints = (filterKey) => {
  window.S.complaintFilter = filterKey;
  window.rerAdmin();
};

window.filterComplaintsStation = (stnId) => {
  window.S.complaintStation = stnId;
  window.rerAdmin();
};

window.searchComplaints = (query) => {
  window.S.complaintSearch = (query || '').toLowerCase();
  const listContainer = document.getElementById('datav-complaints-list');
  if (listContainer) {
    listContainer.innerHTML = renderComplaintsCards();
  }
};

// Stationary RVCE Campus Microgrid Radar Canvas Engine
let radarAnimationId = null;
let hoveredStationId = null;

// RVCE Campus Station Nodes (Stationary 2D Tactical Vector Radar Coordinates)
const stationNodes = [
  { id: 'library', name: 'LIB', fullName: 'Central Library', relX: -85, relY: -45, ok: true, dist: '85m', az: '330°' },
  { id: 'mm', name: 'MM', fullName: 'M.M Foods', relX: 105, relY: -75, ok: true, dist: '128m', az: '045°' },
  { id: 'mingoes', name: 'MING', fullName: 'Big Mingoes', relX: -135, relY: 80, ok: true, dist: '155m', az: '215°' },
  { id: 'cauvery', name: 'CAUV', fullName: 'Cauvery Hostel', relX: 145, relY: 65, ok: true, dist: '160m', az: '125°' }
];

window.focusStationOnGlobe = (stnId) => {
  const node = stationNodes.find(n => n.id === stnId);
  if (!node) return;

  window.S.inspectedStation = stnId;

  // Update inspection HUD card below the radar map
  const hudContainer = document.getElementById('datav-station-inspection-hud');
  if (hudContainer) {
    hudContainer.innerHTML = renderStationInspectionCard(stnId);
  }

  // Update active quick-picker pill styling
  document.querySelectorAll('.globe-stn-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.stn === stnId);
  });

  // Automatically switch Technician 8-Bay Hardware Diagnostics Matrix below
  const techBayContainer = document.getElementById('datav-tech-bays-container');
  if (techBayContainer) {
    techBayContainer.innerHTML = renderTechnicianSlotMatrix(stnId);
  }

  // Highlight corresponding row in Campus Stations Fleet Status table
  document.querySelectorAll('.datav-fleet-table tr').forEach(r => r.classList.remove('stn-selected-row'));
  const row = document.getElementById(`stn-row-${stnId}`);
  if (row) row.classList.add('stn-selected-row');

  // Highlight target button in fleet table
  document.querySelectorAll('.btn-target').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.stn === stnId);
    if (btn.dataset.stn === stnId) {
      btn.innerHTML = 'LOCKED 🎯';
    } else {
      btn.innerHTML = 'TARGET 🎯';
    }
  });

  const s = ST.find(x => x.id === stnId) || ST[0];
  toast(`Locked focus to ${s.n} · 8-Bay diagnostics active`);
};

window.resetGlobeOrbit = () => {
  window.S.inspectedStation = null;
  document.querySelectorAll('.globe-stn-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.stn === 'all');
  });
  const hudContainer = document.getElementById('datav-station-inspection-hud');
  if (hudContainer) {
    hudContainer.innerHTML = renderStationInspectionCard('library');
  }
  document.querySelectorAll('.datav-fleet-table tr').forEach(r => r.classList.remove('stn-selected-row'));
  document.querySelectorAll('.btn-target').forEach(btn => {
    btn.classList.remove('active');
    btn.innerHTML = 'TARGET 🎯';
  });
  toast('Campus radar scan: All stations monitored');
};

// Aliased for backward compatibility with toggle buttons
window.toggleGlobeSpin = () => {
  toast('Radar is stationary: Tactical campus grid locked');
};

window.initDatavGlobe = () => {
  const canvas = document.getElementById('datav-globe-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Responsive DPI scaling
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || 460;
  const height = rect.height || 420;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.42;

  // Click handler to select station directly on map
  canvas.onclick = e => {
    const cRect = canvas.getBoundingClientRect();
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;

    for (const node of stationNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        const d = Math.hypot(clickX - node.x, clickY - node.y);
        if (d <= 32) {
          window.focusStationOnGlobe(node.id);
          return;
        }
      }
    }
  };

  // Hover detection for pointer cursor
  canvas.onmousemove = e => {
    const cRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - cRect.left;
    const mouseY = e.clientY - cRect.top;

    let nearNode = false;
    hoveredStationId = null;
    for (const node of stationNodes) {
      if (node.x !== undefined && node.y !== undefined) {
        if (Math.hypot(mouseX - node.x, mouseY - node.y) <= 32) {
          nearNode = true;
          hoveredStationId = node.id;
          break;
        }
      }
    }
    canvas.style.cursor = nearNode ? 'pointer' : 'crosshair';
  };

  canvas.onmouseleave = () => {
    hoveredStationId = null;
  };

  let tick = 0;

  function render() {
    if (!document.getElementById('datav-globe-canvas')) {
      if (radarAnimationId) cancelAnimationFrame(radarAnimationId);
      return;
    }

    tick++;
    ctx.clearRect(0, 0, width, height);

    // Dynamic node coordinate projection based on canvas dimensions
    const scale = Math.min(width / 440, height / 400);
    stationNodes.forEach(node => {
      node.x = cx + node.relX * scale;
      node.y = cy + node.relY * scale;
    });

    // 1. Radar Background Radial Gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, R * 1.15);
    bgGrad.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
    bgGrad.addColorStop(0.65, 'rgba(2, 14, 28, 0.45)');
    bgGrad.addColorStop(1, 'rgba(2, 8, 16, 0.95)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
    ctx.fill();

    // 2. Concentric Tactical Range Rings (50m, 100m, 150m, 200m)
    const rings = [0.25, 0.5, 0.75, 1.0];
    const ringLabels = ['50m', '100m', '150m', '200m'];
    rings.forEach((ratio, idx) => {
      const radius = R * ratio;
      ctx.save();
      ctx.strokeStyle = idx === rings.length - 1 ? 'rgba(0, 229, 255, 0.45)' : 'rgba(0, 229, 255, 0.18)';
      ctx.lineWidth = idx === rings.length - 1 ? 1.5 : 1;
      ctx.setLineDash(idx === rings.length - 1 ? [] : [3, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Range distance label along North-East diagonal
      ctx.font = '700 8px "Barlow Condensed", monospace';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.fillText(ringLabels[idx], cx + radius * 0.707 + 3, cy - radius * 0.707 - 2);
      ctx.restore();
    });

    // 3. Cardinal Crosshairs & Azimuth Bearing Marks
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Horizontal crosshair
    ctx.beginPath();
    ctx.moveTo(cx - R * 1.1, cy);
    ctx.lineTo(cx + R * 1.1, cy);
    ctx.stroke();
    // Vertical crosshair
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 1.1);
    ctx.lineTo(cx, cy + R * 1.1);
    ctx.stroke();
    ctx.restore();

    // Azimuth cardinal text tags
    ctx.save();
    ctx.font = '700 9px "Barlow Condensed", monospace';
    ctx.fillStyle = '#00e5ff';
    ctx.textAlign = 'center';
    ctx.fillText('000° [N] RVCE GATE', cx, cy - R * 1.02);
    ctx.fillText('180° [S] HOSTEL ZONE', cx, cy + R * 1.08);
    ctx.textAlign = 'left';
    ctx.fillText('090° [E]', cx + R * 1.02, cy + 3);
    ctx.textAlign = 'right';
    ctx.fillText('270° [W]', cx - R * 1.02, cy + 3);
    ctx.restore();

    // 4. Subtle Campus Vector Walkways / Boundaries
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 160 * scale, cy - 110 * scale, 320 * scale, 220 * scale);
    ctx.beginPath();
    ctx.moveTo(cx - 160 * scale, cy);
    ctx.lineTo(cx - 40 * scale, cy);
    ctx.lineTo(cx + 40 * scale, cy);
    ctx.lineTo(cx + 160 * scale, cy);
    ctx.stroke();
    ctx.restore();

    // 5. Central Inverter Hub Substation (Center of Microgrid)
    ctx.save();
    ctx.fillStyle = '#021626';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '700 8px "Barlow Condensed", monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('RVCE SOLAR SUBSTATION #01', cx, cy + 18);
    ctx.restore();

    // 6. Microgrid Power Conduits & Traveling Solar Photons
    const conduits = [
      [ { x: cx, y: cy }, stationNodes[0] ],
      [ { x: cx, y: cy }, stationNodes[1] ],
      [ { x: cx, y: cy }, stationNodes[2] ],
      [ { x: cx, y: cy }, stationNodes[3] ],
      [ stationNodes[0], stationNodes[1] ],
      [ stationNodes[1], stationNodes[3] ],
      [ stationNodes[3], stationNodes[2] ],
      [ stationNodes[2], stationNodes[0] ]
    ];

    conduits.forEach(([p1, p2], cIdx) => {
      ctx.save();
      ctx.strokeStyle = cIdx < 4 ? 'rgba(0, 229, 255, 0.35)' : 'rgba(0, 229, 255, 0.16)';
      ctx.lineWidth = cIdx < 4 ? 1.4 : 1;
      ctx.setLineDash(cIdx < 4 ? [] : [2, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      // Traveling Solar Photon Packet along conduit
      const t = (tick * 0.012 + cIdx * 0.16) % 1;
      const px = p1.x + (p2.x - p1.x) * t;
      const py = p1.y + (p2.y - p1.y) * t;

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 7. Render Station Nodes & Selection Telemetry
    stationNodes.forEach(node => {
      const isSelected = window.S.inspectedStation === node.id;
      const isHovered = hoveredStationId === node.id;
      const stnData = (window.ST || []).find(s => s.id === node.id) || { n: node.fullName, solar: 280, free: 6, slots: 8 };

      ctx.save();

      // Outer radar pulse wave (sonar beacon)
      const pingR = 10 + (tick % 50) * 0.45;
      const pingAlpha = Math.max(0, 1 - (tick % 50) / 50);
      ctx.strokeStyle = isSelected ? `rgba(240, 138, 36, ${pingAlpha})` : `rgba(0, 229, 255, ${pingAlpha * 0.7})`;
      ctx.lineWidth = isSelected ? 2 : 1.2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? pingR + 4 : pingR, 0, Math.PI * 2);
      ctx.stroke();

      // Node background disc
      ctx.fillStyle = isSelected ? 'rgba(38, 20, 4, 0.9)' : 'rgba(3, 20, 36, 0.9)';
      ctx.strokeStyle = isSelected ? '#f08a24' : (isHovered ? '#ffffff' : '#00e5ff');
      ctx.lineWidth = isSelected ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Center LED glowing core
      ctx.fillStyle = isSelected ? '#f08a24' : '#00e5ff';
      ctx.shadowColor = isSelected ? '#f08a24' : '#00e5ff';
      ctx.shadowBlur = isSelected ? 16 : 10;
      ctx.beginPath();
      ctx.arc(node.x, node.y, isSelected ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Station Acronym Box Badge (Top)
      const badgeW = 34, badgeH = 14;
      const badgeX = node.x - badgeW / 2;
      const badgeY = node.y - 25;
      ctx.fillStyle = isSelected ? 'rgba(240, 138, 36, 0.2)' : 'rgba(0, 229, 255, 0.15)';
      ctx.strokeStyle = isSelected ? '#f08a24' : '#00e5ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

      ctx.font = '700 9px "Barlow Condensed", monospace';
      ctx.fillStyle = isSelected ? '#ffb966' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, badgeY + 10);

      // Station Name & Telemetry (Bottom)
      ctx.font = '700 9.5px "Barlow Condensed", monospace';
      ctx.fillStyle = isSelected ? '#ffddaa' : '#e2f1fd';
      ctx.fillText(node.fullName, node.x, node.y + 19);

      ctx.font = '600 8.5px "Barlow Condensed", monospace';
      ctx.fillStyle = isSelected ? '#f08a24' : 'rgba(0, 229, 255, 0.85)';
      ctx.fillText(`${stnData.solar | 0}W · ${stnData.free}/${stnData.slots} FREE`, node.x, node.y + 29);

      // If Inspected/Selected: Draw Tactical Targeting Brackets & Azimuth Crosshairs
      if (isSelected) {
        ctx.strokeStyle = '#f08a24';
        ctx.lineWidth = 1.8;
        const bSize = 14;
        const bOff = 12;

        // Top-Left bracket
        ctx.beginPath();
        ctx.moveTo(node.x - bOff - bSize, node.y - bOff);
        ctx.lineTo(node.x - bOff - bSize, node.y - bOff - bSize);
        ctx.lineTo(node.x - bOff, node.y - bOff - bSize);
        ctx.stroke();

        // Top-Right bracket
        ctx.beginPath();
        ctx.moveTo(node.x + bOff + bSize, node.y - bOff);
        ctx.lineTo(node.x + bOff + bSize, node.y - bOff - bSize);
        ctx.lineTo(node.x + bOff, node.y - bOff - bSize);
        ctx.stroke();

        // Bottom-Left bracket
        ctx.beginPath();
        ctx.moveTo(node.x - bOff - bSize, node.y + bOff);
        ctx.lineTo(node.x - bOff - bSize, node.y + bOff + bSize);
        ctx.lineTo(node.x - bOff, node.y + bOff + bSize);
        ctx.stroke();

        // Bottom-Right bracket
        ctx.beginPath();
        ctx.moveTo(node.x + bOff + bSize, node.y + bOff);
        ctx.lineTo(node.x + bOff + bSize, node.y + bOff + bSize);
        ctx.lineTo(node.x + bOff, node.y + bOff + bSize);
        ctx.stroke();

        // Rotating targeting lock reticle ring
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#f08a24';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, tick * 0.04, tick * 0.04 + Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();

        // Target Lock Tag
        ctx.font = '700 8px "Barlow Condensed", monospace';
        ctx.fillStyle = '#f08a24';
        ctx.fillText(`TARGET LOCKED // ${node.dist}`, node.x, node.y - 30);
      }

      ctx.restore();
    });

    // 8. Outer Coordinate HUD Stamp
    ctx.save();
    ctx.font = '700 8.5px "Barlow Condensed", monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.fillText('STATIONARY RVCE RADAR // 4 ACTIVE STATIONS', 14, 20);
    ctx.fillText('CLICK ANY STATION ON MAP TO INSPECT 8 BAYS', 14, 32);
    ctx.textAlign = 'right';
    ctx.fillText('GRID: 12.9238°N 77.4987°E · ELEV 830M', width - 14, 20);
    ctx.fillText('SOLAR TRACKER: MPPT LOCKED', width - 14, 32);
    ctx.restore();

    radarAnimationId = requestAnimationFrame(render);
  }

  render();
};

window.startDatavClock = () => {
  const clockEl = document.getElementById('datav-live-clock');
  if (!clockEl) return;
  const update = () => {
    const el = document.getElementById('datav-live-clock');
    if (!el) return;
    const now = new Date();
    const utc = now.toUTCString().split(' ')[4];
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    el.textContent = `${utc}.${ms} UTC · IST ${now.toLocaleTimeString()}`;
  };
  update();
  setInterval(update, 85);
};

// Station Inspection HUD Card (rendered beneath globe when a station is clicked/inspected)
const renderStationInspectionCard = (stnId) => {
  const s = ST.find(x => x.id === stnId) || ST[0];
  return `
    <div class="datav-panel datav-inspect-card">
      <div class="datav-panel-header">
        <span class="datav-corner-bracket tl"></span>
        <span class="datav-corner-bracket tr"></span>
        <span class="datav-corner-bracket bl"></span>
        <span class="datav-corner-bracket br"></span>
        <div class="panel-title-row">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="datav-dot-pulse"></span>
            <span class="datav-panel-tag">INSPECTING STATION // ${s.n.toUpperCase()}</span>
          </div>
          <span id="inspect-stn-status" class="datav-status-tag ${s.ok ? 'online' : 'offline'}">${s.ok ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>
      <div class="inspect-body-grid">
        <div class="inspect-metric">
          <small>CURRENT SOLAR</small>
          <b style="color:#00e5ff">${s.solar | 0} W</b>
        </div>
        <div class="inspect-metric">
          <small>BATTERY SoC</small>
          <b style="color:#34d399">${s.batt | 0}%</b>
        </div>
        <div class="inspect-metric">
          <small>PANEL TEMP</small>
          <b style="${s.temp > 35 ? 'color:#f08a24' : ''}">${s.temp.toFixed(1)}°C</b>
        </div>
        <div class="inspect-metric">
          <small>FREE BAYS</small>
          <b>${s.free}/${s.slots}</b>
        </div>
      </div>
      <div class="inspect-stock-row">
        <span class="stock-item">Fast: <b>${s.stock.fast || 0}</b></span>
        <span class="stock-item">Wireless: <b>${s.stock.wireless || 0}</b></span>
        <span class="stock-item">Standard: <b>${s.stock.standard || 0}</b></span>
        <span class="stock-item">Laptop: <b>${s.stock.laptop || 0}</b></span>
      </div>
      <div class="inspect-actions-row">
        <button class="btn btn-sm g" onclick="tg('${s.id}')">Toggle Power</button>
        <button class="btn btn-sm g" onclick="techCalibrate('${s.id}')">Run Diagnostics</button>
        <button class="btn btn-sm" onclick="document.getElementById('datav-tech-bays-container')?.scrollIntoView({behavior:'smooth'})">Inspect 8 Bays ↓</button>
      </div>
    </div>
  `;
};

// SVG Area Wave Throughput Chart (24h Load & Solar Curve)
const renderWaveChart = () => {
  const w = 320, h = 90;
  const points = [
    [0, 80], [30, 78], [60, 72], [90, 55], [120, 35],
    [150, 18], [180, 12], [210, 25], [240, 48], [270, 68], [300, 76], [320, 82]
  ];
  const d = points.reduce((acc, [x, y], i) => (i === 0 ? `M${x},${y}` : `${acc} L${x},${y}`), '');
  const areaD = `${d} L${w},${h} L0,${h} Z`;

  return `
    <svg viewBox="0 0 ${w} ${h}" class="datav-wave-svg" aria-hidden="true">
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#00e5ff" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="25" x2="${w}" y2="25" stroke="rgba(0,229,255,0.12)" stroke-dasharray="2 3"/>
      <line x1="0" y1="55" x2="${w}" y2="55" stroke="rgba(0,229,255,0.12)" stroke-dasharray="2 3"/>
      <path d="${areaD}" fill="url(#waveGrad)"/>
      <path d="${d}" fill="none" stroke="#00e5ff" stroke-width="2"/>
      <circle cx="180" cy="12" r="3.5" fill="#ffffff" stroke="#00e5ff" stroke-width="2"/>
      <text x="180" y="8" font-size="8" fill="#00e5ff" font-family="'Barlow Condensed', monospace" text-anchor="middle" font-weight="700">PEAK 348W</text>
    </svg>`;
};

// Harmonic Frequency Wave Chart
const renderFrequencyWave = () => {
  const w = 320, h = 60;
  let p1 = 'M0,30 ', p2 = 'M0,30 ';
  for (let x = 0; x <= w; x += 10) {
    const y1 = 30 + Math.sin(x * 0.05) * 18 * Math.cos(x * 0.02);
    const y2 = 30 + Math.cos(x * 0.04) * 14;
    p1 += `L${x},${y1.toFixed(1)} `;
    p2 += `L${x},${y2.toFixed(1)} `;
  }
  return `
    <svg viewBox="0 0 ${w} ${h}" class="datav-wave-svg" aria-hidden="true">
      <path d="${p1}" fill="none" stroke="#38bdf8" stroke-width="1.8" opacity="0.85"/>
      <path d="${p2}" fill="none" stroke="#f08a24" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.75"/>
    </svg>`;
};

// 7-Day Matrix Activity Grid
const renderActivityMatrix = () => {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `
    <div class="datav-matrix-grid">
      ${days.map(d => `<div class="datav-matrix-col"><span class="matrix-day">${d}</span>${[1,2,3,4,5].map(v => {
        const glow = Math.random() > 0.35;
        const level = Math.floor(Math.random() * 3) + 1;
        return `<i class="matrix-cell ${glow ? 'active lvl-' + level : ''}"></i>`;
      }).join('')}</div>`).join('')}
    </div>`;
};

// Cyber Segmented Battery/Storage Bar Helper
const renderSegmentedBar = (pct) => {
  const activeSegs = Math.min(8, Math.max(1, Math.round((pct / 100) * 8)));
  let html = '<div class="cyber-segmented-gauge" title="' + (pct | 0) + '% Storage SoC">';
  for (let i = 0; i < 8; i++) {
    const on = i < activeSegs;
    const isHigh = pct >= 60;
    html += `<i class="seg ${on ? (isHigh ? 'on high' : 'on') : ''}"></i>`;
  }
  html += ` <span class="gauge-val">${pct | 0}%</span></div>`;
  return html;
};

// Station Cards Generator (Aerospace Node Telemetry Matrix)
const renderStationTable = () => {
  const curStn = (window.S && window.S.inspectedStation) || 'library';
  return `
  <table class="datav-fleet-table">
    <thead>
      <tr>
        <th>Station Node</th>
        <th>Free/Total</th>
        <th>Solar Inflow</th>
        <th>Panel Temp</th>
        <th>Battery Matrix</th>
        <th>Status</th>
        <th>Telemetry</th>
      </tr>
    </thead>
    <tbody>
      ${ST.map(s => {
        const isSelected = s.id === curStn;
        return `
        <tr id="stn-row-${s.id}" class="${isSelected ? 'stn-selected-row' : ''}">
          <td><b>${s.n}</b></td>
          <td><b>${s.free}/${s.slots}</b></td>
          <td><span style="color:#00e5ff">${s.solar | 0} W</span></td>
          <td><span style="${s.temp > 35 ? 'color:#f08a24' : ''}">${s.temp.toFixed(1)}°C</span></td>
          <td>${renderSegmentedBar(s.batt)}</td>
          <td>
            <span id="stn-status-${s.id}" class="datav-status-tag ${s.ok ? 'online' : 'offline'}">
              <span class="datav-dot-pulse" style="display:inline-block;width:5px;height:5px;background:${s.ok ? '#34d399' : '#f87171'};border-radius:50%;margin-right:4px"></span>
              ${s.ok ? 'ONLINE' : 'OFFLINE'}
            </span>
          </td>
          <td>
            <button type="button" class="btn btn-sm btn-target ${isSelected ? 'active' : ''}" data-stn="${s.id}" onclick="focusStationOnGlobe('${s.id}')">
              ${isSelected ? 'LOCKED 🎯' : 'TARGET 🎯'}
            </button>
          </td>
        </tr>
      `}).join('')}
    </tbody>
  </table>
  `;
};

// Field Technician Slot Diagnostics Generator (8 slots per station)
const renderTechnicianSlotMatrix = (activeStationId = 'library') => {
  const stn = getStn(activeStationId);
  const bays = window.initStationBays(activeStationId);

  return `
    <div class="datav-panel datav-tech-panel">
      <div class="datav-panel-header">
        <span class="datav-corner-bracket tl"></span>
        <span class="datav-corner-bracket tr"></span>
        <span class="datav-corner-bracket bl"></span>
        <span class="datav-corner-bracket br"></span>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:8px">
          <div>
            <h3 style="margin:0;color:#00e5ff">8-BAY HARDWARE DIAGNOSTICS</h3>
            <small style="color:var(--adm-mut)">Physical Bay Status for <b>${stn.n}</b></small>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm g" onclick="techCalibrate('${stn.id}')">🩺 Health Ping Sweep</button>
          </div>
        </div>
      </div>
      <div class="datav-slots-grid">
        ${bays.map(bay => {
          const slotNum = bay.slotNum;
          const isEmpty = bay.isEmpty;
          const isWarning = bay.isWarning;
          const typeName = isEmpty ? 'Available Slot' : ((window.CATS && window.CATS[bay.type]?.n) || bay.type);

          return `
            <div id="bay-card-${stn.id}-${slotNum}" class="datav-slot-card ${isEmpty ? 'empty' : ''} ${isWarning ? 'warning' : ''}">
              <div class="slot-head">
                <span class="slot-badge">BAY #${slotNum}</span>
                <span class="slot-status-pill ${isEmpty ? 'stby' : (bay.soc < 95 ? 'chg' : 'rdy')}">${isEmpty ? 'AVAILABLE (EMPTY)' : bay.status}</span>
              </div>
              <div class="slot-body">
                <b>${typeName}</b>
                <div class="slot-metrics">
                  <span>SoC: <b>${isEmpty ? '—' : bay.soc + '%'}</b></span>
                  <span>Volt: <b>${isEmpty ? '0.00V' : bay.volt + 'V'}</b></span>
                  <span>Temp: <b style="${isWarning ? 'color:#f08a24' : ''}">${bay.temp}°C</b></span>
                </div>
              </div>
              <div class="slot-actions">
                ${isEmpty 
                  ? `<button class="btn btn-sm" onclick="techRestockSlot('${stn.id}', ${slotNum})" style="background:#00e5ff;color:#021626;font-weight:700;border:none;width:100%" title="Restock fully charged power bank into bay">📥 Restock Bank</button>`
                  : `<button class="btn btn-sm g" onclick="techUnlockSlot('${stn.id}', ${slotNum})" title="Force unlock solenoid">⚡ Unlock</button>
                     <button class="btn btn-sm g" onclick="techClearJam('${stn.id}', ${slotNum})" title="Recalibrate slot">🔄 Reset</button>`
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

// Customer Complaints Hub Cards
const renderComplaintsCards = () => {
  const all = window.S.complaints || [];
  const filter = window.S.complaintFilter || 'ALL';
  const query = window.S.complaintSearch || '';
  const stn = window.S.complaintStation || 'ALL';

  const filtered = all.filter(c => {
    if (filter !== 'ALL' && c.status !== filter) return false;
    if (stn !== 'ALL' && c.stationId !== stn) return false;
    if (query) {
      const match = (c.student && c.student.toLowerCase().includes(query)) ||
                    (c.email && c.email.toLowerCase().includes(query)) ||
                    (c.phone && c.phone.includes(query)) ||
                    (c.issue && c.issue.toLowerCase().includes(query)) ||
                    (c.id && c.id.toLowerCase().includes(query));
      if (!match) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return `<div class="datav-panel" style="text-align:center;padding:32px 16px;color:var(--adm-mut)">
      <p style="font-size:1.1rem;margin:0">✓ No complaints found matching current filters.</p>
    </div>`;
  }

  return `
    <div class="complaints-cards-grid">
      ${filtered.map(c => {
        const isOpen = c.status === 'OPEN';
        const isInvestigating = c.status === 'INVESTIGATING';
        const isResolved = c.status === 'RESOLVED';

        return `
          <div class="datav-panel complaint-ticket-card ${c.status.toLowerCase()}">
            <span class="datav-corner-bracket tl"></span>
            <span class="datav-corner-bracket tr"></span>
            <span class="datav-corner-bracket bl"></span>
            <span class="datav-corner-bracket br"></span>
            <div class="ticket-header">
              <div style="display:flex;align-items:center;gap:8px">
                <b class="ticket-code">${c.id}</b>
                <span class="ticket-cat-badge">${c.category}</span>
                ${c.isNew ? `<span class="ticket-status-pill urgent" style="background:rgba(240,138,36,0.25);border:1px solid #f08a24;color:#f08a24;animation:slotPulseAmber 0.8s infinite alternate">⚡ NEW ALERT</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="ticket-status-pill ${c.status.toLowerCase()}">● ${c.status}</span>
                <span class="ticket-time">${c.time}</span>
              </div>
            </div>

            <div class="ticket-body">
              <h4 class="ticket-issue">${c.issue}</h4>
              <p class="ticket-details">“${c.details}”</p>
              
              <div class="ticket-meta-grid">
                <div>
                  <small>STUDENT NAME</small>
                  <b>${c.student || 'RVCE Student'}</b>
                </div>
                <div>
                  <small>VERIFIED PHONE</small>
                  <b style="color:#00e5ff">${c.phone || '+91 98765 43210'}</b>
                </div>
                <div>
                  <small>STUDENT EMAIL</small>
                  <span>${c.email || 'student@rvce.edu.in'}</span>
                </div>
                <div>
                  <small>STATION & BAY</small>
                  <span>${c.station || 'Central Library'} · ${c.slotNum ? 'Bay #' + c.slotNum : (c.bay || 'General Kiosk')}</span>
                </div>
              </div>
            </div>

            <div class="ticket-actions">
              ${isOpen ? `
                <button class="btn btn-sm g" onclick="dispatchTech('${c.id}')">🛠️ Dispatch Technician</button>
                <button class="btn btn-sm" onclick="resolveComplaint('${c.id}')">✔ Mark as Resolved</button>
              ` : isInvestigating ? `
                <button class="btn btn-sm" onclick="resolveComplaint('${c.id}')">✔ Complete & Resolve</button>
              ` : `
                <span class="resolved-badge">✓ Ticket Resolved & Archived</span>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// Customer Complaints Hub Sub-Page View
const renderComplaintsHub = () => {
  const all = window.S.complaints || [];
  const openCount = all.filter(c => c.status === 'OPEN').length;
  const invCount = all.filter(c => c.status === 'INVESTIGATING').length;
  const resCount = all.filter(c => c.status === 'RESOLVED').length;
  const currFilter = window.S.complaintFilter || 'ALL';

  return `
    <div class="datav-complaints-view">
      <!-- 1. KPI Metric Badges -->
      <div class="complaints-kpi-row">
        <div class="datav-panel kpi-card">
          <small>TOTAL TICKETS</small>
          <b>${all.length}</b>
        </div>
        <div class="datav-panel kpi-card urgent">
          <small>OPEN TICKETS</small>
          <b style="color:#f08a24">${openCount}</b>
        </div>
        <div class="datav-panel kpi-card">
          <small>IN PROGRESS</small>
          <b style="color:#00e5ff">${invCount}</b>
        </div>
        <div class="datav-panel kpi-card">
          <small>RESOLVED TICKETS</small>
          <b style="color:#34d399">${resCount}</b>
        </div>
        <div class="datav-panel kpi-card">
          <small>RESOLUTION RATE</small>
          <b style="color:#34d399">96.4%</b>
        </div>
      </div>

      <!-- 2. Search & Filter Bar -->
      <div class="datav-panel complaints-filter-panel">
        <div class="complaints-filter-bar">
          <div class="search-box">
            <input type="text" placeholder="Search by student, phone (+91), ticket ID..." value="${window.S.complaintSearch || ''}" oninput="searchComplaints(this.value)">
          </div>
          <div class="filter-pills">
            <button class="filter-pill ${currFilter === 'ALL' ? 'active' : ''}" onclick="filterComplaints('ALL')">ALL (${all.length})</button>
            <button class="filter-pill ${currFilter === 'OPEN' ? 'active' : ''}" onclick="filterComplaints('OPEN')">OPEN (${openCount})</button>
            <button class="filter-pill ${currFilter === 'INVESTIGATING' ? 'active' : ''}" onclick="filterComplaints('INVESTIGATING')">IN PROGRESS (${invCount})</button>
            <button class="filter-pill ${currFilter === 'RESOLVED' ? 'active' : ''}" onclick="filterComplaints('RESOLVED')">RESOLVED (${resCount})</button>
          </div>
          <div class="station-filter">
            <select onchange="filterComplaintsStation(this.value)">
              <option value="ALL">All Campus Stations</option>
              <option value="library" ${window.S.complaintStation === 'library' ? 'selected' : ''}>Central Library</option>
              <option value="mm" ${window.S.complaintStation === 'mm' ? 'selected' : ''}>M.M Foods</option>
              <option value="mingoes" ${window.S.complaintStation === 'mingoes' ? 'selected' : ''}>Big Mingoes</option>
              <option value="cauvery" ${window.S.complaintStation === 'cauvery' ? 'selected' : ''}>Cauvery Hostel</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 3. Complaints Cards Feed -->
      <div id="datav-complaints-list">
        ${renderComplaintsCards()}
      </div>
    </div>
  `;
};

// Main Admin & Technician Command Center View
function admin() {
  const isStaff = S.u && (S.u.role === 'super_admin' || S.u.role === 'technician');
  if (!isStaff) {
    S.adminError = 'Staff session required. Please sign in with an authorized Google account.';
    location.hash = 'admin-login';
    return PG['admin-login']();
  }

  const isSuper = S.u.role === 'super_admin';
  const totalSlots = ST.reduce((a, s) => a + s.slots, 0);
  const totalFree = ST.reduce((a, s) => a + s.free, 0);
  const totalSolar = ST.reduce((a, s) => a + s.solar, 0) | 0;

  const activeTab = window.S.adminTab || 'telemetry';
  const allComplaints = window.S.complaints || [];
  const openComplaintsCount = allComplaints.filter(c => c.status === 'OPEN').length;
  const inspectedStnId = window.S.inspectedStation || 'library';

  if (activeTab === 'telemetry') {
    setTimeout(() => {
      initDatavGlobe();
      startDatavClock();
    }, 50);
  }

  return `
    <div class="datav-wrapper admin-blueprint-scope">
      <!-- 1. Top Cyber Aerospace Header -->
      <header class="datav-topbar">
        <div class="datav-brand-block">
          <div class="datav-logo-icon">
            <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M24 3c11 6 16 15 16 26a16 16 0 0 1-32 0C8 18 13 9 24 3z" fill="#00e5ff"/>
              <path d="M27 13 17 28h6l-2 9 11-16h-7z" fill="#ffffff"/>
            </svg>
          </div>
          <div>
            <div class="datav-sys-title">DATAV // SOLAR MICROGRID & ENERGY STORAGE COMMAND</div>
            <div class="datav-sys-subtitle">LUMENGROVE SOLAR TELEMETRY MISSION CONTROL</div>
          </div>
        </div>

        <!-- Sub-Page Switcher Tabs -->
        <nav class="datav-subnav" aria-label="Command Center Views">
          <button type="button" class="datav-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}" onclick="switchAdminTab('telemetry')">
            <span class="tab-indicator"></span>
            <span class="tab-icon">🛰️</span>
            <span>GLOBAL FLEET TELEMETRY</span>
          </button>
          <button type="button" class="datav-tab-btn ${activeTab === 'complaints' ? 'active' : ''}" onclick="switchAdminTab('complaints')">
            <span class="tab-indicator"></span>
            <span class="tab-icon">📋</span>
            <span>CUSTOMER COMPLAINTS</span>
            <span class="datav-tab-badge ${openComplaintsCount > 0 ? 'urgent' : ''}">${openComplaintsCount} PENDING</span>
          </button>
        </nav>

        <div class="datav-operator-card">
          <button type="button" class="btn btn-sm g datav-portal-btn" onclick="location.hash='app-home';go(1);" title="Return to student rental portal">
            <span>🌐 Public Portal</span>
          </button>
          <div class="operator-meta">
            <span class="operator-role">${isSuper ? 'SUPER_ADMIN // LVL-1' : 'FIELD_TECHNICIAN // HARDWARE'}</span>
            <b class="operator-name">${S.u.name || S.u.email}</b>
          </div>
          <button class="btn btn-sm g datav-exit-btn" onclick="signOut()" title="End staff session">Sign Out</button>
        </div>
      </header>

      ${activeTab === 'complaints' ? renderComplaintsHub() : `
        <!-- 2. Main 3-Column DataV Command Center Grid -->
        <div class="datav-main-grid">
          
          <!-- LEFT COLUMN: Generation, Throughput & Fleet Dispatch -->
          <div class="datav-col left">
            
            <!-- Campus Photovoltaic Energy Flow Topology Radar (Replaces airplane silhouette) -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">CAMPUS ENERGY FLOW TOPOLOGY</span>
                  <span class="datav-code">&lt;SOLAR_MICROGRID_SYNC&gt;</span>
                </div>
              </div>
              <div class="datav-silhouette-body">
                <div class="silhouette-graphic topology-graphic" title="Campus Solar Microgrid Topology">
                  <svg width="78" height="66" viewBox="0 0 78 66" fill="none" aria-hidden="true">
                    <!-- Central Solar Inverter Node -->
                    <circle cx="39" cy="33" r="12" fill="rgba(0,229,255,0.18)" stroke="#00e5ff" stroke-width="1.8"/>
                    <circle cx="39" cy="33" r="4.5" fill="#f08a24"/>
                    <!-- Vectors to 4 Stations -->
                    <line x1="31" y1="25" x2="14" y2="12" stroke="#00e5ff" stroke-width="1.2" stroke-dasharray="3 2"/>
                    <circle cx="14" cy="12" r="5" fill="#041829" stroke="#00e5ff" stroke-width="1.2"/>
                    <line x1="47" y1="25" x2="64" y2="12" stroke="#00e5ff" stroke-width="1.2" stroke-dasharray="3 2"/>
                    <circle cx="64" cy="12" r="5" fill="#041829" stroke="#00e5ff" stroke-width="1.2"/>
                    <line x1="31" y1="41" x2="14" y2="54" stroke="#00e5ff" stroke-width="1.2" stroke-dasharray="3 2"/>
                    <circle cx="14" cy="54" r="5" fill="#041829" stroke="#00e5ff" stroke-width="1.2"/>
                    <line x1="47" y1="41" x2="64" y2="54" stroke="#00e5ff" stroke-width="1.2" stroke-dasharray="3 2"/>
                    <circle cx="64" cy="54" r="5" fill="#041829" stroke="#00e5ff" stroke-width="1.2"/>
                  </svg>
                </div>
                <div class="silhouette-stats">
                  <div>
                    <small>TOTAL WH</small>
                    <b id="datav-wh">28,689</b>
                  </div>
                  <div>
                    <small>SOLAR INFLOW</small>
                    <b id="datav-inflow" style="color:#00e5ff">${totalSolar} W</b>
                  </div>
                  <div>
                    <small>ACTIVE FLEET</small>
                    <b>30,690 m</b>
                  </div>
                  <div>
                    <small>EFFICIENCY</small>
                    <b style="color:#34d399">98.845%</b>
                  </div>
                </div>
              </div>
            </div>

            <!-- Real-Time Throughput / Check-In Wave -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">24H POWER THROUGHPUT & DEMAND</span>
                  <small style="color:var(--adm-mut)">Waveform Area</small>
                </div>
              </div>
              ${renderWaveChart()}
            </div>

            <!-- Harmonic Balancing Frequency Wave -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">MICROGRID HARMONICS (SIN/COS)</span>
                  <span class="badge" style="background:#071c26;border-color:#00e5ff;color:#00e5ff">50.02 Hz</span>
                </div>
              </div>
              ${renderFrequencyWave()}
            </div>

            <!-- Station Fleet Logistics Table -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">CAMPUS STATIONS FLEET STATUS</span>
                  <span class="badge" style="background:#042b1a;color:#34d399;border-color:#059669">${totalFree}/${totalSlots} READY</span>
                </div>
              </div>
              <div style="overflow-x:auto">
                ${renderStationTable()}
              </div>
            </div>

          </div>

            <!-- CENTER COLUMN: Stationary RVCE Microgrid Radar Map & Station Inspector -->
            <div class="datav-col center">
            
            <div class="datav-globe-card">
              <div class="datav-globe-header">
                <div class="globe-status-pill">
                  <i class="datav-dot-pulse"></i>
                  <span>TACTICAL CAMPUS RADAR MATRIX // RVCE MICROGRID</span>
                </div>
                <!-- Stationary Status Badge & Quick Reset -->
                <div class="datav-globe-controls">
                  <span class="badge" style="background:#042b1a;color:#34d399;border:1px solid #059669;padding:4px 10px;font-family:'Barlow Condensed',monospace;letter-spacing:1px;font-size:0.75rem">
                    <span class="datav-dot-pulse" style="display:inline-block;width:6px;height:6px;background:#34d399;border-radius:50%;margin-right:6px"></span>
                    STATIONARY RADAR LOCK
                  </span>
                </div>
              </div>

              <!-- Station Quick Picker Pills -->
              <div class="globe-station-pills-row">
                <button type="button" class="globe-stn-pill ${inspectedStnId === 'library' ? 'active' : ''}" data-stn="library" onclick="focusStationOnGlobe('library')">
                  📍 Library
                </button>
                <button type="button" class="globe-stn-pill ${inspectedStnId === 'mm' ? 'active' : ''}" data-stn="mm" onclick="focusStationOnGlobe('mm')">
                  📍 M.M Foods
                </button>
                <button type="button" class="globe-stn-pill ${inspectedStnId === 'mingoes' ? 'active' : ''}" data-stn="mingoes" onclick="focusStationOnGlobe('mingoes')">
                  📍 Big Mingoes
                </button>
                <button type="button" class="globe-stn-pill ${inspectedStnId === 'cauvery' ? 'active' : ''}" data-stn="cauvery" onclick="focusStationOnGlobe('cauvery')">
                  📍 Cauvery
                </button>
                <button type="button" class="globe-stn-pill" data-stn="all" onclick="resetGlobeOrbit()">
                  🌐 Reset Focus
                </button>
              </div>

              <!-- Interactive Stationary Radar Canvas (Click anywhere near station to inspect) -->
              <div class="datav-canvas-container" title="Click any campus station directly on the map to lock target and inspect 8-bay hardware">
                <canvas id="datav-globe-canvas"></canvas>
              </div>

              <div class="datav-globe-footer">
                <div class="globe-legend">
                  <span><i style="background:#00e5ff"></i> Station Node</span>
                  <span><i style="background:#ffffff;box-shadow:0 0 6px #00e5ff"></i> Solar Photon</span>
                  <span><i style="background:#f08a24"></i> Selected Target</span>
                </div>
                <div class="globe-hint">Click any station on radar to inspect 8 bays</div>
              </div>
            </div>

            <!-- Dynamic Station Inspection HUD Card -->
            <div id="datav-station-inspection-hud">
              ${renderStationInspectionCard(inspectedStnId)}
            </div>

            <!-- 8-Bay Hardware Diagnostics Matrix (Automatically synced to selected station) -->
            <div id="datav-tech-bays-container">
              ${renderTechnicianSlotMatrix(inspectedStnId)}
            </div>

            <!-- If Super Admin: Show Security Event Log Audit Table -->
            ${isSuper ? `
              <div class="datav-panel">
                <div class="datav-panel-header">
                  <span class="datav-corner-bracket tl"></span>
                  <span class="datav-corner-bracket tr"></span>
                  <span class="datav-corner-bracket bl"></span>
                  <span class="datav-corner-bracket br"></span>
                  <div class="panel-title-row">
                    <span class="datav-panel-tag">SECURITY & ANOMALY AUDIT TRAIL</span>
                    <button class="btn btn-sm g" onclick="exportLogsCsv()">Export CSV</button>
                  </div>
                </div>
                <table class="datav-fleet-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Station</th>
                      <th>Event Code</th>
                      <th>Severity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>09:12:44</td>
                      <td>Big Mingoes</td>
                      <td>VIBRATION_TRIGGER</td>
                      <td><span style="color:#f08a24">WARN</span></td>
                      <td>Resolved</td>
                    </tr>
                    <tr>
                      <td>11:40:18</td>
                      <td>Library</td>
                      <td>RETURN_RETRY_PASS</td>
                      <td><span style="color:#00e5ff">INFO</span></td>
                      <td>Cleared</td>
                    </tr>
                    <tr>
                      <td>14:05:02</td>
                      <td>M.M Foods</td>
                      <td>SOLAR_MPPT_SYNC</td>
                      <td><span style="color:#34d399">OPTIMAL</span></td>
                      <td>Active</td>
                    </tr>
                    <tr>
                      <td>14:42:19</td>
                      <td>Cauvery</td>
                      <td>SESSION_VERIFIED</td>
                      <td><span style="color:#00e5ff">AUTH</span></td>
                      <td>Completed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ` : ''}

          </div>

          <!-- RIGHT COLUMN: Early Warnings, Technician Controls / Admin Pricing Rules -->
          <div class="datav-col right">

            <!-- Early Warning Safety Alerts Panel -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">EARLY WARNING TELEMETRY // AUTOMATED SAFETY MATRIX</span>
                  <span class="badge" style="background:#261805;border-color:#f08a24;color:#f08a24">2 ACTIVE</span>
                </div>
              </div>
              <div class="datav-alarm-list">
                <div class="datav-alarm-card lvl-1">
                  <div class="alarm-top">
                    <span class="alarm-tag">CRITICAL PRIORITY · LVL 1 ALARM</span>
                    <span class="alarm-time">14:38</span>
                  </div>
                  <div class="alarm-body">
                    <b>Library Kiosk Slot #4: Temp Spike 42.1°C</b>
                    <p>Panel ambient elevated. Active cooling fan engaged.</p>
                  </div>
                </div>
                <div class="datav-alarm-card lvl-2">
                  <div class="alarm-top">
                    <span class="alarm-tag">ROUTINE ADVISORY · LVL 2 NOTICE</span>
                    <span class="alarm-time">13:15</span>
                  </div>
                  <div class="alarm-body">
                    <b>M.M Foods: Routine Solar Tracker Calibration</b>
                    <p>Inverter telemetry synced to central microgrid grid.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Role-Specific Action Deck -->
            ${isSuper ? `
              <!-- Super Admin Pricing & Policy Control Deck (Cyber Microgrid Policy Terminal) -->
              <div class="datav-panel">
                <div class="datav-panel-header">
                  <span class="datav-corner-bracket tl"></span>
                  <span class="datav-corner-bracket tr"></span>
                  <span class="datav-corner-bracket bl"></span>
                  <span class="datav-corner-bracket br"></span>
                  <div class="panel-title-row">
                    <span class="datav-panel-tag">PRICING RULES & POLICY CONFIG</span>
                    <span class="badge" style="background:#042b1a;color:#34d399;border-color:#059669">LIVE DB SYNC</span>
                  </div>
                </div>
                <div class="datav-config-form">
                  <!-- Hourly Rate Stepper -->
                  <div class="cyber-policy-row">
                    <div class="cyber-policy-label">
                      <span>HOURLY RENTAL RATE</span>
                      <small>BASE BILLING UNIT // PAISE CONV</small>
                    </div>
                    <div class="cyber-stepper-ctrl">
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('rate', -5)" title="Decrease rate">-</button>
                      <div id="disp-rate" class="cyber-display-box">₹ ${PR.rate || 10}</div>
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('rate', 5)" title="Increase rate">+</button>
                    </div>
                  </div>

                  <!-- Grace Period Stepper -->
                  <div class="cyber-policy-row">
                    <div class="cyber-policy-label">
                      <span>GRACE PERIOD</span>
                      <small>DISCONNECT BUFFER // MINS</small>
                    </div>
                    <div class="cyber-stepper-ctrl">
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('grace', -5)" title="Decrease grace">-</button>
                      <div id="disp-grace" class="cyber-display-box">${PR.grace || 15} MIN</div>
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('grace', 5)" title="Increase grace">+</button>
                    </div>
                  </div>

                  <!-- Late Fee Stepper -->
                  <div class="cyber-policy-row">
                    <div class="cyber-policy-label">
                      <span>LATE OVERAGE FEE</span>
                      <small>PER ADDITIONAL HOUR // ₹</small>
                    </div>
                    <div class="cyber-stepper-ctrl">
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('late', -5)" title="Decrease late fee">-</button>
                      <div id="disp-late" class="cyber-display-box">₹ ${PR.late || 20}</div>
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('late', 5)" title="Increase late fee">+</button>
                    </div>
                  </div>

                  <!-- Deposit Stepper -->
                  <div class="cyber-policy-row">
                    <div class="cyber-policy-label">
                      <span>REFUNDABLE DEPOSIT</span>
                      <small>HOLD AMOUNT PER SESSION // ₹</small>
                    </div>
                    <div class="cyber-stepper-ctrl">
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('dep', -10)" title="Decrease deposit">-</button>
                      <div id="disp-dep" class="cyber-display-box">₹ ${PR.dep || 0}</div>
                      <button type="button" class="cyber-step-btn" onclick="adjustPricing('dep', 10)" title="Increase deposit">+</button>
                    </div>
                  </div>

                  <!-- Live Preview Simulator -->
                  <div class="config-preview">
                    <span>Live Preview (2h charge):</span>
                    <b id="bl" style="color:#00e5ff">₹ ${(PR.rate || 10) * 2}</b>
                  </div>

                  <!-- Supabase Two-Way Live Commit Button -->
                  <button type="button" class="cyber-commit-btn" onclick="commitPricingToSupabase()">
                    ⚡ COMMIT POLICY TO SUPABASE
                  </button>
                  <div class="cyber-sync-status">
                    <span class="datav-dot-pulse" style="display:inline-block;width:6px;height:6px;background:#34d399;border-radius:50%"></span>
                    <span>SUPABASE CLOUD SYNC: ACTIVE (TWO-WAY LIVE BINDING)</span>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Field Technician Fast Operations Card -->
              <div class="datav-panel">
                <div class="datav-panel-header">
                  <span class="datav-corner-bracket tl"></span>
                  <span class="datav-corner-bracket tr"></span>
                  <span class="datav-corner-bracket bl"></span>
                  <span class="datav-corner-bracket br"></span>
                  <div class="panel-title-row">
                    <span class="datav-panel-tag">FIELD TECHNICIAN DISPATCH</span>
                    <span class="badge" style="background:#072418;color:#34d399;border-color:#059669">RADIO ON</span>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;padding:8px 0">
                  <button class="btn g" onclick="techCalibrate('library')" style="width:100%;text-align:left;display:flex;justify-content:space-between">
                    <span>🩺 Ping Central Library Kiosk</span>
                    <span style="color:#00e5ff">OK</span>
                  </button>
                  <button class="btn g" onclick="techCalibrate('mm')" style="width:100%;text-align:left;display:flex;justify-content:space-between">
                    <span>🩺 Ping M.M Foods Kiosk</span>
                    <span style="color:#00e5ff">OK</span>
                  </button>
                  <button class="btn g" onclick="techCalibrate('mingoes')" style="width:100%;text-align:left;display:flex;justify-content:space-between">
                    <span>🩺 Ping Big Mingoes Kiosk</span>
                    <span style="color:#00e5ff">OK</span>
                  </button>
                  <button class="btn g" onclick="techCalibrate('cauvery')" style="width:100%;text-align:left;display:flex;justify-content:space-between">
                    <span>🩺 Ping Cauvery Hostel Kiosk</span>
                    <span style="color:#00e5ff">OK</span>
                  </button>
                </div>
              </div>
            `}

            <!-- 7-Day Operational Matrix Performance -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">WEEKLY FLEET UPTIME MATRIX</span>
                  <small style="color:#34d399">99.8% AVAILABILITY</small>
                </div>
              </div>
              ${renderActivityMatrix()}
            </div>

          </div>

        </div>
      `}

      <!-- 3. Bottom DataV Telemetry Strip -->
      <footer class="datav-bottom-strip">
        <div class="strip-item"><span class="dot-ok"></span> LIB: ONLINE (8/8)</div>
        <div class="strip-item"><span class="dot-ok"></span> MM: ONLINE (8/8)</div>
        <div class="strip-item"><span class="dot-ok"></span> MING: ONLINE (8/8)</div>
        <div class="strip-item"><span class="dot-ok"></span> CAUV: ONLINE (8/8)</div>
        <div class="strip-item" style="color:#00e5ff"><span class="dot-ok"></span> SOLAR MATRIX: 100% GREEN // OFF-GRID</div>
      </footer>
    </div>
  `;
}

// Telemetry history update loop for solar output
setInterval(() => {
  ST.forEach(s => {
    if (!s.h) s.h = [];
    s.h.push(s.solar);
    if (s.h.length > 30) s.h.shift();
  });
}, 2000);

// In-place real-time telemetry simulation interval (NEVER wipes inputs or re-renders canvas!)
let tk = 0;
setInterval(() => {
  tk++;
  ST.forEach(s => {
    s.solar = Math.max(80, s.solar + Math.random() * 30 - 15);
    s.batt = Math.min(100, Math.max(20, s.batt + Math.random() * 2 - 1));
    s.temp = Math.min(55, Math.max(28, s.temp + Math.random() - 0.5));
  });

  if (location.hash === '#admin') {
    const totalSolar = ST.reduce((a, s) => a + s.solar, 0) | 0;
    const inflowEl = document.getElementById('datav-inflow');
    if (inflowEl) inflowEl.textContent = `${totalSolar} W`;
  }
}, 1000);

window.admin = admin;
