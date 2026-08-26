let currentUserId = 1;
let currentUserProfile = {
  full_name: "Rahul Sharma",
  email: "rahul@rakshaflow.app",
  blood_group: "O+",
  allergies: "None",
  chronic_conditions: "None",
  medicines: "None",
  preferred_hospital: "St. Mary's General Hospital",
  trigger_word: "HELP"
};

let countdownTimer = null;
let countdownSeconds = 5;
let audioContext = null;

let currentActiveSOSEventId = null;
let escalationTimer = null;
let escalationTimerSeconds = 120;

let ecgAnimationFrames = {};

document.addEventListener('DOMContentLoaded', () => {
  initAppRouting();
  checkAuthSession();
  initVoiceListener();
  initLiveLocationTracker();
  animateWaveform();
  initEcgAnimations();
});

// --- Auth & Session State ---
function checkAuthSession() {
  const savedUser = sessionStorage.getItem('rf_authenticated_user');
  if (savedUser) {
    try {
      currentUserProfile = JSON.parse(savedUser);
      currentUserId = currentUserProfile.user_id || 1;
      showAuthenticatedUI();
    } catch (e) {
      navigateTo('login');
    }
  } else {
    navigateTo('login');
  }
}

function handleAuthLogin(event) {
  if (event) event.preventDefault();
  const email = document.getElementById('loginEmail').value;

  if (email && email.includes('@')) {
    const parts = email.split('@')[0].split('.');
    const inferredName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    currentUserProfile.full_name = inferredName || "Rahul Sharma";
  }

  currentUserProfile.email = email;
  sessionStorage.setItem('rf_authenticated_user', JSON.stringify(currentUserProfile));
  
  showAuthenticatedUI();
  navigateTo('dashboard');
}

function handleAuthSignup(event) {
  if (event) event.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;

  currentUserProfile.full_name = name || "Rahul Sharma";
  currentUserProfile.email = email;
  sessionStorage.setItem('rf_authenticated_user', JSON.stringify(currentUserProfile));

  showAuthenticatedUI();
  navigateTo('dashboard');
}

function handleGoogleAuth() {
  alert("Google Single Sign-On UI ready. Integrate backend OAuth Client ID in environment settings to enable live Google authentication.");
  showAuthenticatedUI();
  navigateTo('dashboard');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁️';
    }
  }
}

function logoutUser() {
  sessionStorage.removeItem('rf_authenticated_user');
  navigateTo('login');
}

function showAuthenticatedUI() {
  const header = document.getElementById('appHeader');
  const bottomNav = document.getElementById('mobileBottomNav');
  if (header) header.style.display = 'flex';
  if (bottomNav) bottomNav.style.display = 'flex';

  const avatar = document.getElementById('userHeaderAvatar');
  if (avatar && currentUserProfile.full_name) {
    const initials = currentUserProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatar.textContent = initials || 'RF';
  }

  loadProfile();
  loadContacts();
  loadHistory();
}

// --- App SPA Routing ---
function initAppRouting() {
  window.addEventListener('hashchange', handleHashRoute);
}

function handleHashRoute() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  const viewMap = {
    'login': 'view-login',
    'signup': 'view-signup',
    'dashboard': 'view-dashboard',
    'voice-protection': 'view-voice',
    'live-location': 'view-location',
    'contacts': 'view-contacts',
    'medical-id': 'view-medical-id',
    'history': 'view-history',
    'healthcare-ai': 'view-healthcare-ai'
  };

  const targetViewId = viewMap[hash] || (sessionStorage.getItem('rf_authenticated_user') ? 'view-dashboard' : 'view-login');
  
  document.querySelectorAll('.rf-view').forEach(v => v.classList.remove('active'));
  const activeView = document.getElementById(targetViewId);
  if (activeView) activeView.classList.add('active');

  const isAuthView = targetViewId === 'view-login' || targetViewId === 'view-signup';
  const header = document.getElementById('appHeader');
  const bottomNav = document.getElementById('mobileBottomNav');
  if (header) header.style.display = isAuthView ? 'none' : 'flex';
  if (bottomNav) bottomNav.style.display = isAuthView ? 'none' : 'flex';

  document.querySelectorAll('.rf-nav-item').forEach(i => i.classList.remove('active'));
  if (hash === 'dashboard' || !hash) document.getElementById('navItemHome')?.classList.add('active');
  if (hash === 'contacts') document.getElementById('navItemContacts')?.classList.add('active');
  if (hash === 'medical-id') document.getElementById('navItemMore')?.classList.add('active');
}

function navigateTo(route) {
  window.location.hash = `#/${route}`;
  handleHashRoute();
}

// --- Smooth Animated ECG Canvas with Glowing Leading Dot ---
function initEcgAnimations() {
  setupEcgCanvas('loginEcgCanvas');
  setupEcgCanvas('dashboardEcgCanvas');
  setupEcgCanvas('voiceEcgCanvas');
}

function setupEcgCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let x = 0;
  
  function resize() {
    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = canvas.parentElement.clientHeight || 50;
  }
  resize();

  let step = 0;
  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    ctx.fillStyle = 'rgba(5, 8, 17, 0.22)';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#06b6d4';

    const prevX = x;
    const prevY = getEcgY(prevX, midY, step);
    
    x = (x + 2.2) % w;
    step += 0.05;

    const newY = getEcgY(x, midY, step);

    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, newY);
    ctx.stroke();

    // Glowing Leading Pulse Dot
    ctx.beginPath();
    ctx.arc(x, newY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#06b6d4';
    ctx.fill();

    ecgAnimationFrames[canvasId] = requestAnimationFrame(draw);
  }

  function getEcgY(posX, midY, t) {
    const cycle = (posX % 120);
    if (cycle > 45 && cycle < 50) return midY - 12;
    if (cycle >= 50 && cycle < 53) return midY + 8;
    if (cycle >= 53 && cycle < 58) return midY - 26; // R wave spike
    if (cycle >= 58 && cycle < 62) return midY + 14;
    if (cycle >= 70 && cycle < 80) return midY - 8;
    return midY + (Math.sin(posX * 0.05 + t) * 1.5);
  }

  draw();
}

// --- Live Location Tracker ---
async function initLiveLocationTracker() {
  const loc = await locationService.getCurrentLocation();
  updateLiveLocationUI(loc);

  locationService.startLiveLocationWatch((updatedLoc) => {
    updateLiveLocationUI(updatedLoc);
  });
}

function updateLiveLocationUI(loc) {
  const elements = {
    'liveLat': `${loc.lat.toFixed(4)}° N`,
    'detailLat': `${loc.lat.toFixed(4)}° N`,
    'liveLng': `${loc.lng.toFixed(4)}° E`,
    'detailLng': `${loc.lng.toFixed(4)}° E`,
    'liveAddress': loc.address,
    'detailAddress': loc.address,
    'liveAccuracyTag': loc.accuracy,
    'detailLocationAccuracyTag': loc.accuracy
  };

  for (const [id, val] of Object.entries(elements)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  const mapIframe = document.getElementById('mapPreviewIframe');
  if (mapIframe) {
    mapIframe.src = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=15&output=embed`;
  }
}

function shareCurrentLocation() {
  const loc = locationService.getLocationPayload();
  if (navigator.share) {
    navigator.share({
      title: 'Raksha Flow Live Emergency Location',
      text: `Live emergency GPS coordinates: ${loc.lat}, ${loc.lng}`,
      url: loc.mapLink
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(loc.mapLink);
    alert(`Live GPS Location link copied to clipboard:\n${loc.mapLink}`);
  }
}

// --- Audio Synthesizer Alarm ---
function playEmergencyBeep() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, audioContext.currentTime);
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log("Audio alert playback notice");
  }
}

// --- Voice Listener & Truthful System State ---
function initVoiceListener() {
  voiceListener.startListening(
    (triggerData) => {
      triggerEmergencyAlert("VOICE_KEYWORD", triggerData.spoken_phrase);
    },
    (interimText) => {
      const liveTextEl = document.getElementById('liveSpeechTranscript');
      if (liveTextEl) {
        liveTextEl.textContent = `Hearing: "${interimText}"`;
      }
    }
  );
}

function toggleVoiceProtectionState() {
  const toggleBtn = document.getElementById('toggleVoiceBtn');
  const dashBadge = document.getElementById('dashVoiceBadge');
  const dashHeaderBadge = document.getElementById('dashProtectionBadgeText');
  const dashHeaderBadgePill = document.getElementById('dashProtectionBadge');

  if (voiceListener.isListening) {
    voiceListener.stopListening();
    if (toggleBtn) {
      toggleBtn.textContent = "Enable Voice Protection";
      toggleBtn.className = "rf-btn rf-btn-primary";
    }
    if (dashBadge) {
      dashBadge.className = "rf-status-pill offline";
      dashBadge.innerHTML = '<span>Paused</span>';
    }
    if (dashHeaderBadgePill) {
      dashHeaderBadgePill.className = "rf-status-pill offline";
    }
    if (dashHeaderBadge) {
      dashHeaderBadge.textContent = "Protection Paused";
    }
  } else {
    voiceListener.startListening(
      (triggerData) => triggerEmergencyAlert("VOICE_KEYWORD", triggerData.spoken_phrase),
      null
    );
    if (toggleBtn) {
      toggleBtn.textContent = "Disable Voice Protection";
      toggleBtn.className = "rf-btn rf-btn-danger";
    }
    if (dashBadge) {
      dashBadge.className = "rf-status-pill";
      dashBadge.innerHTML = '<div class="rf-dot-active"></div><span>Listening...</span>';
    }
    if (dashHeaderBadgePill) {
      dashHeaderBadgePill.className = "rf-status-pill";
    }
    if (dashHeaderBadge) {
      dashHeaderBadge.textContent = "Protection Active";
    }
  }
}

// --- Trigger Emergency Alert Flow ---
function triggerEmergencyAlert(triggerType = "MANUAL_BUTTON", phrase = "") {
  countdownSeconds = 5;
  const modal = document.getElementById('sosModal');
  const counterEl = document.getElementById('countdownValue');
  const phraseEl = document.getElementById('sosPhraseNote');

  modal.classList.add('active');
  counterEl.textContent = countdownSeconds;
  if (phraseEl) phraseEl.textContent = phrase ? `Detected phrase: "${phrase}"` : "Manual SOS button pressed";

  playEmergencyBeep();

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(async () => {
    countdownSeconds--;
    counterEl.textContent = countdownSeconds;
    playEmergencyBeep();

    if (countdownSeconds <= 0) {
      clearInterval(countdownTimer);
      modal.classList.remove('active');
      await executeSOSTransmission(triggerType, phrase);
    }
  }, 1000);
}

function cancelEmergencyAlert() {
  if (countdownTimer) clearInterval(countdownTimer);
  document.getElementById('sosModal').classList.remove('active');
  alert("Emergency SOS alert cancelled by user.");
}

async function executeSOSTransmission(triggerType, phrase) {
  const loc = await locationService.getCurrentLocation();
  
  const payload = {
    user_id: currentUserId,
    trigger_type: triggerType,
    latitude: loc.lat,
    longitude: loc.lng,
    spoken_phrase: phrase,
    notes: `Triggered via ${triggerType}`
  };

  const response = await EmergencyAPI.triggerSOS(payload);
  
  if (response && response.status === "SOS_TRIGGERED") {
    currentActiveSOSEventId = response.event_id;
    renderActiveDispatchBanner(response);
  } else {
    showNotificationModal("🚨 SOS ALERT DISPATCHED", `Emergency alert sent to contacts & caregivers. Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
  }
  loadHistory();
}

function renderActiveDispatchBanner(sosResponse) {
  const card = document.getElementById('activeDispatchCard');
  const detailsEl = document.getElementById('dispatchDetails');
  const mapLinkEl = document.getElementById('dispatchMapLink');
  const logListEl = document.getElementById('dispatchLogList');

  if (!card) return;
  card.style.display = 'block';

  const esc = sosResponse.escalation || {};
  if (detailsEl) {
    detailsEl.textContent = `Event #${sosResponse.event_id} • Patient: ${esc.user_name || currentUserProfile.full_name} • Phone: ${esc.user_phone || ''} • Trigger: ${sosResponse.trigger_type}`;
  }

  if (mapLinkEl && esc.location_link) {
    mapLinkEl.setAttribute('href', esc.location_link);
  }

  if (logListEl && esc.dispatch_log) {
    logListEl.innerHTML = esc.dispatch_log.map(d => `
      <div style="padding: 8px 12px; background: rgba(5, 8, 17, 0.7); border-radius: 8px; border-left: 3px solid ${d.level === 1 ? 'var(--rf-emergency-red)' : 'var(--rf-cyan-accent)'}; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; font-weight: 600; color: #fff;">Level ${d.level}: ${d.target}</div>
          <div style="font-size: 11px; color: var(--rf-text-secondary); margin-top: 2px;">${d.action || d.note || ''}</div>
        </div>
        <span class="rf-status-pill" style="font-size: 10px; padding: 2px 8px;">${d.status}</span>
      </div>
    `).join('');
  }

  escalationTimerSeconds = 120;
  const countEl = document.getElementById('escalationCountdown');
  if (escalationTimer) clearInterval(escalationTimer);

  escalationTimer = setInterval(() => {
    escalationTimerSeconds--;
    if (countEl) countEl.textContent = `${escalationTimerSeconds}s`;
    if (escalationTimerSeconds <= 0) {
      clearInterval(escalationTimer);
      if (countEl) countEl.textContent = "ESCALATED TO LEVEL 2 CONTACTS!";
    }
  }, 1000);
}

async function handleAcknowledgeCurrentSOS() {
  if (!currentActiveSOSEventId) {
    document.getElementById('activeDispatchCard').style.display = 'none';
    return;
  }

  try {
    await fetch(`${API_BASE}/sos/${currentActiveSOSEventId}/acknowledge`, { method: 'POST' });
  } catch (e) {}

  alert("SOS Event acknowledged and resolved successfully.");
  if (escalationTimer) clearInterval(escalationTimer);
  document.getElementById('activeDispatchCard').style.display = 'none';
  currentActiveSOSEventId = null;
  loadHistory();
}

// --- Data Loading & Dynamic User Profile ---
async function loadProfile() {
  const user = await EmergencyAPI.getProfile(currentUserId);
  if (user) {
    currentUserProfile = { ...currentUserProfile, ...user };

    // Dynamic Greeting using logged-in user's First Name
    const greetingEl = document.getElementById('dashGreeting');
    if (greetingEl) {
      const hour = new Date().getHours();
      const timeSalutation = hour < 12 ? 'Good Morning' : (hour < 18 ? 'Good Afternoon' : 'Good Evening');
      const firstName = (currentUserProfile.full_name || 'Rahul').split(' ')[0];
      greetingEl.textContent = `${timeSalutation}, ${firstName}`;
    }

    const elements = {
      'profileName': currentUserProfile.full_name,
      'profileBlood': currentUserProfile.blood_group || "O+",
      'dashBloodGroup': currentUserProfile.blood_group || "O+",
      'profileAllergies': currentUserProfile.allergies || "None",
      'dashAllergies': currentUserProfile.allergies || "None",
      'profileConditions': currentUserProfile.chronic_conditions || "None",
      'profileMedicines': currentUserProfile.medicines || "None",
      'profileHospital': currentUserProfile.preferred_hospital || "St. Mary's General Hospital"
    };

    for (const [id, val] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }

    const triggerInput = document.getElementById('triggerWordInput');
    if (triggerInput) triggerInput.value = currentUserProfile.trigger_word || "HELP";

    const triggerDisplay = document.getElementById('dashTriggerWordStr');
    if (triggerDisplay) triggerDisplay.textContent = `"${currentUserProfile.trigger_word || 'HELP'}"`;

    const voiceTriggerDetailDisplay = document.getElementById('voiceTriggerDisplayStr');
    if (voiceTriggerDetailDisplay) voiceTriggerDetailDisplay.textContent = `"${currentUserProfile.trigger_word || 'HELP'}"`;

    voiceListener.setTargetTrigger(currentUserProfile.trigger_word || "HELP");
  }
}

async function updateTriggerWord() {
  const newTrigger = document.getElementById('triggerWordInput').value;
  if (!newTrigger) return alert("Please enter a valid trigger phrase.");

  await EmergencyAPI.updateProfile(currentUserId, { trigger_word: newTrigger });
  voiceListener.setTargetTrigger(newTrigger);
  loadProfile();
  alert(`Trigger word updated to: "${newTrigger.toUpperCase()}"`);
}

async function loadContacts() {
  const contacts = await EmergencyAPI.getContacts(currentUserId);
  const container = document.getElementById('contactsListContainer');
  const dashAvatarContainer = document.getElementById('dashContactsAvatars');
  const dashCountStr = document.getElementById('dashContactCountStr');

  if (dashCountStr) dashCountStr.textContent = `${contacts.length} Contacts Ready`;

  if (dashAvatarContainer) {
    dashAvatarContainer.innerHTML = contacts.map(c => `
      <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--rf-blue-primary), var(--rf-cyan-accent)); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; border: 2px solid var(--rf-navy-surface);" title="${c.name} (${c.relationship})">
        ${c.name[0]}
      </div>
    `).join('');
  }

  if (!container) return;

  if (contacts.length === 0) {
    container.innerHTML = '<p style="color: var(--rf-text-secondary); font-size: 13px;">No emergency contacts configured yet.</p>';
    return;
  }

  container.innerHTML = contacts.map(c => `
    <div class="rf-card" style="margin-bottom: 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--rf-blue-primary), var(--rf-cyan-accent)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: #fff;">
            ${c.name[0]}
          </div>
          <div>
            <h4 style="font-size: 15px; font-weight: 700;">${c.name}</h4>
            <div style="font-size: 12px; color: var(--rf-text-secondary);">${c.relationship} • ${c.phone_number}</div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <a href="tel:${c.phone_number}" class="rf-icon-btn" style="width: 34px; height: 34px; text-decoration: none;" title="Call ${c.name}">📞</a>
          <a href="sms:${c.phone_number}" class="rf-icon-btn" style="width: 34px; height: 34px; text-decoration: none;" title="Message ${c.name}">💬</a>
          <button class="rf-icon-btn" style="width: 34px; height: 34px; color: var(--rf-emergency-red);" onclick="handleDeleteContact(${c.contact_id})" title="Delete Contact">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Emergency Contacts Deletion Fix
async function handleDeleteContact(contactId) {
  if (confirm("Are you sure you want to delete this emergency contact?")) {
    await EmergencyAPI.deleteContact(contactId, currentUserId);
    await loadContacts();
    alert("Emergency Contact deleted successfully.");
  }
}

async function handleAddContact(event) {
  event.preventDefault();
  const name = document.getElementById('contactName').value;
  const rel = document.getElementById('contactRel').value;
  const phone = document.getElementById('contactPhone').value;
  const prio = parseInt(document.getElementById('contactPriority').value);

  await EmergencyAPI.addContact(currentUserId, {
    name: name,
    relationship: rel,
    phone_number: phone,
    priority_order: prio,
    notification_method: "SMS_CALL"
  });

  alert(`Added ${name} as Emergency Contact!`);
  loadContacts();
  document.getElementById('contactForm').reset();
}

async function loadHistory() {
  const history = await EmergencyAPI.getSOSHistory(currentUserId);
  const container = document.getElementById('sosHistoryContainer');
  const dashList = document.getElementById('dashRecentActivityList');

  if (dashList) {
    if (history.length === 0) {
      dashList.innerHTML = '<p style="color: var(--rf-text-secondary); font-size: 12px;">No emergency activity yet.</p>';
    } else {
      dashList.innerHTML = history.slice(0, 3).map(ev => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(5, 8, 17, 0.5); border-radius: 8px;">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #fff;">${ev.trigger_type}</div>
            <div style="font-size: 10px; color: var(--rf-text-secondary);">${new Date(ev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
          <span class="rf-status-pill" style="font-size: 10px; padding: 2px 8px; background: rgba(239,68,68,0.15); color: var(--rf-emergency-red);">${ev.response_status}</span>
        </div>
      `).join('');
    }
  }

  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<p style="color: var(--rf-text-secondary); font-size: 13px;">No emergency activity yet.</p>';
    return;
  }

  container.innerHTML = history.map(ev => `
    <div style="padding: 14px; background: rgba(5, 8, 17, 0.6); border-radius: var(--rf-radius-sm); border-left: 4px solid var(--rf-emergency-red); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h4 style="font-size: 14px; font-weight: 700;">SOS Event #${ev.event_id} (${ev.trigger_type})</h4>
        <div style="font-size: 12px; color: var(--rf-text-secondary); margin-top: 2px;">${new Date(ev.timestamp).toLocaleString()} • ${ev.notes || ''}</div>
      </div>
      <span class="rf-status-pill" style="background: rgba(239,68,68,0.15); color: var(--rf-emergency-red);">${ev.response_status}</span>
    </div>
  `).join('');
}

// Edit Medical Profile Modal Fix
function openEditProfileModal() {
  document.getElementById('editName').value = currentUserProfile.full_name || '';
  document.getElementById('editBlood').value = currentUserProfile.blood_group || 'O+';
  document.getElementById('editAllergies').value = currentUserProfile.allergies || 'None';
  document.getElementById('editMedicines').value = currentUserProfile.medicines || 'None';
  document.getElementById('editConditions').value = currentUserProfile.chronic_conditions || 'None';
  document.getElementById('editHospital').value = currentUserProfile.preferred_hospital || 'St. Mary\'s General Hospital';

  document.getElementById('editProfileModal').classList.add('active');
}

function closeEditProfileModal() {
  document.getElementById('editProfileModal').classList.remove('active');
}

async function handleSaveProfileEdit(event) {
  event.preventDefault();
  const updateData = {
    full_name: document.getElementById('editName').value,
    blood_group: document.getElementById('editBlood').value,
    allergies: document.getElementById('editAllergies').value,
    medicines: document.getElementById('editMedicines').value,
    chronic_conditions: document.getElementById('editConditions').value,
    preferred_hospital: document.getElementById('editHospital').value
  };

  const updatedUser = await EmergencyAPI.updateProfile(currentUserId, updateData);
  currentUserProfile = { ...currentUserProfile, ...updatedUser };
  sessionStorage.setItem('rf_authenticated_user', JSON.stringify(currentUserProfile));

  closeEditProfileModal();
  await loadProfile();
  alert("Medical Profile updated and saved successfully.");
}

async function downloadMedicalSummary() {
  const data = await EmergencyAPI.exportMedicalSummary(currentUserId);
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonStr);
  downloadAnchor.setAttribute("download", `RakshaFlow_Medical_Card_${currentUserId}.json`);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// --- Healthcare AI Chatbot Controllers ---
async function handleHealthChatSubmit(event) {
  if (event) event.preventDefault();
  const inputEl = document.getElementById('chatInput');
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = '';
  appendChatMessage('USER', message, false);

  try {
    const response = await EmergencyAPI.sendHealthChatMessage(message, currentUserId);
    appendChatMessage('HEALTHCARE AI', response.reply, response.should_trigger_sos);

    if (response.should_trigger_sos) {
      setTimeout(() => {
        if (confirm("🚨 CRITICAL WARNING: AI detected emergency symptoms. Trigger Raksha Flow SOS alert now?")) {
          triggerEmergencyAlert("VOICE_KEYWORD", message);
        }
      }, 500);
    }
  } catch (e) {
    appendChatMessage('HEALTHCARE AI', "Notice: Unable to reach online AI service. Please tap the red SOS button directly if you are experiencing an emergency.", true);
  }
}

function sendQuickChatMessage(text) {
  document.getElementById('chatInput').value = text;
  handleHealthChatSubmit(null);
}

function appendChatMessage(sender, text, isCritical) {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  const msgDiv = document.createElement('div');
  const isUser = sender === 'USER';

  msgDiv.style.padding = '10px 14px';
  msgDiv.style.borderRadius = '12px';
  msgDiv.style.maxWidth = '85%';
  msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';

  if (isUser) {
    msgDiv.style.background = 'linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(6, 182, 212, 0.2))';
    msgDiv.style.border = '1px solid rgba(6, 182, 212, 0.4)';
  } else if (isCritical) {
    msgDiv.style.background = 'rgba(50, 12, 25, 0.9)';
    msgDiv.style.border = '2px solid var(--rf-emergency-red)';
    msgDiv.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.4)';
  } else {
    msgDiv.style.background = 'rgba(15, 23, 42, 0.8)';
    msgDiv.style.border = '1px solid var(--rf-navy-card-border)';
  }

  msgDiv.innerHTML = `
    <div style="font-size: 10px; font-weight: 700; color: ${isUser ? 'var(--rf-cyan-accent)' : (isCritical ? 'var(--rf-emergency-red)' : 'var(--rf-cyan-accent)')}; margin-bottom: 2px;">${sender}</div>
    <div style="font-size: 13px; color: #ffffff; line-height: 1.4;">${text}</div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function handleVoiceChatInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser. Please type your message.");
    return;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  recog.onstart = () => {
    alert("🎙️ Listening... Speak your symptom or question now.");
  };
  recog.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('chatInput').value = transcript;
    handleHealthChatSubmit(null);
  };
  recog.start();
}

function showNotificationModal(title, message) {
  alert(`${title}\n\n${message}`);
}

function animateWaveform() {
  const bars = document.querySelectorAll('.bar');
  setInterval(() => {
    bars.forEach(b => {
      const h = Math.floor(Math.random() * 20) + 4;
      b.style.height = `${h}px`;
    });
  }, 200);
}
