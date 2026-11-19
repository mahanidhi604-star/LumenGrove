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
    const user = (await window.supabaseClient.auth.getUser()).data.user;
    if (!user) throw new Error('Unauthenticated');
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    if (error) throw error;
    return data;
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
