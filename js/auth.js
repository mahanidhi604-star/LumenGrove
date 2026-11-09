// js/auth.js - Supabase PKCE Google Authentication, Session Management, and Demo Simulation

const stu = () => S.u && S.u.role === 'student' && !S.needsProfile;

// Initialize Supabase Client with PKCE Flow
window.supabaseClient = null;
if (
  typeof window.supabase !== 'undefined' &&
  window.SUPABASE_URL &&
  !window.SUPABASE_URL.includes('[YOUR_SUPABASE_PROJECT_ID]')
) {
  try {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('LumenGrove: Supabase PKCE Auth client initialized.');
  } catch (err) {
    console.warn('LumenGrove: Supabase client initialization error:', err);
  }
}

// 1. Fetch user profile from public.profiles table
// Authorization roles are strictly database-enforced; client-supplied metadata is never trusted.
async function loadProfile(userId) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .eq('id', userId)
        .single();

      if (!error && data) {
        // Enforce phone completion for student users before allowing rental access
        const hasValidPhone = data.phone && /^\+?91\d{10}$/.test(data.phone.replace(/[\s-]/g, ''));
        S.needsProfile = data.role === 'student' && !hasValidPhone;

        S.u = {
          id: data.id,
          role: data.role,
          name: data.full_name || (data.email ? data.email.split('@')[0] : 'Student'),
          email: data.email,
          phone: data.phone || ''
        };
        S.isDemo = false;
        sv('lg_user', JSON.stringify(S.u));
        return S.u;
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  }
  return S.u;
}

// 2. Sign In With Google (PKCE Flow with official branding hints)
window.signInWithGoogle = async (targetHash) => {
  const destination = targetHash || location.hash || '#app-home';
  try {
    sessionStorage.setItem('lg_redirect_hash', destination);
  } catch (e) {}

  const btn = $('.btn-google');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;margin-right:8px">⌛</span> Connecting to Google...`;
  }

  const resetBtn = () => {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg><span>Sign in with Google</span>`;
    }
  };

  if (window.supabaseClient) {
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            hd: 'rvce.edu.in',
            prompt: 'select_account'
          }
        }
      });
      if (error) {
        resetBtn();
        showAuthError(error.message);
      }
    } catch (err) {
      resetBtn();
      showAuthError(err.message || 'Error communicating with Google Auth.');
    }
  } else {
    resetBtn();
    showAuthError('Supabase is not configured yet. You can test using "Demo student" or "Continue as guest".');
  }
};

// 3. Complete Profile (First Sign-In Phone Number Verification)
window.completeProfile = async () => {
  const nameInput = $('#prof_name'),
    phoneInput = $('#prof_phone'),
    err = $('#prof_err');

  if (!nameInput || !phoneInput || !err) return;

  const fullName = nameInput.value.trim();
  const rawPhone = phoneInput.value.trim().replace(/[\s-]/g, '');

  if (!fullName) {
    err.textContent = 'Please enter your name.';
    return;
  }

  // Validate Indian phone number: +91 followed by 10 digits, or 10 digits
  let formattedPhone = rawPhone;
  if (/^\d{10}$/.test(rawPhone)) {
    formattedPhone = '+91' + rawPhone;
  }

  if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
    err.textContent = 'Please enter a valid 10-digit Indian mobile number (+91XXXXXXXXXX).';
    return;
  }

  err.textContent = '';

  try {
    const api = window.getApi();
    await api.updateProfile(fullName, formattedPhone);

    if (S.u) {
      S.u.name = fullName;
      S.u.phone = formattedPhone;
      S.needsProfile = false;
      sv('lg_user', JSON.stringify(S.u));
    }

    toast('Profile updated');
    const dest = sessionStorage.getItem('lg_redirect_hash') || '#app-home';
    sessionStorage.removeItem('lg_redirect_hash');
    location.hash = dest.replace('#', '');
    go(1);
  } catch (e) {
    err.textContent = e.message || 'Error saving profile.';
  }
};

// 4. Sign Out
window.signOut = async () => {
  if (window.supabaseClient) {
    try {
      await window.supabaseClient.auth.signOut();
    } catch (e) {}
  }
  S.u = null;
  S.isDemo = false;
  S.needsProfile = false;
  sv('lg_user', '');
  try {
    sessionStorage.removeItem('lg_redirect_hash');
  } catch (e) {}

  toast('Signed out');
  location.hash = 'home';
  go(1);
};

// 5. Guest Browse Mode
window.continueAsGuest = () => {
  S.u = { role: 'guest', name: 'Guest' };
  S.isDemo = false;
  S.needsProfile = false;
  sv('lg_user', JSON.stringify(S.u));
  toast('Browsing as guest');
  location.hash = 'app-home';
  go();
};

// 6. Safe Demo Student Simulation (Isolated in-memory simulation, never gets a real JWT)
window.loginDemoStudent = () => {
  if (!window.ENABLE_DEMO) return;

  S.u = {
    id: 'demo-student-sim',
    role: 'student',
    name: 'Demo Student',
    email: 'student@rvce.edu.in',
    phone: '+919876543210'
  };
  S.isDemo = true;
  S.needsProfile = false;
  sv('lg_user', JSON.stringify(S.u));
  toast('Entered demo student mode');
  location.hash = 'app-home';
  go(1);
};

window.exitDemo = () => {
  window.signOut();
};

// 7. Surface friendly auth error messages
function showAuthError(msg) {
  S.authError = msg;
  const el = $('#auth_err');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

// 8. Process PKCE Return, Code Exchange, and OAuth Rejections
(async function handleOAuthReturn() {
  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get('error');
  const errorDesc = urlParams.get('error_description');
  const codeParam = urlParams.get('code');

  // Check for server-side rejection or OAuth error
  if (errorParam || errorDesc) {
    let friendlyMessage = 'Please use your @rvce.edu.in Google account.';
    if (errorDesc && errorDesc.toLowerCase().includes('database error')) {
      friendlyMessage = 'Please use your @rvce.edu.in Google account.';
    } else if (errorParam === 'access_denied') {
      friendlyMessage = 'Sign in was cancelled. Please choose your @rvce.edu.in Google account.';
    }
    S.authError = friendlyMessage;

    // Clean query parameters from URL without losing current hash
    const cleanUrl = window.location.pathname + (window.location.hash || '#signin');
    window.history.replaceState(null, '', cleanUrl);

    if (location.hash !== '#signin') {
      location.hash = 'signin';
    }
    if (typeof go === 'function') go(1);
    return;
  }

  // Handle PKCE Authorization Code Exchange
  if (codeParam && window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.exchangeCodeForSession(codeParam);
      if (error) {
        showAuthError('Please use your @rvce.edu.in Google account.');
      } else if (data && data.user) {
        await loadProfile(data.user.id);
      }
    } catch (e) {
      showAuthError('Authentication error. Please try again.');
    }

    // Clean query string from address bar
    const savedHash = sessionStorage.getItem('lg_redirect_hash') || '#app-home';
    sessionStorage.removeItem('lg_redirect_hash');
    let target = savedHash;
    if (savedHash.startsWith('#admin') && (!S.u || (S.u.role !== 'super_admin' && S.u.role !== 'technician'))) {
      S.adminError = 'Access Denied: This Google account does not possess staff privileges.';
      target = '#admin-login';
    }
    const cleanUrl = window.location.pathname + target;
    window.history.replaceState(null, '', cleanUrl);
    location.hash = target.replace('#', '');
    if (typeof go === 'function') go(1);
    return;
  }

  // Check existing session on boot
  if (window.supabaseClient) {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session && session.user) {
        await loadProfile(session.user.id);
      }
      window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          await loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
          S.u = null;
          S.isDemo = false;
          sv('lg_user', '');
          if (event === 'TOKEN_REFRESH_FAILED') {
            S.authError = 'Your session has expired. Please sign in again.';
          }
        }
        if (typeof go === 'function') go(1);
      });
    } catch (e) {
      console.warn('Session restoration error:', e);
    }
  }
})();
