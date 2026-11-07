// js/auth.js - Authentication, Roles, and Session State

const stu = () => S.u && S.u.role == 'student';

window.sIn = () => {
  const nm = $('#nm'), em = $('#em'), ph = $('#ph'), e1 = $('#e1');
  if (!nm || !em || !ph || !e1) return;
  const n = nm.value.trim(),
    e = em.value.trim().toLowerCase(),
    p = ph.value.trim();
  if (!/^[^@\s]+@rvce\.edu\.in$/.test(e)) {
    e1.textContent = 'Use your rvce.edu.in email.';
    return;
  }
  if (!n || !/^\+?\d{10,13}$/.test(p)) {
    e1.textContent = 'Enter your name and a valid phone number.';
    return;
  }
  S.u = { role: 'student', name: n, email: e, phone: p };
  sv('lg_user', JSON.stringify(S.u));
  location.hash = 'plug';
};

window.login = r => {
  S.u =
    r == 'student'
      ? { role: 'student', name: 'Demo Student', email: 'demo@rvce.edu.in', phone: '+910000000000' }
      : { role: r, name: r == 'super' ? 'Super admin' : r == 'tech' ? 'Technician' : 'Guest' };
  location.hash = r == 'super' || r == 'tech' ? 'admin' : 'plug';
};

window.signOut = () => {
  S.u = null;
  sv('lg_user', '');
  if (typeof go === 'function') go(1);
  if (typeof toast === 'function') toast('Signed out');
};
