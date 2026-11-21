// js/arch-diagram.js - Interactive Dual-Track Semi-Flowchart Architecture & Energy-Data Topology
// Solarpunk & Aerospace Engineering Blueprint for LumenGrove RVCE

(function () {
  const ARCH_FLOW_STEPS = {
    // --- TRACK A: Physical Solar Energy Pipeline ---
    pv: {
      id: 'pv',
      track: 'A',
      trackName: 'TRACK A // SOLAR ENERGY PIPELINE',
      stepNumber: '01',
      stepTitle: 'Photovoltaic Harvest',
      title: 'Bifacial Solar PV Array',
      badge: '200W Bifacial Canopy',
      icon: '☀️',
      status: '210W Peak Harvest',
      inputDesc: 'Direct campus sunlight (1,000 W/m²) + Ground pavement albedo reflections',
      outputDesc: '24V DC Raw Solar Power to Microgrid Power Core',
      desc: 'Bifacial solar canopy converts incident sunlight and campus ground reflections into clean DC current with high efficiency MPPT tracking.',
      specs: {
        'Array Rating': '200W Bifacial Monocrystalline',
        'Operating Voltage': '24V Nominal DC (18V-36V Vmp)',
        'MPPT Tracking': 'High-speed Perturb & Observe (98.4%)',
        'Sensor Bus': 'DS18B20 Panel Temp (33.5°C)'
      },
      inputs: [],
      outputs: ['power'],
      crossConduits: ['esp32'],
      vivaNote: 'Bifacial design increases energy capture by 18-24% on campus concrete pavement compared to standard monofacial panels.'
    },
    power: {
      id: 'power',
      track: 'A',
      trackName: 'TRACK A // SOLAR ENERGY PIPELINE',
      stepNumber: '02',
      stepTitle: 'Storage & Regulation',
      title: 'Microgrid Power Core',
      badge: 'LiFePO4 + INA219 Bus',
      icon: '🔋',
      status: '50.02 Hz Stable Microgrid',
      inputDesc: '24V Raw DC from Solar PV Array',
      outputDesc: 'Regulated 5V/3A DC Rails to 8-Bay Hardware Dock',
      desc: 'Lithium Iron Phosphate buffer battery balances solar intermittency, providing steady 5V/3A power rails to all 8 hardware bays even during heavy clouds.',
      specs: {
        'Buffer Battery': '24V 20Ah LiFePO4 (480Wh Capacity)',
        'Buck Conversion': '24V to 5V Synchronous Step-Down',
        'Telemetry IC': 'INA219 High-Side Voltage/Current Monitor',
        'Charging Rail': '8 Discrete 5V/3A Dedicated Power Ports'
      },
      inputs: ['pv'],
      outputs: ['dock'],
      crossConduits: ['esp32'],
      vivaNote: 'INA219 communicates with ESP32 via I2C at 400kHz to dynamically throttle power allocation when multiple discharged banks are returned.'
    },
    dock: {
      id: 'dock',
      track: 'A',
      trackName: 'TRACK A // SOLAR ENERGY PIPELINE',
      stepNumber: '03',
      stepTitle: 'Smart Latch & Docking',
      title: '8-Bay Hardware Dock',
      badge: 'Solenoid Latching Bays',
      icon: '🗄️',
      status: '8 Slots Latched & Ready',
      inputDesc: '5V Charging Rails + ESP32 Solenoid Release Pulse',
      outputDesc: 'Ejected Solar Power Bank to Student',
      desc: 'Precision laser-cut modular kiosk cabinet equipped with spring-loaded solenoid ejection latches, magnetic charging contacts, and mechanical micro-switches.',
      specs: {
        'Solenoid Spec': '12V 1.2A Heavy-Duty Pull-Type (JF-0824B)',
        'Return Checks': 'RFID UID + 5V Current Draw + Limit Switch',
        'Contacts': 'Gold-Plated Magnetic Spring Pogo Pins',
        'Cabinet Enclosure': 'Powder-Coated Solarpunk Modular Steel'
      },
      inputs: ['power'],
      outputs: ['bank'],
      crossConduits: ['esp32'],
      vivaNote: 'Triple-factor physical validation guarantees power banks cannot be forcibly removed or falsely claimed as returned without authentic latch contact.'
    },
    bank: {
      id: 'bank',
      track: 'A',
      trackName: 'TRACK A // SOLAR ENERGY PIPELINE',
      stepNumber: '04',
      stepTitle: 'Active Utilization',
      title: 'Active Power Bank Session',
      badge: 'Solar Stored Energy In-Use',
      icon: '⚡',
      status: 'High-Speed USB-PD Active',
      inputDesc: 'Ejected Power Bank with 100% Solar Charge',
      outputDesc: 'Clean Power to Student Device + Live Battery Telemetry',
      desc: 'High-capacity solar power bank powering student laptops and smartphones with continuous state-of-charge discharge and time-dilation tracking.',
      specs: {
        'Cell Chemistry': 'High-Density INR18650-35E Li-ion Cells',
        'Outputs': 'USB-C PD 65W (Laptop) + Dual USB-A 18W (Phone)',
        'Discharge Telemetry': '3.60V - 4.18V Cell Curve Simulation',
        'Cycle Durability': '800+ Full Discharge Cycles @ >80% Cap'
      },
      inputs: ['dock'],
      outputs: [],
      crossConduits: ['bento'],
      vivaNote: 'Continuous mathematical time-dilation allows testing 1-hour sessions in 1 minute (60x) or 12 seconds (300x) without timer resets.'
    },

    // --- TRACK B: Digital Control, Cloud & Telemetry Loop ---
    bento: {
      id: 'bento',
      track: 'B',
      trackName: 'TRACK B // IOT & CLOUD CONTROL LOOP',
      stepNumber: '01',
      stepTitle: 'Session Reservation',
      title: 'Student Bento Portal (#app-home)',
      badge: 'Web Single-Page App',
      icon: '💻',
      status: 'GPS Geolocation Synced',
      inputDesc: 'Student Interaction, Campus GPS Location & PKCE Token',
      outputDesc: 'Encrypted QR Checkout Pass & Station Configuration',
      desc: 'Primary student interface with real-time station availability radar, Haversine nearest kiosk distance calculation, and checkout configuration pass generator.',
      specs: {
        'Architecture': 'Single-Page Vanilla ES6+ Curtain Router',
        'Geolocation': 'HTML5 Navigator Geolocation + Haversine',
        'Security Mode': 'Guest Lockout Protection Modal',
        'Accessibility': 'Bilingual (English, Kannada, Hindi)'
      },
      inputs: ['bank'],
      outputs: ['mobile'],
      crossConduits: ['cloud'],
      vivaNote: 'Dynamic Haversine distance recalculates every 3 seconds as the student walks toward Central Library or Cauvery Canteen.'
    },
    mobile: {
      id: 'mobile',
      track: 'B',
      trackName: 'TRACK B // IOT & CLOUD CONTROL LOOP',
      stepNumber: '02',
      stepTitle: 'Cross-Device Redirect',
      title: 'Cross-Device Mobile Gateway (#pay-sim)',
      badge: 'Zero-Install Web Gateway',
      icon: '📱',
      status: 'Instant Camera Link',
      inputDesc: 'Scanned Station QR Code with Session Hash Parameters',
      outputDesc: 'Realtime Payment Approval Broadcast to Kiosk',
      desc: 'Lightweight web gateway launched instantly from phone camera with zero app installation, allowing simulation of UPI payment authorization.',
      specs: {
        'URL Parsing': 'Dual Query Parser (Hash `#pay-sim?` + Search `?`)',
        'Intent URI': 'upi://pay?pa=lumengrove@rvce&pn=LumenGrove',
        'Cross-Device Sync': 'Supabase Realtime Channel Broadcast',
        'Client Footprint': '< 20 KB Payload Size (Zero Install)'
      },
      inputs: ['bento'],
      outputs: ['cloud'],
      crossConduits: [],
      vivaNote: 'Using Supabase WebSockets eliminates the need to expose a local backend server or write unauthenticated payment records to the database.'
    },
    cloud: {
      id: 'cloud',
      track: 'B',
      trackName: 'TRACK B // IOT & CLOUD CONTROL LOOP',
      stepNumber: '03',
      stepTitle: 'Realtime Cloud Hub',
      title: 'Supabase Cloud & Realtime Engine',
      badge: 'PostgreSQL 15 + WebSockets',
      icon: '☁️',
      status: 'WSS WebSocket < 12ms',
      inputDesc: 'Payment Approval Broadcast from Mobile Phone',
      outputDesc: 'Slot Unlocked Event to Kiosk + ACID Rental Record',
      desc: 'Cloud hub executing Row-Level Security policies, managing authenticated rental state machines (paid→active→completed), and broadcasting live unlock events.',
      specs: {
        'Database': 'PostgreSQL 15 with pg_cron & SQL Triggers',
        'WebSocket Protocol': 'RFC 6455 Persistent Duplex Phoenix Channels',
        'Security Layer': 'Row-Level Security (auth.uid() isolation)',
        'Auth Gatekeeper': 'PKCE Google OAuth with @rvce.edu.in Check'
      },
      inputs: ['mobile'],
      outputs: ['esp32'],
      crossConduits: ['bento', 'datav'],
      vivaNote: 'Database validation triggers strictly enforce finite state transitions so a rental can never jump directly from pending to completed.'
    },
    esp32: {
      id: 'esp32',
      track: 'B',
      trackName: 'TRACK B // IOT & CLOUD CONTROL LOOP',
      stepNumber: '04',
      stepTitle: 'Edge Hardware Control',
      title: 'ESP32 Station IoT Controller',
      badge: 'Dual-Core 240MHz MCU',
      icon: '🎛️',
      status: 'Hardware Relays Ready',
      inputDesc: 'PIN Match / Realtime Slot Release Signal from Cloud',
      outputDesc: '500ms Solenoid GPIO Fire Pulse + Station Telemetry',
      desc: 'Physical edge microcontroller orchestrating station hardware: drives solenoid relays, monitors current via INA219, and checks RFID return credentials.',
      specs: {
        'MCU': 'Espressif ESP32-WROOM-32D (240MHz, 520KB SRAM)',
        'Connectivity': '802.11 b/g/n Wi-Fi + Bluetooth Low Energy',
        'GPIO Outputs': '8x Opto-isolated Solenoid Driver Channels',
        'Sensor Inputs': 'RC522 SPI, INA219 I2C, SW-420 Digital'
      },
      inputs: ['cloud'],
      outputs: ['datav'],
      crossConduits: ['pv', 'power', 'dock'],
      vivaNote: 'The firmware runs non-blocking FreeRTOS tasks to guarantee instant solenoid response time (<50ms) upon valid PIN authentication.'
    },
    datav: {
      id: 'datav',
      track: 'B',
      trackName: 'TRACK B // IOT & CLOUD CONTROL LOOP',
      stepNumber: '05',
      stepTitle: 'Aerospace Telemetry',
      title: '10k Cyber Aerospace Mission Control (#admin)',
      badge: 'DataV Telemetry Command HUD',
      icon: '🛰️',
      status: 'Stationary Tactical Radar',
      inputDesc: 'Station Sensor Feed + Microgrid Inverter Telemetry',
      outputDesc: 'Live Dynamic Pricing Commits & Field Staff Dispatch',
      desc: 'Tactical aerospace telemetry console providing stationary RVCE vector radar targeting, 3D Three.js microgrid globe, stepper pricing terminal, and complaints desk.',
      specs: {
        '3D Visualizer': 'Three.js (r128) WebGL Particle Sphere',
        'Tactical Map': 'Stationary Vector Radar with Polar Rings',
        'Technician Matrix': '8-Bay Hardware Diagnostic Inspection Matrix',
        'Policy Deck': 'Real-Time Stepper Pricing committed to Supabase'
      },
      inputs: ['esp32'],
      outputs: [],
      crossConduits: ['cloud'],
      vivaNote: 'Complete theme isolation separates staff maintenance operations from public student views, adhering to industrial SCADA design standards.'
    }
  };

  const TRACK_A_ORDER = ['pv', 'power', 'dock', 'bank'];
  const TRACK_B_ORDER = ['bento', 'mobile', 'cloud', 'esp32', 'datav'];

  window.currentArchFilter = 'all'; // 'all', 'trackA', 'trackB', 'bridges'
  window.selectedArchNode = 'esp32';

  window.renderInteractiveArchDiagram = function () {
    const activeStep = ARCH_FLOW_STEPS[window.selectedArchNode] || ARCH_FLOW_STEPS.esp32;

    const renderFlowCard = (nodeId) => {
      const step = ARCH_FLOW_STEPS[nodeId];
      const isSelected = nodeId === window.selectedArchNode;

      // Determine spotlight roles relative to selected step
      let isInput = activeStep.inputs && activeStep.inputs.includes(nodeId);
      let isOutput = activeStep.outputs && activeStep.outputs.includes(nodeId);
      let isBridge = activeStep.crossConduits && activeStep.crossConduits.includes(nodeId);

      let cardClasses = ['flow-card'];
      if (isSelected) {
        cardClasses.push('flow-card-active');
      } else if (isInput) {
        cardClasses.push('flow-card-input');
      } else if (isOutput) {
        cardClasses.push('flow-card-output');
      } else if (isBridge) {
        cardClasses.push('flow-card-bridge');
      } else {
        cardClasses.push('flow-card-dim');
      }

      // Check filter muting
      if (window.currentArchFilter === 'trackA' && step.track !== 'A') {
        cardClasses.push('flow-track-muted');
      } else if (window.currentArchFilter === 'trackB' && step.track !== 'B') {
        cardClasses.push('flow-track-muted');
      } else if (window.currentArchFilter === 'bridges' && !isBridge && !isSelected) {
        cardClasses.push('flow-track-muted');
      }

      return `
        <div class="${cardClasses.join(' ')}" 
             id="flow-step-${step.id}"
             onclick="window.selectArchNode('${step.id}')"
             onmouseenter="window.highlightFlowStep('${step.id}')"
             onmouseleave="window.resetFlowStepHighlight()">
          <div class="flow-card-top">
            <span class="flow-step-tag">STEP ${step.track}-${step.stepNumber}</span>
            <span class="flow-step-icon">${step.icon}</span>
          </div>
          <h4 class="flow-step-name">${step.title}</h4>
          <div class="flow-step-sub">${step.stepTitle}</div>
          <div class="flow-step-status">
            <span class="flow-status-dot"></span>
            <span>${step.status}</span>
          </div>
        </div>
      `;
    };

    const renderFlowConnector = (label, arrow = '►') => `
      <div class="flow-connector">
        <div class="flow-connector-line">
          <span class="flow-pulse-particle"></span>
        </div>
        <div class="flow-connector-arrow">${arrow}</div>
        <div class="flow-connector-label">${label}</div>
      </div>
    `;

    return `
      <section class="arch-flowchart-blueprint" aria-label="Interactive Dual-Track System Architecture Flowchart">
        <!-- Blueprint Header -->
        <div class="arch-flow-header">
          <div class="arch-flow-meta">
            <div class="arch-tag-row">
              <span class="tag arch-blueprint-tag">SYSTEM TOPOLOGY // SEMI-FLOWCHART</span>
              <span class="arch-freq-pill"><span class="arch-pulse-dot"></span> DUAL-TRACK CLOSED LOOP · 50.02 Hz STABLE</span>
            </div>
            <h2 class="arch-flow-title">Dual-Track Energy & Control Flowchart</h2>
            <p class="arch-flow-desc">
              Visualizing how clean solar DC power flows physically from photovoltaic canopies to charging docks (Track A), synchronized in a closed loop with edge microcontrollers and real-time cloud triggers (Track B). Click any step to trace inputs, outputs, and hardware defense points.
            </p>
          </div>

          <!-- Flow Filter Controls -->
          <div class="flow-filter-controls">
            <button type="button" class="flow-filter-btn ${window.currentArchFilter === 'all' ? 'active' : ''}" onclick="window.filterArchConduits('all')">
              ⚡ Both Tracks (Overview)
            </button>
            <button type="button" class="flow-filter-btn ${window.currentArchFilter === 'trackA' ? 'active' : ''}" onclick="window.filterArchConduits('trackA')">
              ☀️ Track A: Solar Power Pipeline
            </button>
            <button type="button" class="flow-filter-btn ${window.currentArchFilter === 'trackB' ? 'active' : ''}" onclick="window.filterArchConduits('trackB')">
              📡 Track B: IoT Control & Cloud Loop
            </button>
            <button type="button" class="flow-filter-btn ${window.currentArchFilter === 'bridges' ? 'active' : ''}" onclick="window.filterArchConduits('bridges')">
              🔄 Cross-Track Bridges Only
            </button>
          </div>
        </div>

        <!-- TRACK A: Physical Solar Energy Pipeline -->
        <div class="flow-track-lane track-a-lane">
          <div class="flow-track-badge-row">
            <span class="flow-track-id">TRACK A // PHYSICAL PIPELINE</span>
            <span class="flow-track-heading">⚡ Solar Generation, Storage & Bay Latch Rails</span>
            <span class="flow-track-meta">DIRECTIONAL DC TRANSMISSION</span>
          </div>
          <div class="flow-steps-row">
            ${renderFlowCard('pv')}
            ${renderFlowConnector('24V Raw DC')}
            ${renderFlowCard('power')}
            ${renderFlowConnector('5V/3A Rails')}
            ${renderFlowCard('dock')}
            ${renderFlowConnector('Latch Release')}
            ${renderFlowCard('bank')}
          </div>
        </div>

        <!-- INTER-TRACK BRIDGES (Cross-Track Energy <-> Control Pulses) -->
        <div class="flow-intertrack-bridge-indicator">
          <div class="bridge-line-left"></div>
          <div class="bridge-center-badge">
            <span class="bridge-dot"></span>
            <span class="bridge-text">BIDIRECTIONAL CROSS-TRACK TELEMETRY & SOLENOID ACTUATION BUS</span>
            <span class="bridge-dot"></span>
          </div>
          <div class="bridge-line-right"></div>
        </div>

        <!-- TRACK B: Digital Control, Cloud & Telemetry Loop -->
        <div class="flow-track-lane track-b-lane">
          <div class="flow-track-badge-row">
            <span class="flow-track-id">TRACK B // DIGITAL CONTROL LOOP</span>
            <span class="flow-track-heading">📡 Edge Microcontroller, WebSocket Broadcast & Cloud RLS</span>
            <span class="flow-track-meta">FULL-DUPLEX REALTIME SYNC</span>
          </div>
          <div class="flow-steps-row">
            ${renderFlowCard('bento')}
            ${renderFlowConnector('QR Intent')}
            ${renderFlowCard('mobile')}
            ${renderFlowConnector('WSS Broadcast')}
            ${renderFlowCard('cloud')}
            ${renderFlowConnector('Edge Trigger')}
            ${renderFlowCard('esp32')}
            ${renderFlowConnector('Telemetry Feed')}
            ${renderFlowCard('datav')}
          </div>
        </div>

        <!-- Dynamic Flow Telemetry HUD Card -->
        <div class="flow-telemetry-hud" id="flow-hud-container">
          <div class="flow-hud-top-bar">
            <span class="badge" style="background:var(--ac);color:var(--on);font-weight:700">FLOW STAGE: [TRACK ${activeStep.track} · STEP ${activeStep.stepNumber}]</span>
            <span class="flow-hud-subsystem">${activeStep.trackName}</span>
            <span class="flow-hud-live-tag">● SYNCHRONIZED</span>
          </div>

          <div class="flow-hud-content-grid">
            <!-- Left Column: Component Description & I/O Streams -->
            <div class="flow-hud-left-col">
              <div class="flow-hud-name-row">
                <span class="flow-hud-big-icon">${activeStep.icon}</span>
                <div>
                  <h3 class="flow-hud-name">${activeStep.title}</h3>
                  <div class="flow-hud-stage-sub">${activeStep.badge} · Operational State: <b style="color:var(--ac)">${activeStep.status}</b></div>
                </div>
              </div>
              <p class="flow-hud-desc">${activeStep.desc}</p>

              <!-- Real-time Flow Stream Cards -->
              <div class="flow-streams-box">
                <div class="flow-stream-item stream-in">
                  <span class="stream-label">◄ INPUT STREAM</span>
                  <div class="stream-val">${activeStep.inputDesc || 'Direct User / Solar Initiation'}</div>
                </div>
                <div class="flow-stream-item stream-out">
                  <span class="stream-label">OUTPUT TARGET ►</span>
                  <div class="stream-val">${activeStep.outputDesc || 'Terminal Consumer / Admin Display'}</div>
                </div>
              </div>
            </div>

            <!-- Right Column: Technical Specs & Pulse Action -->
            <div class="flow-hud-right-col">
              <h4 class="flow-specs-title">Hardware Specs & Data Protocols</h4>
              <div class="flow-specs-list">
                ${Object.entries(activeStep.specs).map(([k, v]) => `
                  <div class="flow-spec-row">
                    <span class="flow-spec-key">${k}</span>
                    <span class="flow-spec-val">${v}</span>
                  </div>
                `).join('')}
              </div>

              <div class="flow-action-wrapper">
                <button type="button" class="btn flow-pulse-btn" onclick="window.simulateFlowPulse('${activeStep.id}')">
                  ⚡ Simulate Flow Pulse through this Step
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  window.selectArchNode = function (nodeId) {
    if (!ARCH_FLOW_STEPS[nodeId]) return;
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

  window.highlightFlowStep = function (nodeId) {
    const step = ARCH_FLOW_STEPS[nodeId];
    if (!step) return;
    document.querySelectorAll('.flow-card').forEach(card => {
      const id = card.id.replace('flow-step-', '');
      if (id === nodeId) {
        card.classList.add('flow-hover-focus');
      } else if (step.inputs.includes(id) || step.outputs.includes(id) || (step.crossConduits && step.crossConduits.includes(id))) {
        card.classList.add('flow-hover-linked');
      }
    });
  };

  window.resetFlowStepHighlight = function () {
    document.querySelectorAll('.flow-card').forEach(card => {
      card.classList.remove('flow-hover-focus', 'flow-hover-linked');
    });
  };

  window.simulateFlowPulse = function (nodeId) {
    const step = ARCH_FLOW_STEPS[nodeId];
    if (!step) return;
    const card = document.getElementById(`flow-step-${nodeId}`);
    if (card) {
      card.classList.add('flow-pulsing');
      setTimeout(() => card.classList.remove('flow-pulsing'), 900);
    }
    document.querySelectorAll('.flow-pulse-particle').forEach(p => {
      p.classList.add('pulse-boost');
      setTimeout(() => p.classList.remove('pulse-boost'), 900);
    });
    if (typeof toast === 'function') {
      toast(`⚡ Flow Pulse Transmitted: ${step.title} (${step.stepTitle})`);
    }
  };
})();
