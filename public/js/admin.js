// js/admin.js - DataV Aerospace Telemetry Command Center for Super Admin & Field Technician
// Full-bleed cyber telemetry mission control with rotating 3D wireframe globe, station inspection HUD,
// customer complaints resolution hub, and 8-bay hardware diagnostics.

window.bill = () => {
  const bl = $('#bl');
  if (bl) bl.textContent = PR.rate ? '₹ ' + (PR.rate * 2) : '—';
};

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

window.tg = id => {
  const s = ST.find(x => x.id == id);
  if (s) {
    s.ok = !s.ok;
    toast(`Station ${s.n} set to ${s.ok ? 'ONLINE' : 'MAINTENANCE MODE'}`);
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

window.techUnlockSlot = (stnId, slotNum) => {
  const s = ST.find(x => x.id === stnId) || ST[0];
  toast(`⚡ Solenoid unlocked: ${s.n} Bay #${slotNum}`);
};

window.techClearJam = (stnId, slotNum) => {
  const s = ST.find(x => x.id === stnId) || ST[0];
  toast(`🔄 Bay #${slotNum} at ${s.n} recalibrated. Return lock cleared.`);
};

window.techCalibrate = (stnId) => {
  const s = ST.find(x => x.id === stnId) || ST[0];
  toast(`🩺 Station ${s.n} full health diagnostic OK (8/8 bays verified, MPPT active)`);
};

// Customer Complaints Hub State & Actions
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

if (!window.S.complaints) {
  window.S.complaints = defaultComplaints;
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
    toast(`Ticket ${id} marked as RESOLVED`);
    window.rerAdmin();
  }
};

window.dispatchTech = (id) => {
  const item = (window.S.complaints || []).find(c => c.id === id);
  if (item) {
    item.status = 'INVESTIGATING';
    toast(`Field Technician dispatched to ${item.station} for ${id}`);
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

// 3D Wireframe Rotating Telemetry Globe Canvas Engine
let globeAnimationId = null;
let globeRotY = 0;
let isGlobeDragging = false;
let isGlobeHovered = false;
let isGlobePaused = false;
let lastMouseX = 0;
let targetGlobeRotY = null;

// Station Spherical Coordinates
const stationNodes = [
  { id: 'library', name: 'LIB', fullName: 'Central Library', latRad: 0.22, lonRad: 1.15, ok: true },
  { id: 'mm', name: 'MM', fullName: 'M.M Foods', latRad: 0.32, lonRad: 1.48, ok: true },
  { id: 'mingoes', name: 'MING', fullName: 'Big Mingoes', latRad: 0.12, lonRad: 1.82, ok: true },
  { id: 'cauvery', name: 'CAUV', fullName: 'Cauvery Hostel', latRad: -0.15, lonRad: 1.35, ok: true }
];

window.toggleGlobeSpin = () => {
  isGlobePaused = !isGlobePaused;
  const btn = document.getElementById('datav-orbit-toggle');
  if (btn) {
    btn.innerHTML = isGlobePaused ? '▶ RESUME ORBIT' : '⏸ PAUSE ORBIT';
    btn.classList.toggle('paused', isGlobePaused);
  }
  toast(isGlobePaused ? 'Globe orbit paused' : 'Globe auto-orbit resumed');
};

window.focusStationOnGlobe = (stnId) => {
  const node = stationNodes.find(n => n.id === stnId);
  if (!node) return;

  window.S.inspectedStation = stnId;
  isGlobePaused = true;

  // Calculate target rotation angle so this station faces front and center (lon + rotY = PI/2)
  targetGlobeRotY = Math.PI / 2 - node.lonRad;

  const btn = document.getElementById('datav-orbit-toggle');
  if (btn) {
    btn.innerHTML = '▶ RESUME ORBIT';
    btn.classList.add('paused');
  }

  // Update inspection HUD card below the globe
  const hudContainer = document.getElementById('datav-station-inspection-hud');
  if (hudContainer) {
    hudContainer.innerHTML = renderStationInspectionCard(stnId);
  }

  // Update active pill styling on HUD
  document.querySelectorAll('.globe-stn-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.stn === stnId);
  });

  // Automatically switch Technician 8-Bay Hardware Diagnostics Matrix below
  const techBayContainer = document.getElementById('datav-tech-bays-container');
  if (techBayContainer) {
    techBayContainer.innerHTML = renderTechnicianSlotMatrix(stnId);
  }

  const s = ST.find(x => x.id === stnId) || ST[0];
  toast(`Locked focus to ${s.n} · Bay diagnostics updated`);
};

window.resetGlobeOrbit = () => {
  window.S.inspectedStation = null;
  isGlobePaused = false;
  targetGlobeRotY = null;
  const btn = document.getElementById('datav-orbit-toggle');
  if (btn) {
    btn.innerHTML = '⏸ PAUSE ORBIT';
    btn.classList.remove('paused');
  }
  document.querySelectorAll('.globe-stn-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.stn === 'all');
  });
  const hudContainer = document.getElementById('datav-station-inspection-hud');
  if (hudContainer) {
    hudContainer.innerHTML = renderStationInspectionCard('library');
  }
  toast('Resumed continuous globe orbit');
};

window.initDatavGlobe = () => {
  const canvas = document.getElementById('datav-globe-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Responsive DPI scaling
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = rect.width || 440;
  const height = rect.height || 420;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.38;
  const tilt = 0.32; // Axial tilt (radians)

  // Spherical 3D Projection Helper
  function project(latRad, lonRad, r = R) {
    const x = r * Math.cos(latRad) * Math.sin(lonRad + globeRotY);
    const y = -r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.cos(lonRad + globeRotY);
    const yPrime = y * Math.cos(tilt) - z * Math.sin(tilt);
    const zPrime = y * Math.sin(tilt) + z * Math.cos(tilt);
    return { x: cx + x, y: cy + yPrime, z: zPrime };
  }

  // Pre-generate continent dot matrix points
  const globePoints = [];
  for (let lat = -65; lat <= 65; lat += 12) {
    const latRad = (lat * Math.PI) / 180;
    const count = Math.max(6, Math.floor(28 * Math.cos(latRad)));
    for (let i = 0; i < count; i++) {
      const lonRad = (i / count) * Math.PI * 2;
      const hash = Math.sin(lat * 12.9898 + i * 78.233);
      if (Math.abs(hash) > 0.35) {
        globePoints.push({ latRad, lonRad });
      }
    }
  }

  // Hover detection to pause rotation and change cursor
  canvas.onmouseenter = () => {
    isGlobeHovered = true;
  };
  canvas.onmouseleave = () => {
    isGlobeHovered = false;
    isGlobeDragging = false;
  };

  // Click on canvas node detection
  canvas.onclick = e => {
    const cRect = canvas.getBoundingClientRect();
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;

    for (const node of stationNodes) {
      const pt = project(node.latRad, node.lonRad);
      if (pt.z > -20) {
        const dist = Math.hypot(clickX - pt.x, clickY - pt.y);
        if (dist <= 24) {
          window.focusStationOnGlobe(node.id);
          return;
        }
      }
    }
  };

  // Mouse / Touch Drag Handlers
  canvas.onmousedown = e => {
    isGlobeDragging = true;
    lastMouseX = e.clientX;
    targetGlobeRotY = null;
  };
  window.onmouseup = () => {
    isGlobeDragging = false;
  };
  canvas.onmousemove = e => {
    const cRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - cRect.left;
    const mouseY = e.clientY - cRect.top;

    // Check if hovering near a station node
    let nearNode = false;
    for (const node of stationNodes) {
      const pt = project(node.latRad, node.lonRad);
      if (pt.z > -20 && Math.hypot(mouseX - pt.x, mouseY - pt.y) <= 24) {
        nearNode = true;
        break;
      }
    }
    canvas.style.cursor = nearNode ? 'pointer' : (isGlobeDragging ? 'grabbing' : 'grab');

    if (isGlobeDragging) {
      const deltaX = e.clientX - lastMouseX;
      globeRotY += deltaX * 0.008;
      lastMouseX = e.clientX;
    }
  };
  canvas.ontouchstart = e => {
    if (e.touches.length > 0) {
      isGlobeDragging = true;
      lastMouseX = e.touches[0].clientX;
      targetGlobeRotY = null;
    }
  };
  window.ontouchend = () => {
    isGlobeDragging = false;
  };
  canvas.ontouchmove = e => {
    if (isGlobeDragging && e.touches.length > 0) {
      const deltaX = e.touches[0].clientX - lastMouseX;
      globeRotY += deltaX * 0.008;
      lastMouseX = e.touches[0].clientX;
    }
  };

  let tick = 0;

  function render() {
    if (!document.getElementById('datav-globe-canvas')) {
      if (globeAnimationId) cancelAnimationFrame(globeAnimationId);
      return;
    }

    // Smooth rotation logic (~3.5x slower than original: 0.0015 rad/frame)
    if (targetGlobeRotY !== null) {
      globeRotY += (targetGlobeRotY - globeRotY) * 0.08;
      if (Math.abs(targetGlobeRotY - globeRotY) < 0.002) {
        globeRotY = targetGlobeRotY;
        targetGlobeRotY = null;
      }
    } else if (!isGlobeDragging && !isGlobeHovered && !isGlobePaused) {
      globeRotY += 0.0015; // Slow, majestic planetary drift
    }
    tick++;

    ctx.clearRect(0, 0, width, height);

    // 1. Outer Atmospheric Hologram Glow
    const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.32);
    glowGrad.addColorStop(0, 'rgba(0, 229, 255, 0.03)');
    glowGrad.addColorStop(0.7, 'rgba(0, 140, 255, 0.12)');
    glowGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.32, 0, Math.PI * 2);
    ctx.fill();

    // 2. HUD Radar Rings & Azimuth Crosshairs
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
    ctx.stroke();

    // Corner tick marks around globe
    ctx.setLineDash([]);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    const tickLen = 8;
    const rOuter = R * 1.16;
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach(angle => {
      const x1 = cx + Math.cos(angle) * (rOuter - tickLen);
      const y1 = cy + Math.sin(angle) * (rOuter - tickLen);
      const x2 = cx + Math.cos(angle) * (rOuter + tickLen);
      const y2 = cy + Math.sin(angle) * (rOuter + tickLen);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.restore();

    // 3. Latitude Wireframe Circles
    [-60, -40, -20, 0, 20, 40, 60].forEach(lat => {
      const latRad = (lat * Math.PI) / 180;
      ctx.beginPath();
      let first = true;
      for (let lon = 0; lon <= 360; lon += 10) {
        const lonRad = (lon * Math.PI) / 180;
        const pt = project(latRad, lonRad);
        if (first) {
          ctx.moveTo(pt.x, pt.y);
          first = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.closePath();
      ctx.strokeStyle = lat === 0 ? 'rgba(0, 229, 255, 0.45)' : 'rgba(0, 160, 255, 0.18)';
      ctx.lineWidth = lat === 0 ? 1.5 : 0.8;
      ctx.stroke();
    });

    // 4. Longitude Wireframe Meridians
    for (let lon = 0; lon < 360; lon += 30) {
      const lonRad = (lon * Math.PI) / 180;
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 8) {
        const latRad = (lat * Math.PI) / 180;
        const pt = project(latRad, lonRad);
        if (first) {
          ctx.moveTo(pt.x, pt.y);
          first = false;
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.strokeStyle = 'rgba(0, 160, 255, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // 5. Holographic Continent / Microgrid Dot Matrix
    globePoints.forEach(p => {
      const pt = project(p.latRad, p.lonRad);
      if (pt.z > -10) {
        const alpha = Math.max(0.1, (pt.z + R) / (2 * R));
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
      }
    });

    // 6. 3D Solar Arc Beams connecting stations
    const arcs = [
      [stationNodes[0], stationNodes[1]],
      [stationNodes[1], stationNodes[2]],
      [stationNodes[2], stationNodes[3]],
      [stationNodes[3], stationNodes[0]]
    ];

    arcs.forEach(([s1, s2], arcIdx) => {
      const p1 = project(s1.latRad, s1.lonRad);
      const p2 = project(s2.latRad, s2.lonRad);

      const midLat = (s1.latRad + s2.latRad) / 2;
      const midLon = (s1.lonRad + s2.lonRad) / 2;
      const apex = project(midLat, midLon, R * 1.38);

      if (p1.z > -R * 0.5 || p2.z > -R * 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(apex.x, apex.y, p2.x, p2.y);
        ctx.strokeStyle = arcIdx % 2 === 0 ? 'rgba(0, 229, 255, 0.65)' : 'rgba(240, 138, 36, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Traveling Solar Photon along arc
        const tPulse = ((tick * 0.012 + arcIdx * 0.25) % 1);
        const bx = (1 - tPulse) * (1 - tPulse) * p1.x + 2 * (1 - tPulse) * tPulse * apex.x + tPulse * tPulse * p2.x;
        const by = (1 - tPulse) * (1 - tPulse) * p1.y + 2 * (1 - tPulse) * tPulse * apex.y + tPulse * tPulse * p2.y;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = arcIdx % 2 === 0 ? '#00e5ff' : '#f08a24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // 7. Station Nodes & Interactive Radar Target Reticles
    stationNodes.forEach(node => {
      const pt = project(node.latRad, node.lonRad);
      const isSelected = window.S.inspectedStation === node.id;

      if (pt.z > -20) {
        const pingR = 5 + (tick % 40) * 0.35;
        const pingAlpha = Math.max(0, 1 - (tick % 40) / 40);

        ctx.save();
        // Radar Ping
        ctx.strokeStyle = isSelected ? 'rgba(240, 138, 36, ' + pingAlpha.toFixed(2) + ')' : `rgba(0, 229, 255, ${pingAlpha.toFixed(2)})`;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? pingR + 4 : pingR, 0, Math.PI * 2);
        ctx.stroke();

        // If selected, draw target bracket
        if (isSelected) {
          ctx.strokeStyle = '#f08a24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node Dot
        ctx.fillStyle = isSelected ? '#f08a24' : '#00e5ff';
        ctx.shadowColor = isSelected ? '#f08a24' : '#00e5ff';
        ctx.shadowBlur = isSelected ? 16 : 10;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Station Label
        ctx.shadowBlur = 0;
        ctx.font = '700 10px "Barlow Condensed", monospace';
        ctx.fillStyle = isSelected ? '#ffd599' : '#e2f1fd';
        ctx.fillText(node.name, pt.x + 8, pt.y - 6);
        ctx.fillStyle = isSelected ? '#f08a24' : 'rgba(0, 229, 255, 0.8)';
        ctx.fillText(isSelected ? 'INSPECTING' : 'ONLINE', pt.x + 8, pt.y + 6);
        ctx.restore();
      }
    });

    // 8. Outer Coordinate Rings & Telemetry Tag
    ctx.save();
    ctx.font = '8px "Barlow Condensed", monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.fillText('DATAV 3D TELEMETRY MATRIX', 14, 20);
    ctx.fillText(`ROT: ${(globeRotY % (Math.PI * 2)).toFixed(2)} RAD ${isGlobePaused ? '[PAUSED]' : '[DRIFT 0.0015]'}`, 14, 32);
    ctx.fillText('COORD: 12.9238°N 77.4987°E', width - 110, 20);
    ctx.restore();

    globeAnimationId = requestAnimationFrame(render);
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

// Station Cards Generator
const renderStationTable = () => `
  <table class="datav-fleet-table">
    <thead>
      <tr>
        <th>Station</th>
        <th>Free/Total</th>
        <th>Solar</th>
        <th>Panel Temp</th>
        <th>Reserve</th>
        <th>Status</th>
        <th>Inspect</th>
      </tr>
    </thead>
    <tbody>
      ${ST.map(s => `
        <tr id="stn-row-${s.id}">
          <td><b>${s.n}</b></td>
          <td>${s.free}/${s.slots}</td>
          <td><span style="color:#00e5ff">${s.solar | 0} W</span></td>
          <td>${s.temp.toFixed(1)}°C</td>
          <td>
            <div class="datav-mini-bar"><i style="width:${s.batt}%"></i></div>
            <small style="color:var(--adm-mut)">${s.batt | 0}%</small>
          </td>
          <td>
            <span id="stn-status-${s.id}" class="datav-status-tag ${s.ok ? 'online' : 'offline'}">
              ${s.ok ? 'ONLINE' : 'OFFLINE'}
            </span>
          </td>
          <td>
            <button type="button" class="btn btn-sm g" onclick="focusStationOnGlobe('${s.id}')" style="padding:4px 8px;font-size:0.75rem">
              Focus 🎯
            </button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

// Field Technician Slot Diagnostics Generator (8 slots per station)
const renderTechnicianSlotMatrix = (activeStationId = 'library') => {
  const stn = ST.find(s => s.id === activeStationId) || ST[0];
  const slotTypes = ['fast', 'wireless', 'standard', 'standard', 'empty', 'empty', 'fast', 'laptop'];

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
            <button class="btn btn-sm g" onclick="techCalibrate('${stn.id}')">🩺 Health Ping</button>
          </div>
        </div>
      </div>
      <div class="datav-slots-grid">
        ${slotTypes.map((type, idx) => {
          const slotNum = idx + 1;
          const isEmpty = type === 'empty';
          const soc = isEmpty ? 0 : Math.min(100, Math.max(45, 100 - (idx * 9) + ((stn.batt * 0.1) | 0)));
          const volt = isEmpty ? 0 : (3.7 + (soc / 100) * 0.5).toFixed(2);
          const temp = isEmpty ? 26.5 : (29 + (idx * 1.2) + (stn.temp * 0.1)).toFixed(1);
          const status = isEmpty ? 'AVAILABLE' : (soc < 95 ? 'CHARGING' : 'READY');
          const isWarning = !isEmpty && temp > 35;

          return `
            <div class="datav-slot-card ${isEmpty ? 'empty' : ''} ${isWarning ? 'warning' : ''}">
              <div class="slot-head">
                <span class="slot-badge">BAY #${slotNum}</span>
                <span class="slot-status-pill ${isEmpty ? 'stby' : (soc < 95 ? 'chg' : 'rdy')}">${status}</span>
              </div>
              <div class="slot-body">
                <b>${isEmpty ? 'Empty Slot' : (CATS[type]?.n || type)}</b>
                <div class="slot-metrics">
                  <span>SoC: <b>${isEmpty ? '—' : soc + '%'}</b></span>
                  <span>Volt: <b>${isEmpty ? '0.0V' : volt + 'V'}</b></span>
                  <span>Temp: <b style="${isWarning ? 'color:#f08a24' : ''}">${temp}°C</b></span>
                </div>
              </div>
              <div class="slot-actions">
                ${isEmpty 
                  ? `<span style="font-size:0.75rem;color:var(--adm-mut)">Sensor Ready</span>`
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
      const match = c.student.toLowerCase().includes(query) ||
                    c.email.toLowerCase().includes(query) ||
                    c.phone.includes(query) ||
                    c.issue.toLowerCase().includes(query) ||
                    c.id.toLowerCase().includes(query);
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
                  <b>${c.student}</b>
                </div>
                <div>
                  <small>VERIFIED PHONE</small>
                  <b style="color:#00e5ff">${c.phone}</b>
                </div>
                <div>
                  <small>STUDENT EMAIL</small>
                  <span>${c.email}</span>
                </div>
                <div>
                  <small>STATION & BAY</small>
                  <span>${c.station} · Bay #${c.slotNum}</span>
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
            <div class="datav-sys-title">DATAV // 光伏与储能微电网可视化系统</div>
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

          <!-- CENTER COLUMN: 3D Wireframe Rotating Telemetry Globe & Station Inspector -->
          <div class="datav-col center">
            
            <div class="datav-globe-card">
              <div class="datav-globe-header">
                <div class="globe-status-pill">
                  <i class="datav-dot-pulse"></i>
                  <span>SPHERICAL 3D TELEMETRY MATRIX // RVCE MICROGRID</span>
                </div>
                <!-- Controls: Pause/Resume Orbit & Station Jump Pills -->
                <div class="datav-globe-controls">
                  <button type="button" id="datav-orbit-toggle" class="btn btn-sm g ${isGlobePaused ? 'paused' : ''}" onclick="toggleGlobeSpin()">
                    ${isGlobePaused ? '▶ RESUME ORBIT' : '⏸ PAUSE ORBIT'}
                  </button>
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
                  🛰️ All Orbit
                </button>
              </div>

              <!-- Interactive 3D Canvas -->
              <div class="datav-canvas-container" title="Click station to inspect, hover to pause, or drag to rotate">
                <canvas id="datav-globe-canvas"></canvas>
              </div>

              <div class="datav-globe-footer">
                <div class="globe-legend">
                  <span><i style="background:#00e5ff"></i> Station Node</span>
                  <span><i style="background:#ffffff;box-shadow:0 0 6px #00e5ff"></i> Solar Beam</span>
                  <span><i style="background:#f08a24"></i> High Load</span>
                </div>
                <div class="globe-hint">Click station on map or hover to pause & inspect</div>
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

            <!-- Early Warning Alerts Panel (一级预警 / 二级预警) -->
            <div class="datav-panel">
              <div class="datav-panel-header">
                <span class="datav-corner-bracket tl"></span>
                <span class="datav-corner-bracket tr"></span>
                <span class="datav-corner-bracket bl"></span>
                <span class="datav-corner-bracket br"></span>
                <div class="panel-title-row">
                  <span class="datav-panel-tag">EARLY WARNING TELEMETRY (预警系统)</span>
                  <span class="badge" style="background:#261805;border-color:#f08a24;color:#f08a24">2 ACTIVE</span>
                </div>
              </div>
              <div class="datav-alarm-list">
                <div class="datav-alarm-card lvl-1">
                  <div class="alarm-top">
                    <span class="alarm-tag">一级预警 · LVL 1 ALARM</span>
                    <span class="alarm-time">14:38</span>
                  </div>
                  <div class="alarm-body">
                    <b>Library Kiosk Slot #4: Temp Spike 42.1°C</b>
                    <p>Panel ambient elevated. Active cooling fan engaged.</p>
                  </div>
                </div>
                <div class="datav-alarm-card lvl-2">
                  <div class="alarm-top">
                    <span class="alarm-tag">二级预警 · LVL 2 NOTICE</span>
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
              <!-- Super Admin Pricing & Policy Control Deck -->
              <div class="datav-panel">
                <div class="datav-panel-header">
                  <span class="datav-corner-bracket tl"></span>
                  <span class="datav-corner-bracket tr"></span>
                  <span class="datav-corner-bracket bl"></span>
                  <span class="datav-corner-bracket br"></span>
                  <div class="panel-title-row">
                    <span class="datav-panel-tag">PRICING RULES & POLICY CONFIG</span>
                    <span class="badge" style="background:#071a2b;color:#00e5ff;border-color:#00e5ff">ACTIVE</span>
                  </div>
                </div>
                <div class="datav-config-form">
                  <div class="config-row">
                    <label for="pr">Hourly Rate (₹)</label>
                    <input id="pr" type="number" value="${PR.rate || 10}" oninput="PR.rate=this.value;bill()">
                  </div>
                  <div class="config-row">
                    <label for="pg">Grace Period (Min)</label>
                    <input id="pg" type="number" value="${PR.grace || 15}" oninput="PR.grace=this.value">
                  </div>
                  <div class="config-row">
                    <label for="pl">Late Fee (₹)</label>
                    <input id="pl" type="number" value="${PR.late || 20}" oninput="PR.late=this.value">
                  </div>
                  <div class="config-row">
                    <label for="pd">Refundable Deposit (₹)</label>
                    <input id="pd" type="number" value="${PR.dep || 0}" oninput="PR.dep=this.value">
                  </div>
                  <div class="config-preview">
                    <span>Billing Preview (2h charge):</span>
                    <b id="bl" style="color:#00e5ff">₹ ${(PR.rate || 10) * 2}</b>
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
