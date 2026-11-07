// js/data.js - Static datasets: Stations, Bank Categories, Pricing Rules, Campus Venues, Knowledge Base

const ST = [
  ['library', 'Library', 425, 384],
  ['mm', 'M.M Foods', 560, 377],
  ['mingoes', 'Big Mingoes', 175, 471],
  ['cauvery', 'Cauvery Hostel', 780, 387]
].map((a, i) => ({
  id: a[0],
  n: a[1],
  x: a[2],
  y: a[3],
  lat: null,
  lng: null,
  slots: 8,
  free: 3 + i,
  stock: { std: 3, lap: 2, fast: 1 + (i % 2), wl: 2 },
  solar: 200 + i * 40,
  batt: 70 + i * 5,
  temp: 34,
  ok: true,
  h: [...Array(30)].map((_, j) => (200 + i * 40) + Math.sin(j / 3 + a[2]) * 25)
}));

const PR = {
  rate: '',
  grace: 10,
  cap: '',
  late: '',
  dep: ''
};

const CATS = {
  std: { n: 'Grove Phone', p: '5V / 10W', d: 'Mobile charging', dr: 0.05, i: 'M7 3h10v18H7z' },
  lap: { n: 'Grove Laptop', p: '65W', d: 'USB-C laptop charging', dr: 0.12, i: 'M4 5h16v11H4zM2 19h20' },
  fast: { n: 'Grove Fast', p: '100W dual', d: 'Laptop and phone at once', dr: 0.2, i: 'M13 2 4 14h7l-1 8 9-12h-7z' },
  wl: { n: 'Grove Wireless', p: '15W magnetic', d: 'Magnetic wireless pad', dr: 0.08, i: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z' }
};

const VN = [
  ['metro', 'Metro', 240, 32, 115, 34, 'gate'],
  ['gate', 'Main Gate', 360, 32, 70, 34, 'gate'],
  ['atm', 'ATM', 440, 32, 80, 34, 'fac'],
  ['hub', 'DTL Hub', 95, 105, 120, 58, 'hub'],
  ['admin', 'Admin Block', 255, 105, 145, 65, 'admin'],
  ['civil', 'Civil', 435, 105, 110, 60, 'dept'],
  ['ground', 'Main Stage · CS Ground', 610, 120, 160, 105, 'fac'],
  ['parking', 'Parking', 775, 150, 95, 150, 'fac'],
  ['mech', 'Mech', 95, 185, 120, 58, 'dept'],
  ['workshops', 'Workshops', 235, 190, 90, 50, 'fac'],
  ['maint', 'Maintenance', 340, 190, 80, 50, 'fac'],
  ['eee', 'EEE', 445, 185, 110, 55, 'dept'],
  ['cse', 'CSE', 565, 235, 115, 60, 'dept'],
  ['cauvery', 'Cauvery Hostel', 715, 310, 130, 155, 'hostel', 1],
  ['quad', 'BT Quad', 95, 265, 120, 58, 'fac'],
  ['aiml', 'AI-ML & MCA', 95, 345, 120, 55, 'dept'],
  ['rvu', 'RV University', 235, 260, 100, 55, 'dept'],
  ['ece', 'ECE', 355, 260, 100, 55, 'dept'],
  ['chem', 'Chem & Physics', 235, 340, 110, 60, 'dept'],
  ['ete', 'ETE', 235, 420, 110, 55, 'dept'],
  ['library', 'Library', 365, 350, 120, 68, 'fac', 1],
  ['mm', 'M.M Foods', 505, 350, 110, 55, 'food', 1],
  ['mingoes', 'Big Mingoes', 105, 435, 140, 72, 'food', 1],
  ['vip', 'VIP Lounge', 105, 525, 120, 45, 'fac'],
  ['ise', 'ASE & ISE', 365, 510, 130, 60, 'dept'],
  ['incub', 'Incubation', 525, 510, 130, 60, 'fac']
];

const KB = [
  [/pay|upi|qr|charged/, 'Scan the QR on the Pay step. It confirms automatically after a few seconds, or tap I’ve paid. If you were charged but got no PIN, file a complaint from Help or My rentals.'],
  [/pin/, 'After you pay on the Rent page, your PIN appears there and in My rentals. Enter it at the station kiosk.'],
  [/return|late|time/, 'When time ends you get an alert with the best station to return to.'],
  [/charge|battery|%/, 'Charge percentage is shown live on the My rentals page.'],
  [/wireless|magnet/, 'Grove Wireless is a magnetic pad charger for compatible phones.'],
  [/fast|laptop/, 'Grove Fast charges a laptop and phone together; Grove Laptop suits laptops only.'],
  [/login|email|sign/, 'Sign in with your rvce.edu.in email.'],
  [/hour|duration|long/, 'Rentals run from 30 minutes to 6 hours.']
];
