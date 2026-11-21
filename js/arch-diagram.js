// js/arch-diagram.js - Interactive Full-Stack Architecture & Energy-Data Topology
// Solarpunk & Aerospace Engineering Blueprint for LumenGrove RVCE

(function () {
  const ARCH_NODES = {
    pv: {
      id: 'pv',
      tier: 'hardware',
      tierLabel: 'Physical Microgrid',
      title: 'Bifacial Solar PV Array',
      badge: '200W Canopy PV',
      icon: '☀️',
      status: '210W Peak Harvest',
      desc: 'Converts solar irradiance across campus canopy arrays into clean DC power, feeding MPPT charge controllers with live thermal telemetry.',
      specs: {
        'Capacity': '200W Bifacial Monocrystalline',
        'Controller': 'MPPT Step-Down (98% eff.)',
        'Telemetry': 'Panel Temp (33.5°C), Irradiance',
        'Harvest Status': '100% Zero-Carbon Off-Grid'
      },
      conduits: ['c_pv_power', 'c_pv_esp32'],
      flows: ['solar', 'iot'],
      vivaNote: 'Bifacial PV captures both direct sunlight and albedo ground reflections, maximizing yield during cloudy Bangalore afternoons.'
    },
    power: {
      id: 'power',
      tier: 'hardware',
      tierLabel: 'Physical Microgrid',
      title: 'Microgrid Power Core',
      badge: 'LiFePO4 + INA219',
      icon: '🔋',
      status: '50.02 Hz Harmonic Sync',
      desc: 'Central energy buffer with lithium iron phosphate storage and I2C current sensing to regulate 5V/3A high-speed slot charging rails.',
      specs: {
        'Chemistry': 'LiFePO4 (2,000+ lifecycle cycles)',
        'Sensors': 'INA219 High-Side Current & Bus',
        'Regulation': 'Synchronous DC-DC Buck (24V→5V)',
        'Storage Cap': '480Wh Station Buffer'
      },
      conduits: ['c_pv_power', 'c_power_dock', 'c_power_esp32'],
      flows: ['solar', 'iot'],
      vivaNote: 'INA219 communicates over I2C to detect whether a power bank is actively drawing charging current or fully saturated.'
    },
    esp32: {
      id: 'esp32',
      tier: 'hardware',
      tierLabel: 'Hardware Controller',
      title: 'ESP32 Station IoT Microcontroller',
      badge: 'Dual-Core 240MHz',
      icon: '🎛️',
      status: 'GPIO Latches Ready',
      desc: 'Edge computing master managing 8-bay solenoid ejection latches, RC522 RFID return verification, and SW-420 anti-tamper security.',
      specs: {
        'Core MCU': 'Espressif ESP32-WROOM-32D',
        'Wireless': '2.4GHz Wi-Fi + BLE 4.2',
        'Peripherals': 'RC522 RFID, SW-420, INA219, Relays',
        'Security': 'Hardware Solenoid Watchdog Driver'
      },
      conduits: ['c_power_esp32', 'c_esp32_dock', 'c_esp32_realtime', 'c_esp32_db'],
      flows: ['iot', 'realtime', 'solar'],
      vivaNote: 'The ESP32 runs an asynchronous state machine: on PIN entry or mobile QR approval, it pulses the designated slot relay for 500ms to eject the bank.'
    },
    dock: {
      id: 'dock',
      tier: 'hardware',
      tierLabel: 'Hardware Station',
      title: '8-Bay Smart Ejection Dock',
      badge: 'Solenoid Latches',
      icon: '🗄️',
      status: '8 Slots Online',
      desc: 'Physical modular kiosk enclosure with spring-loaded ejection bays, optical micro-switches, and USB-C magnetic charging contacts.',
      specs: {
        'Solenoid Bays': '8 Discrete Spring Ejection Slots',
        'Return Checks': 'RFID Tag + 5V Current + Limit Switch',
        'Discharge': 'Live Cell Voltage & SoC Monitoring',
        'Cabinet': 'Laser-cut Anodized Solarpunk Steel'
      },
      conduits: ['c_power_dock', 'c_esp32_dock', 'c_dock_bento'],
      flows: ['solar', 'iot'],
      vivaNote: 'Triple-factor return validation prevents theft: the RFID tag UID, 5V current loop, and physical switch must all confirm simultaneous latching.'
    },
    db: {
      id: 'db',
      tier: 'cloud',
      tierLabel: 'Cloud Database',
      title: 'PostgreSQL 15 & Row-Level Security',
      badge: 'Supabase DB',
      icon: '🗄️',
      status: 'RLS Policies Enforced',
      desc: 'Relational database core hosting authenticated rental lifecycles (paid→active→completed), pricing rules, and encrypted station telemetry.',
      specs: {
        'Engine': 'PostgreSQL 15 with pg_cron & triggers',
        'Security': 'Row-Level Security (auth.uid() isolation)',
        'Key Tables': 'public.rentals, profiles, stations',
        'Integrity': 'Strict Finite State Machine Triggers'
      },
      conduits: ['c_esp32_db', 'c_auth_db', 'c_db_realtime', 'c_db_datav', 'c_db_bento'],
      flows: ['auth', 'iot', 'realtime'],
      vivaNote: 'Direct write access is locked by RLS. Rentals start as pending/paid, transition to active upon PIN ejection, and finalize with paise calculation upon return.'
    },
    realtime: {
      id: 'realtime',
      tier: 'cloud',
      tierLabel: 'Cloud Messaging',
      title: 'Realtime WebSocket Broadcast Engine',
      badge: 'RFC 6455 WebSockets',
      icon: '📡',
      status: 'Latency < 12ms',
      desc: 'Bi-directional WebSocket streaming backbone powering instantaneous cross-device laptop-to-phone QR payment approval without database polling.',
      specs: {
        'Protocol': 'Persistent WSS / Phoenix Channels',
        'Channels': 'lg_pay_${sessionId} (Dynamic topic broadcast)',
        'Fallback': 'BroadcastChannel API & LocalStorage Bus',
        'Roundtrip': '< 15ms LAN / < 45ms Global CDN'
      },
      conduits: ['c_esp32_realtime', 'c_db_realtime', 'c_realtime_mobile', 'c_realtime_bento'],
      flows: ['realtime'],
      vivaNote: 'When a student authorizes payment on their smartphone, a broadcast event fires across WebSockets, instantly unlocking the physical laptop kiosk.'
    },
    auth: {
      id: 'auth',
      tier: 'cloud',
      tierLabel: 'Cloud Security',
      title: 'PKCE Auth & Domain Gatekeeper',
      badge: 'Google OAuth2 + E.164',
      icon: '🔐',
      status: '@rvce.edu.in Verified',
      desc: 'Identity provider ensuring student rentals require institutional Google sign-in and verified +91 Indian phone numbers, isolating staff privileges.',
      specs: {
        'Method': 'PKCE (Proof Key for Code Exchange)',
        'Allowed Domain': 'Strict @rvce.edu.in Student Allowlist',
        'Staff RBAC': 'Super Admin & Field Technician Roles',
        'SMS Verification': 'E.164 Format (+91 Indian Phone Validation)'
      },
      conduits: ['c_auth_db', 'c_auth_bento', 'c_auth_datav'],
      flows: ['auth'],
      vivaNote: 'Protects hardware assets from unauthenticated abuse while allowing visitors to explore stations freely in guest mode.'
    },
    bento: {
      id: 'bento',
      tier: 'client',
      tierLabel: 'Student Interface',
      title: 'Student Bento Rental Portal (#app-home)',
      badge: 'Responsive Web SPA',
      icon: '💻',
      status: 'Continuous Time-Dilation',
      desc: 'Unified student command deck featuring GPS campus navigation (Haversine formula), hardware kiosk simulator, and 1x/60x/300x continuous timer dilation.',
      specs: {
        'Routing': 'Single-page Curtain Router (Vanilla ES6+)',
        'Navigation': 'Haversine Great-Circle Geolocation',
        'Kiosk Sim': 'Continuous Time-Dilation Engine',
        'Design System': 'Solarpunk Bento Grid (Outfit + Barlow)'
      },
      conduits: ['c_dock_bento', 'c_realtime_bento', 'c_auth_bento', 'c_bento_mobile', 'c_db_bento'],
      flows: ['solar', 'realtime', 'auth', 'iot'],
      vivaNote: 'The time-dilation engine re-anchors timestamps when toggling speed multipliers (60x/300x) so examiners can test grace windows without resetting elapsed time.'
    },
    mobile: {
      id: 'mobile',
      tier: 'client',
      tierLabel: 'Mobile Gateway',
      title: 'Cross-Device Mobile Gateway (#pay-sim)',
      badge: 'Zero-Install Web App',
      icon: '📱',
      status: 'QR Camera Direct Link',
      desc: 'Mobile-optimized lightweight payment gateway launched directly from standard iOS/Android camera apps via scanned station QR code.',
      specs: {
        'Entry': 'Scanned QR Code (Embedded Session Config)',
        'Payment Sim': 'Instant Webhook Mock / UPI Intent URI',
        'Sync Method': 'Supabase Realtime Broadcast + API Ping',
        'Footprint': 'Zero app installation required (<25KB payload)'
      },
      conduits: ['c_bento_mobile', 'c_realtime_mobile'],
      flows: ['realtime'],
      vivaNote: 'Scanned QR codes encode the station ID, bank category, duration, and calculated fee, maintaining perfect synchronization between laptop and phone.'
    },
    datav: {
      id: 'datav',
      tier: 'client',
      tierLabel: 'Aerospace Console',
      title: '10k Cyber Aerospace Mission Control (#admin)',
      badge: 'DataV Aerospace HUD',
      icon: '🛰️',
      status: 'Stationary Vector Radar',
      desc: 'Isolated telemetry command center featuring stationary RVCE vector radar, 3D Three.js microgrid globe, stepper pricing terminal, and complaints feed.',
      specs: {
        '3D Graphics': 'Three.js (r128) WebGL Energy Globe',
        'Tactical Map': 'Stationary 2D Radar with Polar Rings',
        'Diagnostics': '8-Bay Technician Hardware Matrix',
        'Policy Control': 'Live Stepper Pricing Terminal to DB'
      },
      conduits: ['c_db_datav', 'c_auth_datav'],
      flows: ['iot', 'auth'],
      vivaNote: 'Full theme and layout isolation allows staff and field technicians to monitor solar microgrid harmonic stability without public student elements.'
    }
  };

  const ARCH_CONDUITS = [
    { id: 'c_pv_power', from: 'pv', to: 'power', type: 'solar', label: '24V Raw Solar DC' },
    { id: 'c_pv_esp32', from: 'pv', to: 'esp32', type: 'iot', label: 'Panel Temp & Irradiance' },
    { id: 'c_power_dock', from: 'power', to: 'dock', type: 'solar', label: '5V/3A Slot Rails' },
    { id: 'c_power_esp32', from: 'power', to: 'esp32', type: 'iot', label: 'INA219 I2C Telemetry' },
    { id: 'c_esp32_dock', from: 'esp32', to: 'dock', type: 'iot', label: 'GPIO Relay & RFID' },
    { id: 'c_esp32_realtime', from: 'esp32', to: 'realtime', type: 'realtime', label: 'Kiosk Socket State' },
    { id: 'c_esp32_db', from: 'esp32', to: 'db', type: 'iot', label: 'Heartbeat & Telemetry' },
    { id: 'c_dock_bento', from: 'dock', to: 'bento', type: 'solar', label: 'Power Bank Dispensed' },
    { id: 'c_auth_db', from: 'auth', to: 'db', type: 'auth', label: 'User Token & Roles' },
    { id: 'c_auth_bento', from: 'auth', to: 'bento', type: 'auth', label: 'Student Session (PKCE)' },
    { id: 'c_auth_datav', from: 'auth', to: 'datav', type: 'auth', label: 'Staff Allowlist RBAC' },
    { id: 'c_db_realtime', from: 'db', to: 'realtime', type: 'realtime', label: 'Database CDC Events' },
    { id: 'c_db_datav', from: 'db', to: 'datav', type: 'iot', label: 'Pricing Rules & Logs' },
    { id: 'c_db_bento', from: 'db', to: 'bento', type: 'auth', label: 'Rental History Ledger' },
    { id: 'c_bento_mobile', from: 'bento', to: 'mobile', type: 'realtime', label: 'Scanned QR Intent' },
    { id: 'c_realtime_mobile', from: 'mobile', to: 'realtime', type: 'realtime', label: 'Mobile Approval Broadcast' },
    { id: 'c_realtime_bento', from: 'realtime', to: 'bento', type: 'realtime', label: 'Slot Ejection Trigger' }
  ];

  window.currentArchFilter = 'all';
  window.selectedArchNode = 'esp32';

  window.renderInteractiveArchDiagram = function () {
    const selected = ARCH_NODES[window.selectedArchNode] || ARCH_NODES.esp32;

    const renderNodeCard = (nodeId) => {
      const n = ARCH_NODES[nodeId];
      const isSel = nodeId === window.selectedArchNode;
      const isMuted = window.currentArchFilter !== 'all' && !n.flows.includes(window.currentArchFilter);

      return `
        <div class="arch-node-card ${isSel ? 'selected' : ''} ${isMuted ? 'muted' : ''}" 
             id="arch-node-${n.id}" 
             onclick="window.selectArchNode('${n.id}')"
             onmouseenter="window.highlightArchConduits('${n.id}')"
             onmouseleave="window.resetArchConduits()">
          <div class="arch-node-head">
            <span class="arch-node-icon">${n.icon}</span>
            <span class="arch-node-badge">${n.badge}</span>
          </div>
          <h4 class="arch-node-title">${n.title}</h4>
          <div class="arch-node-meta">
            <span class="arch-status-dot"></span>
            <span class="arch-status-text">${n.status}</span>
          </div>
        </div>
      `;
    };

    return `
      <section class="arch-blueprint-wrapper" aria-label="Interactive System Architecture & Energy-Data Topology">
        <!-- Solarpunk Blueprint Header -->
        <div class="arch-header">
          <div class="arch-header-meta">
            <div class="arch-tag-row">
              <span class="tag arch-blueprint-tag">SYSTEM ARCHITECTURE · RVCE MICROGRID</span>
              <span class="arch-freq-pill"><span class="arch-pulse-dot"></span> 50.02 Hz STABLE · WSS ONLINE</span>
            </div>
            <h2 class="arch-main-title">Interactive End-to-End System & Energy Topology</h2>
            <p class="arch-subtitle">
              Explore how 100% solar DC electricity flows through station batteries to power bank slots, synchronized via ESP32 IoT microcontrollers and Supabase Realtime cloud gateways. Click any subsystem to inspect hardware protocols and viva defense points.
            </p>
          </div>

          <!-- Interactive Subsystem Filter Pills -->
          <div class="arch-filter-pills" role="tablist" aria-label="Filter architecture conduits">
            <button type="button" class="arch-filter-btn ${window.currentArchFilter === 'all' ? 'active' : ''}" onclick="window.filterArchConduits('all')">⚡ All Subsystems</button>
            <button type="button" class="arch-filter-btn ${window.currentArchFilter === 'solar' ? 'active' : ''}" onclick="window.filterArchConduits('solar')">☀️ Solar DC Power</button>
            <button type="button" class="arch-filter-btn ${window.currentArchFilter === 'iot' ? 'active' : ''}" onclick="window.filterArchConduits('iot')">📡 IoT & ESP32 Latches</button>
            <button type="button" class="arch-filter-btn ${window.currentArchFilter === 'realtime' ? 'active' : ''}" onclick="window.filterArchConduits('realtime')">🔄 Realtime QR Sync</button>
            <button type="button" class="arch-filter-btn ${window.currentArchFilter === 'auth' ? 'active' : ''}" onclick="window.filterArchConduits('auth')">🔐 Auth & PostgreSQL</button>
          </div>
        </div>

        <!-- Architecture Canvas with 3 Responsive Tiers -->
        <div class="arch-diagram-grid">
          <!-- TIER 1: Physical Solar Microgrid & Hardware Kiosk -->
          <div class="arch-tier-column tier-hardware">
            <div class="arch-tier-header">
              <div class="arch-tier-icon">☀️</div>
              <div>
                <span class="arch-tier-step">TIER 01 // PHYSICAL LAYER</span>
                <h3 class="arch-tier-title">Solar Microgrid & Hardware Kiosk</h3>
              </div>
            </div>
            <div class="arch-tier-nodes">
              ${renderNodeCard('pv')}
              ${renderNodeCard('power')}
              ${renderNodeCard('esp32')}
              ${renderNodeCard('dock')}
            </div>
          </div>

          <!-- TIER 2: Cloud Infrastructure & Security Core -->
          <div class="arch-tier-column tier-cloud">
            <div class="arch-tier-header">
              <div class="arch-tier-icon">☁️</div>
              <div>
                <span class="arch-tier-step">TIER 02 // CLOUD & LOGIC</span>
                <h3 class="arch-tier-title">Supabase Cloud & Security Engine</h3>
              </div>
            </div>
            <div class="arch-tier-nodes">
              ${renderNodeCard('db')}
              ${renderNodeCard('realtime')}
              ${renderNodeCard('auth')}
            </div>
          </div>

          <!-- TIER 3: Client Experience & Aerospace Consoles -->
          <div class="arch-tier-column tier-client">
            <div class="arch-tier-header">
              <div class="arch-tier-icon">💻</div>
              <div>
                <span class="arch-tier-step">TIER 03 // CLIENT INTERFACES</span>
                <h3 class="arch-tier-title">Client Portals & Aerospace HUD</h3>
              </div>
            </div>
            <div class="arch-tier-nodes">
              ${renderNodeCard('bento')}
              ${renderNodeCard('mobile')}
              ${renderNodeCard('datav')}
            </div>
          </div>
        </div>

        <!-- Dynamic Telemetry Inspection HUD Card -->
        <div class="arch-telemetry-hud" id="arch-hud-container">
          <div class="arch-hud-badge-row">
            <span class="badge" style="background:var(--ac);color:var(--on);font-weight:700">${selected.tierLabel.toUpperCase()}</span>
            <span class="arch-hud-id-tag">SUBSYSTEM REF: [${selected.id.toUpperCase()}]</span>
            <span class="arch-hud-live-tag">● REALTIME ACTIVE</span>
          </div>

          <div class="arch-hud-grid">
            <div class="arch-hud-left">
              <div class="arch-hud-title-box">
                <span class="arch-hud-icon-lg">${selected.icon}</span>
                <div>
                  <h3 class="arch-hud-name">${selected.title}</h3>
                  <div class="arch-hud-sub">${selected.badge} · Operational State: <b style="color:var(--ac)">${selected.status}</b></div>
                </div>
              </div>
              <p class="arch-hud-desc">${selected.desc}</p>
              
              <!-- Viva Academic Defense Callout -->
              <div class="arch-hud-viva">
                <span class="arch-viva-label">💡 VIVA PRESENTATION DEFENSE POINT</span>
                <p>${selected.vivaNote}</p>
              </div>
            </div>

            <div class="arch-hud-right">
              <h4 class="arch-specs-header">Technical Specifications & Interfaces</h4>
              <div class="arch-specs-table">
                ${Object.entries(selected.specs).map(([k, v]) => `
                  <div class="arch-spec-row">
                    <span class="arch-spec-key">${k}</span>
                    <span class="arch-spec-val">${v}</span>
                  </div>
                `).join('')}
              </div>

              <div class="arch-hud-actions">
                <button type="button" class="btn arch-action-btn" onclick="window.simulateArchPulse('${selected.id}')">
                  ⚡ Simulate Component Pulse
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  window.selectArchNode = function (nodeId) {
    if (!ARCH_NODES[nodeId]) return;
    window.selectedArchNode = nodeId;
    const mount = document.getElementById('interactive-arch-mount');
    if (mount) {
      mount.innerHTML = window.renderInteractiveArchDiagram();
    }
  };

  window.filterArchConduits = function (filterType) {
    window.currentArchFilter = filterType;
    const mount = document.getElementById('interactive-arch-mount');
    if (mount) {
      mount.innerHTML = window.renderInteractiveArchDiagram();
    }
  };

  window.highlightArchConduits = function (nodeId) {
    const node = ARCH_NODES[nodeId];
    if (!node) return;
    document.querySelectorAll('.arch-node-card').forEach(el => {
      const id = el.id.replace('arch-node-', '');
      if (id === nodeId) {
        el.classList.add('hover-highlight');
      } else {
        const isConnected = ARCH_CONDUITS.some(c => 
          (c.from === nodeId && c.to === id) || (c.to === nodeId && c.from === id)
        );
        if (isConnected) el.classList.add('hover-connected');
        else el.classList.add('hover-dim');
      }
    });
  };

  window.resetArchConduits = function () {
    document.querySelectorAll('.arch-node-card').forEach(el => {
      el.classList.remove('hover-highlight', 'hover-connected', 'hover-dim');
    });
  };

  window.simulateArchPulse = function (nodeId) {
    const node = ARCH_NODES[nodeId];
    if (!node) return;
    const card = document.getElementById(`arch-node-${nodeId}`);
    if (card) {
      card.classList.add('pulsing');
      setTimeout(() => card.classList.remove('pulsing'), 1000);
    }
    if (typeof toast === 'function') {
      toast(`⚡ Telemetry Pulse Fired: ${node.title} · Conduits Synchronized`);
    }
  };
})();
