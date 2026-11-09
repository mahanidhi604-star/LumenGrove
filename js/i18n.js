// js/i18n.js - Internationalization and translations (English, Kannada, Hindi)
const L = {
  en: {
    home: 'Home',
    how: 'How it works',
    tech: 'Technology',
    impact: 'Impact',
    about: 'About',
    plug: 'Plug In',
    find: 'Find a bank',
    rent: 'Rent',
    rentals: 'My rentals',
    me: 'Settings',
    hub: 'Hub',
    si: 'Sign in',
    guest: 'Continue as guest',
    google_signin: 'Sign in with Google',
    demo_student: 'Demo student',
    demo_banner: 'Demo mode. Nothing here is real.',
    exit_demo: 'Exit demo',
    complete_profile: 'Complete your profile',
    staff_signin: 'Staff sign in',
    rvce_prompt: 'Please use your @rvce.edu.in Google account.',
    not_permitted: 'Not permitted: Super admin access required.',
    h1: 'No more battery anxiety.',
    sub: 'Solar-charged power banks, ready at stations around campus.',
    greet: 'Where are you charging today?',
    back: '← LumenGrove'
  },
  kn: {
    home: 'ಮುಖಪುಟ',
    how: 'ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    tech: 'ತಂತ್ರಜ್ಞಾನ',
    impact: 'ಪರಿಣಾಮ',
    about: 'ಬಗ್ಗೆ',
    plug: 'ಪ್ಲಗ್ ಇನ್',
    find: 'ಬ್ಯಾಂಕ್ ಹುಡುಕಿ',
    rent: 'ಬಾಡಿಗೆ',
    rentals: 'ನನ್ನ ಬಾಡಿಗೆಗಳು',
    me: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    hub: 'ಹಬ್',
    si: 'ಸೈನ್ ಇನ್',
    guest: 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ',
    google_signin: 'ಗೂಗಲ್ ಮೂಲಕ ಸೈನ್ ಇನ್ ಮಾಡಿ',
    demo_student: 'ಡೆಮೊ ವಿದ್ಯಾರ್ಥಿ',
    demo_banner: 'ಡೆಮೊ ಮೋಡ್. ಇಲ್ಲಿ ಯಾವುದೂ ನೈಜವಲ್ಲ.',
    exit_demo: 'ಡೆಮೊದಿಂದ ನಿರ್ಗಮಿಸಿ',
    complete_profile: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
    staff_signin: 'ಸಿಬ್ಬಂದಿ ಸೈನ್ ಇನ್',
    rvce_prompt: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ @rvce.edu.in ಗೂಗಲ್ ಖಾತೆಯನ್ನು ಬಳಸಿ.',
    not_permitted: 'ಅನುಮತಿಯಿಲ್ಲ: ಸೂಪರ್ ಅಡ್ಮಿನ್ ಪ್ರವೇಶ ಅಗತ್ಯವಿದೆ.',
    h1: 'ಇನ್ನು ಬ್ಯಾಟರಿ ಚಿಂತೆ ಬೇಡ.',
    sub: 'ಕ್ಯಾಂಪಸ್‌ನ ಕೇಂದ್ರಗಳಲ್ಲಿ ಸೌರ ಚಾರ್ಜ್ ಆದ ಪವರ್ ಬ್ಯಾಂಕ್‌ಗಳು ಸಿದ್ಧ.',
    greet: 'ಇಂದು ಎಲ್ಲಿ ಚಾರ್ಜ್ ಮಾಡುತ್ತೀರಿ?',
    back: '← ಲೂಮೆನ್‌ಗ್ರೋವ್'
  },
  hi: {
    home: 'होम',
    how: 'यह कैसे काम करता है',
    tech: 'तकनीक',
    impact: 'प्रभाव',
    about: 'परिचय',
    plug: 'प्लग इन',
    find: 'बैंक खोजें',
    rent: 'किराया',
    rentals: 'मेरे किराये',
    me: 'सेटिंग्स',
    hub: 'हब',
    si: 'साइन इन',
    guest: 'अतिथि के रूप में जारी रखें',
    google_signin: 'गूगल से साइन इन करें',
    demo_student: 'डेमो छात्र',
    demo_banner: 'डेमो मोड। यहाँ कुछ भी वास्तविक नहीं है।',
    exit_demo: 'डेमो से बाहर निकलें',
    complete_profile: 'अपनी प्रोफ़ाइल पूरी करें',
    staff_signin: 'स्टाफ़ साइन इन',
    rvce_prompt: 'कृपया अपने @rvce.edu.in गूगल खाते का उपयोग करें।',
    not_permitted: 'अनुमति नहीं है: सुपर एडमिन एक्सेस आवश्यक है।',
    h1: 'अब बैटरी की चिंता नहीं।',
    sub: 'कैंपस के स्टेशनों पर सौर ऊर्जा से चार्ज पावर बैंक तैयार हैं।',
    greet: 'आज कहाँ चार्ज करेंगे?',
    back: '← लूमेनग्रोव'
  }
};

const t = k => (L[S.l] || {})[k] || L.en[k] || k;

const TR = {
  'Explore': ['ಅನ್ವೇಷಿಸಿ', 'एक्सप्लोर'],
  'Plug In': ['ಪ್ಲಗ್ ಇನ್', 'प्लग इन'],
  'Help': ['ಸಹಾಯ', 'सहायता'],
  'Charge up': ['ಚಾರ್ಜ್ ಮಾಡಿ', 'चार्ज करें'],
  'Rent here': ['ಇಲ್ಲಿ ಬಾಡಿಗೆ ಪಡೆಯಿರಿ', 'यहाँ किराये पर लें'],
  'Navigate': ['ದಾರಿ ತೋರಿಸಿ', 'रास्ता दिखाएँ'],
  'Active rental': ['ಸಕ್ರಿಯ ಬಾಡಿಗೆ', 'चालू किराया'],
  'Open rental': ['ಬಾಡಿಗೆ ತೆರೆಯಿರಿ', 'किराया खोलें'],
  'Stations': ['ಕೇಂದ್ರಗಳು', 'स्टेशन'],
  'Live stations': ['ಲೈವ್ ಕೇಂದ್ರಗಳು', 'लाइव स्टेशन'],
  'Grove banks': ['ಗ್ರೋವ್ ಬ್ಯಾಂಕ್‌ಗಳು', 'ग्रोव बैंक'],
  'Campus impact': ['ಕ್ಯಾಂಪಸ್ ಪರಿಣಾಮ', 'कैंपस प्रभाव'],
  'Recent': ['ಇತ್ತೀಚಿನ', 'हाल के'],
  'Ask Lumi': ['ಲೂಮಿಯನ್ನು ಕೇಳಿ', 'लूमी से पूछें'],
  'Sign in to charge up': ['ಚಾರ್ಜ್ ಮಾಡಲು ಸೈನ್ ಇನ್ ಮಾಡಿ', 'चार्ज करने के लिए साइन इन करें'],
  'Duration': ['ಅವಧಿ', 'अवधि'],
  'Best station': ['ಅತ್ಯುತ್ತಮ ಕೇಂದ್ರ', 'सबसे अच्छा स्टेशन'],
  'Scan to pay': ['ಪಾವತಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', 'भुगतान के लिए स्कैन करें'],
  'Your PIN': ['ನಿಮ್ಮ ಪಿನ್', 'आपका पिन'],
  'Payment received': ['ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ', 'भुगतान प्राप्त हुआ'],
  'View current rental': ['ಪ್ರಸ್ತುತ ಬಾಡಿಗೆ ನೋಡಿ', 'मौजूदा किराया देखें'],
  'Done': ['ಮುಗಿಯಿತು', 'हो गया'],
  'Cancel': ['ರದ್ದುಮಾಡಿ', 'रद्द करें'],
  'Choose': ['ಆಯ್ಕೆ', 'चुनें'],
  'Pay': ['ಪಾವತಿ', 'भुगतान'],
  'PIN': ['ಪಿನ್', 'पिन'],
  'I’ve paid': ['ನಾನು ಪಾವತಿಸಿದ್ದೇನೆ', 'मैंने भुगतान कर दिया'],
  'Current rental': ['ಪ್ರಸ್ತುತ ಬಾಡಿಗೆ', 'मौजूदा किराया'],
  'Transaction history': ['ವಹಿವಾಟು ಇತಿಹಾಸ', 'लेन-देन इतिहास'],
  'File a complaint': ['ದೂರು ಸಲ್ಲಿಸಿ', 'शिकायत दर्ज करें'],
  'Complain': ['ದೂರು', 'शिकायत'],
  'No active rental.': ['ಸಕ್ರಿಯ ಬಾಡಿಗೆ ಇಲ್ಲ.', 'कोई चालू किराया नहीं।'],
  'Account': ['ಖಾತೆ', 'खाता'],
  'Profile': ['ಪ್ರೊಫೈಲ್', 'प्रोफ़ाइल'],
  'Language': ['ಭಾಷೆ', 'भाषा'],
  'Theme': ['ಥೀಮ್', 'थीम'],
  'Motion': ['ಚಲನೆ', 'गति'],
  'Sign out': ['ಸೈನ್ ಔಟ್', 'साइन आउट'],
  'Reduce motion': ['ಚಲನೆ ಕಡಿಮೆ ಮಾಡಿ', 'गति कम करें'],
  'Support': ['ಬೆಂಬಲ', 'सहायता केंद्र'],
  'FAQ': ['ಪದೇ ಪದೇ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು', 'अक्सर पूछे जाने वाले प्रश्न'],
  'Something wrong?': ['ಏನಾದರೂ ತಪ್ಪಾಗಿದೆಯೇ?', 'कुछ गलत है?'],
  'Contact management': ['ನಿರ್ವಹಣೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ', 'प्रबंधन से संपर्क करें'],
  'Full name': ['ಪೂರ್ಣ ಹೆಸರು', 'पूरा नाम'],
  'RVCE email': ['RVCE ಇಮೇಲ್', 'RVCE ईमेल'],
  'Demo only': ['ಡೆಮೊ ಮಾತ್ರ', 'केवल डेमो'],
  'Demo student': ['ಡೆಮೊ ವಿದ್ಯಾರ್ಥಿ', 'डेमो छात्र'],
  'Tap the map to set your position.': ['ನಿಮ್ಮ ಸ್ಥಳ ಹೊಂದಿಸಲು ನಕ್ಷೆಯನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ.', 'अपनी स्थिति तय करने के लिए नक्शे पर टैप करें।'],
  'Signed out': ['ಸೈನ್ ಔಟ್ ಆಗಿದೆ', 'साइन आउट हो गया'],
  'Complaint filed (demo)': ['ದೂರು ಸಲ್ಲಿಸಲಾಗಿದೆ (ಡೆಮೊ)', 'शिकायत दर्ज हुई (डेमो)'],
  'Hi, I am Lumi. Ask me about PINs, bank types, returns or charging.': ['ನಮಸ್ಕಾರ, ನಾನು ಲೂಮಿ. ಪಿನ್, ಬ್ಯಾಂಕ್ ವಿಧಗಳು, ಹಿಂತಿರುಗಿಸುವಿಕೆ ಅಥವಾ ಚಾರ್ಜಿಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ.', 'नमस्ते, मैं लूमी हूँ। पिन, बैंक के प्रकार, वापसी या चार्जिंग के बारे में पूछें।'],
  'Hi, I am Lumi. Ask me about payment, PINs, bank types or returns.': ['ನಮಸ್ಕಾರ, ನಾನು ಲೂಮಿ. ಪಾವತಿ, ಪಿನ್, ಬ್ಯಾಂಕ್ ವಿಧಗಳು ಅಥವಾ ಹಿಂತಿರುಗಿಸುವಿಕೆ ಬಗ್ಗೆ ಕೇಳಿ.', 'नमस्ते, मैं लूमी हूँ। भुगतान, पिन, बैंक के प्रकार या वापसी के बारे में पूछें।']
};

const KBT = {
  kn: {
    0: 'ಪಾವತಿ ಹಂತದಲ್ಲಿ QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿ. ಕೆಲವು ಸೆಕೆಂಡುಗಳಲ್ಲಿ ಅದು ತಾನಾಗಿ ದೃಢಪಡುತ್ತದೆ, ಅಥವಾ “ನಾನು ಪಾವತಿಸಿದ್ದೇನೆ” ಒತ್ತಿ. ಪಾವತಿಯಾದರೂ ಪಿನ್ ಸಿಗದಿದ್ದರೆ ಸಹಾಯ ಅಥವಾ ನನ್ನ ಬಾಡಿಗೆಗಳಿಂದ ದೂರು ಸಲ್ಲಿಸಿ.',
    1: 'ಬಾಡಿಗೆ ಪುಟದಲ್ಲಿ ಪಾವತಿಸಿದ ನಂತರ ನಿಮ್ಮ ಪಿನ್ ಅಲ್ಲಿ ಮತ್ತು ನನ್ನ ಬಾಡಿಗೆಗಳಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ. ಅದನ್ನು ಸ್ಟೇಷನ್ ಕಿಯೋಸ್ಕ್‌ನಲ್ಲಿ ನಮೂದಿಸಿ.',
    2: 'ಸಮಯ ಮುಗಿದಾಗ ಹಿಂತಿರುಗಿಸಲು ಉತ್ತಮ ಕೇಂದ್ರದೊಂದಿಗೆ ನಿಮಗೆ ಎಚ್ಚರಿಕೆ ಬರುತ್ತದೆ.',
    3: 'ಚಾರ್ಜ್ ಶೇಕಡಾವಾರು ನನ್ನ ಬಾಡಿಗೆಗಳ ಪುಟದಲ್ಲಿ ಲೈವ್ ಆಗಿ ಕಾಣಿಸುತ್ತದೆ.',
    7: 'ಬಾಡಿಗೆ 30 ನಿಮಿಷದಿಂದ 6 ಗಂಟೆಯವರೆಗೆ ಇರುತ್ತದೆ.'
  },
  hi: {
    0: 'भुगतान चरण में QR स्कैन करें। कुछ सेकंड में यह अपने आप पुष्टि हो जाता है, या “मैंने भुगतान कर दिया” दबाएँ। भुगतान के बाद भी पिन न मिले तो सहायता या मेरे किराये से शिकायत दर्ज करें।',
    1: 'किराया पेज पर भुगतान करने के बाद आपका पिन वहीं और मेरे किराये में दिखेगा। इसे स्टेशन कियोस्क पर दर्ज करें।',
    2: 'समय खत्म होने पर वापसी के लिए सबसे अच्छे स्टेशन के साथ अलर्ट मिलता है।',
    3: 'चार्ज प्रतिशत मेरे किराये पेज पर लाइव दिखता है।',
    7: 'किराया 30 मिनट से 6 घंटे तक का होता है।'
  }
};

const trT = s => {
  if (S.l == 'en') return s;
  const k = s.trim(), e = TR[k];
  return e ? s.replace(k, e[S.l == 'kn' ? 0 : 1]) : s;
};

window.xl = h => {
  document.documentElement.lang = S.l;
  if (S.l == 'en') return;
  [$('#hd'), $('#tb'), h == 'about' || h == 'tech' ? null : $('#v')].forEach(r => {
    if (!r) return;
    const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const v = trT(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  });
};

new MutationObserver(ms => {
  if (S.l == 'en') return;
  ms.forEach(m =>
    m.addedNodes.forEach(n => {
      if (n.nodeType != 1 || !n.classList.contains('m') || n.classList.contains('u')) return;
      const x = n.textContent;
      if (typeof KB === 'undefined') return;
      const i = KB.findIndex(k => k[1] === x),
        k = S.l,
        t2 = (KBT[k] || {})[i] || (TR[x] && TR[x][k == 'kn' ? 0 : 1]);
      if (t2) n.textContent = t2;
    })
  );
}).observe(document.body, { childList: true, subtree: true });
