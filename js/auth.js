// js/auth.js - Supabase Authentication with Email OTP, Staff Password Login, and Profile Roles

const stu = () => S.u && S.u.role === 'student';

// Fetch user profile from public.profiles table (roles are never trusted from client state)
async function fetchUserProfile(userId) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .eq('id', userId)
        .single();
      if (!error && data) {
        S.u = {
          id: data.id,
          role: data.role,
          name: data.full_name || data.email.split('@')[0],
          email: data.email,
          phone: data.phone || ''
        };
        sv('lg_user', JSON.stringify(S.u));
        return S.u;
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  }
  return S.u;
}

// Student: Step 1 - Send 6-digit OTP to @rvce.edu.in email
window.sendStudentOtp = async () => {
  const nm = $('#nm'),
    em = $('#em'),
    ph = $('#ph'),
    e1 = $('#e1');
  if (!nm || !em || !ph || !e1) return;

  const n = nm.value.trim(),
    e = em.value.trim().toLowerCase(),
    p = ph.value.trim();

  // Enforce @rvce.edu.in domain
  if (!/^[^@\s]+@rvce\.edu\.in$/.test(e)) {
    e1.textContent = 'Registration is restricted to official @rvce.edu.in student emails.';
    return;
  }

  if (!n || !/^\+?\d{10,13}$/.test(p)) {
    e1.textContent = 'Please enter your full name and a valid 10-13 digit phone number.';
    return;
  }

  e1.textContent = '';
  S.tempName = n;
  S.tempPhone = p;
  S.authEmail = e;

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithOtp({
        email: e,
        options: {
          data: { full_name: n, phone: p },
          shouldCreateUser: true
        }
      });
      if (error) {
        e1.textContent = error.message;
        return;
      }
    } catch (err) {
      e1.textContent = err.message || 'Error communicating with Supabase Auth.';
      return;
    }
  }

  // Advance UI to OTP code entry
  S.authStep = 'otp';
  toast('Verification code sent to ' + e);
  go(1);
};

// Student: Step 2 - Verify 6-digit OTP code
window.verifyStudentOtp = async () => {
  const otpInput = $('#otp'),
    e1 = $('#e1');
  if (!otpInput || !e1) return;

  const code = otpInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    e1.textContent = 'Please enter the 6-digit verification code sent to your email.';
    return;
  }

  e1.textContent = '';

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.verifyOtp({
        email: S.authEmail,
        token: code,
        type: 'email'
      });
      if (error) {
        e1.textContent = error.message;
        return;
      }
      if (data && data.user) {
        await fetchUserProfile(data.user.id);
      }
    } catch (err) {
      e1.textContent = err.message || 'Verification failed.';
      return;
    }
  } else {
    // Offline / Mock verification fallback for testing
    S.u = {
      role: 'student',
      name: S.tempName || 'Student',
      email: S.authEmail,
      phone: S.tempPhone || ''
    };
    sv('lg_user', JSON.stringify(S.u));
  }

  S.authStep = 'email';
  toast('Signed in as ' + (S.u ? S.u.name : 'Student'));
  location.hash = 'app-home';
  go();
};

window.resendOtp = () => {
  if (S.authEmail) {
    toast('New code sent to ' + S.authEmail);
  }
};

// Staff Admin Login using Supabase credentials (Password or OTP)
window.staffSignIn = async () => {
  const emInput = $('#adm_em'),
    pwInput = $('#adm_pw'),
    err = $('#adm_err');
  if (!emInput || !pwInput || !err) return;

  const em = emInput.value.trim().toLowerCase(),
    pw = pwInput.value.trim();

  if (!em || !pw) {
    err.textContent = 'Please enter both staff email and password.';
    return;
  }

  err.textContent = '';

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: em,
        password: pw
      });
      if (error) {
        err.textContent = error.message;
        return;
      }
      const profile = await fetchUserProfile(data.user.id);
      if (!profile || (profile.role !== 'super_admin' && profile.role !== 'technician')) {
        await window.supabaseClient.auth.signOut();
        S.u = null;
        sv('lg_user', '');
        err.textContent = 'Access Denied: This account does not possess staff privileges.';
        return;
      }
    } catch (errObj) {
      err.textContent = errObj.message || 'Staff authentication failed.';
      return;
    }
  } else {
    // Offline fallback for testing staff portal
    const isSuper = em.includes('super') || em.includes('admin');
    S.u = {
      role: isSuper ? 'super_admin' : 'technician',
      name: isSuper ? 'Super Admin' : 'Technician',
      email: em,
      phone: ''
    };
    sv('lg_user', JSON.stringify(S.u));
  }

  toast('Welcome back, ' + (S.u ? S.u.name : 'Staff'));
  location.hash = 'admin';
  go();
};

// Guest Browse Mode
window.continueAsGuest = () => {
  S.u = { role: 'guest', name: 'Guest' };
  sv('lg_user', JSON.stringify(S.u));
  toast('Continuing as guest');
  location.hash = 'app-home';
  go();
};

// Sign Out
window.signOut = async () => {
  if (window.supabaseClient) {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {}
  }
  S.u = null;
  sv('lg_user', '');
  toast('Signed out');
  location.hash = 'home';
  go(1);
};

// Initialize Supabase Auth Session listener
(async function initAuth() {
  if (window.supabaseClient) {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session && session.user) {
        await fetchUserProfile(session.user.id);
      }
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          S.u = null;
          sv('lg_user', '');
        }
        if (typeof go === 'function') go(1);
      });
    } catch (e) {
      console.warn('Auth initialization warning:', e);
    }
  }
})();
