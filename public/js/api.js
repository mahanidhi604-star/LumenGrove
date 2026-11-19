// js/api.js - Unified API Adapter
// Decouples the UI from data access. Uses demoApi (client in-memory) when in demo mode
// or unauthenticated fallback, and supabaseApi when connected to live backend.

window.demoApi = {
  isLive: false,

  async getStations() {
    return window.ST || [];
  },

  async getBankTypes() {
    return window.CATS || {};
  },

  async getPricingRules() {
    return {
      rate: window.PR ? window.PR.rate : 20,
      grace: window.PR ? window.PR.grace : 10,
      late: window.PR ? window.PR.late : 30,
      deposit: window.PR ? window.PR.dep : 0
    };
  },

  async bookSlot(stationId, bankTypeId, durationHours) {
    // In-memory simulation: creates client-only demo rental
    const rentalId = 'LG-' + (1000 + Math.floor(Math.random() * 9000));
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const st = (window.ST || []).find(s => s.id === stationId) || { n: 'Station' };
    const amountPaise = Math.round((window.PR ? window.PR.rate : 20) * durationHours * 100);

    const demoRental = {
      id: rentalId,
      stationId,
      st,
      cat: bankTypeId,
      dur: durationHours,
      amountPaise,
      pin,
      status: 'pending',
      slot: Math.floor(Math.random() * 8) + 1,
      createdAt: new Date().toISOString()
    };

    if (window.S) {
      window.S.rent = demoRental;
    }
    return demoRental;
  },

  async getMyRentals() {
    return window.S && window.S.rent ? [window.S.rent] : [];
  },

  async submitComplaint(rentalId, issueType, details) {
    console.log('[Demo API] Complaint filed:', { rentalId, issueType, details });
    return { success: true, id: 'CMP-' + Math.floor(Math.random() * 10000) };
  },

  async updateProfile(fullName, phone) {
    if (window.S && window.S.u) {
      window.S.u.name = fullName;
      window.S.u.phone = phone;
      if (typeof sv === 'function') sv('lg_user', JSON.stringify(window.S.u));
    }
    return { success: true };
  }
};

window.supabaseApi = {
  isLive: true,

  async getStations() {
    if (!window.supabaseClient) return window.demoApi.getStations();
    const { data, error } = await window.supabaseClient.from('stations').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getBankTypes() {
    if (!window.supabaseClient) return window.demoApi.getBankTypes();
    const { data, error } = await window.supabaseClient.from('bank_types').select('*');
    if (error) throw error;
    return data;
  },

  async getPricingRules() {
    if (!window.supabaseClient) return window.demoApi.getPricingRules();
    const { data, error } = await window.supabaseClient
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) return window.demoApi.getPricingRules();
    return {
      rate: Math.round(data.hourly_rate_paise / 100),
      grace: data.grace_period_mins,
      late: Math.round((data.late_fee_per_hour_paise || 0) / 100),
      deposit: Math.round((data.deposit_paise || 0) / 100)
    };
  },

  async bookSlot(stationId, bankTypeId, durationHours) {
    if (!window.supabaseClient) return window.demoApi.bookSlot(stationId, bankTypeId, durationHours);
    const { data, error } = await window.supabaseClient.rpc('book_slot_atomic', {
      p_station_id: stationId,
      p_bank_type_id: bankTypeId,
      p_duration_hours: durationHours
    });
    if (error) throw error;
    return data && data[0] ? data[0] : data;
  },

  async getMyRentals() {
    if (!window.supabaseClient) return window.demoApi.getMyRentals();
    const { data, error } = await window.supabaseClient
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async submitComplaint(rentalId, issueType, details) {
    if (!window.supabaseClient) return window.demoApi.submitComplaint(rentalId, issueType, details);
    const { data, error } = await window.supabaseClient.from('complaints').insert({
      rental_id: rentalId || null,
      issue_type: issueType,
      details: details,
      user_id: window.supabaseClient.auth.getUser()?.id
    }).select().single();
    if (error) throw error;
    return data;
  },

  async updateProfile(fullName, phone) {
    if (!window.supabaseClient) return window.demoApi.updateProfile(fullName, phone);
    const userRes = await window.supabaseClient.auth.getUser();
    const user = userRes?.data?.user;
    if (!user) throw new Error('Unauthenticated');

    // 1. Persist phone & full_name to Supabase Auth user_metadata
    try {
      await window.supabaseClient.auth.updateUser({
        data: {
          full_name: fullName,
          phone: phone
        }
      });
    } catch (metaErr) {
      console.warn('Auth user metadata update notice:', metaErr);
    }

    // 2. Persist to public.profiles table
    const updatePayload = {
      full_name: fullName,
      phone: phone,
      updated_at: new Date().toISOString()
    };

    const { data: updateData, error: updateErr } = await window.supabaseClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select();

    if (!updateData || updateData.length === 0) {
      // Row does not exist yet; insert it cleanly
      const insertPayload = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        phone: phone,
        role: 'student',
        updated_at: new Date().toISOString()
      };
      const { data: insertData, error: insertErr } = await window.supabaseClient
        .from('profiles')
        .insert(insertPayload)
        .select();

      if (insertErr && !insertErr.message?.includes('duplicate key')) {
        console.warn('Profile insert notice:', insertErr);
      }
      return insertData || updateData;
    }

    return updateData;
  }
};

// Global API getter: returns demoApi if user is in demo mode or Supabase is not configured
window.getApi = () => {
  if (window.S && window.S.isDemo) return window.demoApi;
  if (window.supabaseClient && window.S && window.S.u && window.S.u.role !== 'guest') {
    return window.supabaseApi;
  }
  return window.demoApi;
};

// Comprehensive Two-Way Supabase State Synchronization
window.syncSupabaseState = async () => {
  // 0. Load Local Pricing Overrides if previously committed by Admin
  try {
    const savedOverride = localStorage.getItem('lg_pricing_override');
    if (savedOverride && window.PR) {
      const parsed = JSON.parse(savedOverride);
      if (parsed.rate) window.PR.rate = Number(parsed.rate);
      if (parsed.grace) window.PR.grace = Number(parsed.grace);
      if (parsed.late) window.PR.late = Number(parsed.late);
      if (parsed.dep !== undefined) window.PR.dep = Number(parsed.dep);
      console.log('LumenGrove: Loaded pricing override from local policy storage:', window.PR);
    }
  } catch (e) {}

  if (!window.supabaseClient) return;

  // 1. Fetch Pricing from Supabase
  try {
    const { data: pricingData } = await window.supabaseClient
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pricingData && window.PR) {
      window.PR.rate = Math.round(pricingData.hourly_rate_paise / 100);
      window.PR.grace = pricingData.grace_period_mins;
      window.PR.late = Math.round((pricingData.late_fee_per_hour_paise || 2000) / 100);
      window.PR.dep = Math.round((pricingData.deposit_paise || 0) / 100);
      console.log('LumenGrove: Live pricing loaded from Supabase:', window.PR);
    }
  } catch (e) {
    console.warn('Supabase pricing fetch notice:', e);
  }

  // 2. Fetch Stations from Supabase
  try {
    const { data: stnData } = await window.supabaseClient
      .from('stations')
      .select('*');

    if (Array.isArray(stnData) && stnData.length > 0 && window.ST) {
      stnData.forEach(remoteStn => {
        const local = window.ST.find(s => s.id === remoteStn.id);
        if (local) {
          local.n = remoteStn.name || local.n;
          local.slots = remoteStn.total_slots || local.slots;
          local.ok = remoteStn.is_online !== false;
        }
      });
      console.log('LumenGrove: Live station metadata synced from Supabase.');
    }
  } catch (e) {
    console.warn('Supabase stations fetch notice:', e);
  }

  // 3. Fetch Hardware Slots from Supabase
  try {
    const { data: slotData } = await window.supabaseClient
      .from('slots')
      .select('*');

    if (Array.isArray(slotData) && slotData.length > 0 && window.ST) {
      if (window.S) window.S.supabaseSlots = slotData;
      // Calculate dynamic free slots per station
      window.ST.forEach(stn => {
        const stationSlots = slotData.filter(s => s.station_id === stn.id);
        if (stationSlots.length > 0) {
          const readyCount = stationSlots.filter(s => s.status === 'ready').length;
          stn.free = readyCount;
          stn.slots = stationSlots.length;
        }
      });
      console.log('LumenGrove: Live hardware slot matrix synced from Supabase.');
    }
  } catch (e) {
    console.warn('Supabase slots fetch notice:', e);
  }

  // 4. Fetch Complaints from Supabase
  try {
    const { data: complaintData } = await window.supabaseClient
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (Array.isArray(complaintData) && complaintData.length > 0 && window.S) {
      window.S.complaints = complaintData.map(c => ({
        id: c.id,
        user: c.user_name || 'RVCE Student',
        phone: c.user_phone || '+919876543210',
        email: c.user_email || 'student@rvce.edu.in',
        station: c.station_name || 'Central Library',
        bay: c.slot_number ? `Bay #${c.slot_number}` : 'Kiosk',
        issue: c.issue_type || 'Kiosk Alert',
        category: c.category || 'Hardware',
        time: c.created_at ? new Date(c.created_at).toLocaleTimeString() : 'Recently',
        status: c.status || 'OPEN',
        details: c.details || 'Reported via campus kiosk'
      }));
      console.log('LumenGrove: Live customer complaints synced from Supabase.');
    }
  } catch (e) {}
};

// Initiate background Supabase sync on load
setTimeout(() => {
  if (typeof window.syncSupabaseState === 'function') {
    window.syncSupabaseState();
  }
}, 150);
