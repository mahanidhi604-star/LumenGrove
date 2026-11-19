# 🎯 LumenGrove · Evaluator Demo Cheat Sheet & Presentation Script

> **Target Presentation Time:** 3 – 4 Minutes  
> **Key Goal:** Showcase technical rigor, responsive design, off-grid sustainability, and hardware-grade telemetry.

---

## ⏱️ Step-by-Step Presentation Script

### 🕒 Minute 1: Introduction & Student Problem Statement
**What to say:**
> *"Respected evaluators, today we present **LumenGrove**—a decentralized, 100% solar-powered IoT microgrid and portable power bank network built specifically for the RVCE campus. On campus, students and faculty are constantly on the move, but traditional charging lockers tether users to one spot and rely on grid electricity. LumenGrove solves this with off-grid bifacial solar kiosks placed at high-density hubs: Central Library, M.M Foods, Big Mingoes, and Cauvery Canteen."*

**What to do on screen:**
1. Open the homepage (`#app-home`).
2. Show the Bento Rental Hub with live campus status and solar throughput metrics.

---

### 🕒 Minute 2: Guest Security & Verified Student Flow
**What to say:**
> *"To prevent hardware loss while keeping discovery open to everyone, we implemented **Guest Lock-On Protection**. Unauthenticated guests can view live kiosk telemetry and rates, but duration and reservation controls are securely locked until signed in with a verified institution account. Upon sign-in, we enforce Indian `+91` verified phone persistence directly linked to their Supabase profile for hardware return accountability."*

**What to do on screen:**
1. While unauthenticated, drag or click the rent duration slider.
2. Show the locked overlay and click **`Sign In to Rent`** (or use the one-click demo student profile).
3. Notice how the Rental Hub unlocks, showing the active rental slider and verified phone.
4. Scroll to the **Campus Map**: click to show the device geolocation, Haversine distance, and walking time to Central Library.

---

### 🕒 Minute 3: 10k Cyber Aerospace Mission Control (`DataV`)
**What to say:**
> *"Where LumenGrove truly stands out is our administrative architecture. Rather than a basic CRUD table, we built a **DataV Cyber Aerospace Telemetry Command Center**. In staff mode, the entire student theme is isolated. We monitor microgrid harmonics at 50 Hz, solar inflow vectors, and an interactive 3D spherical microgrid globe."*

**What to do on screen:**
1. Navigate to **Staff** (`#admin-login`) and click **"Demo Super Admin"**.
2. Point out the **Campus Energy Flow Topology Radar** on the top-left (no generic icons—pure solar engineering telemetry).
3. Hover over the 3D globe to pause rotation; click **`[📍 M.M Foods]`**.
4. Show how the 3D globe locks focus onto M.M Foods with glowing target reticles, renders the **Station Inspection HUD**, and automatically synchronizes the **8-Bay Hardware Diagnostics Matrix** below.

---

### 🕒 Minute 4: Customer Complaints Hub & Public Return
**What to say:**
> *"Finally, we integrated a real-time **Customer Complaints Hub** directly into mission control. If a student encounters an issue—such as a solenoid lock sticking or kiosk touchscreen delay—staff can immediately filter tickets, view the student's verified phone number, dispatch a field technician, or resolve and archive the ticket in real time."*

**What to do on screen:**
1. In the top bar, click the tab: **`[📋 CUSTOMER COMPLAINTS]`**.
2. Type in search (e.g., student name or `+919876543210`) or filter by `OPEN`.
3. Click **`[🛠️ DISPATCH TECHNICIAN]`** or **`[✓ MARK AS RESOLVED]`** to show the live KPI and badge update.
4. Click **`[🌐 PUBLIC PORTAL]`** in the top-left to demonstrate instantaneous return to the student view.

---

## 🛡️ Evaluator Q&A Defense Guide

| Anticipated Question | Prepared Technical Answer |
|---|---|
| **"How do you handle hardware communication if the kiosk is off-grid?"** | *"Each kiosk operates an ESP32 microcontroller with an MPPT charge controller over MQTT / WebSockets to Supabase Realtime. If LTE/Wi-Fi drops, state transactions are cached in local kiosk flash EEPROM and synced upon reconnection."* |
| **"Why Vanilla JavaScript instead of React or Next.js?"** | *"Vanilla ES6+ with CSS Grid bento layout and Three.js gives us sub-100ms load times, zero hydration latency, and an ultra-lightweight bundle without framework overhead—ideal for low-bandwidth campus mobile networks."* |
| **"How is student data and rental safety secured?"** | *"We enforce PostgreSQL Row-Level Security (RLS) on Supabase. Unauthenticated guests cannot query rental records or dispatch commands. All phone numbers are strictly formatted and validated with verified Indian mobile prefixes (`+91`)."* |
| **"What happens during monsoon or overcast days?"** | *"Each kiosk has an integrated 24V $100\text{ Ah}$ Lithium Iron Phosphate ($\text{LiFePO}_4$) reserve battery buffer, maintaining kiosk operations for up to 48 hours without direct solar irradiance."* |

---

## 🛟 Emergency Viva Contingency Plan

- **If Wi-Fi drops on the projector laptop:**  
  The application runs entirely offline on `http://localhost:3000` via `npm start`. Local mock state is pre-seeded with all stations, 8-bay status, and complaints.
- **If the evaluator asks to test on their own phone:**  
  Connect the phone to the same local Wi-Fi hotspot or open the live Vercel deployment URL. The responsive bento layout is pre-tested on mobile viewports.
