let currentUserId = 1;
let countdownTimer = null;
let countdownSeconds = 5;
let audioContext = null;

let currentActiveSOSEventId = null;
let escalationTimer = null;
let escalationTimerSeconds = 120;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadProfile();
  loadContacts();
  loadHistory();
  initVoiceListener();
  initLiveLocationTracker();
  animateWaveform();
});

// --- Tab Router ---
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';
    });
  });
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
  const latEl = document.getElementById('liveLat');
  const lngEl = document.getElementById('liveLng');
  const addrEl = document.getElementById('liveAddress');
  const tagEl = document.getElementById('liveAccuracyTag');
  const mapLinkEl = document.getElementById('liveMapLinkAnchor');

  if (latEl) latEl.textContent = `${loc.lat.toFixed(4)} N`;
  if (lngEl) lngEl.textContent = `${loc.lng.toFixed(4)} E`;
  if (addrEl) addrEl.textContent = loc.address;
  if (tagEl) tagEl.textContent = loc.accuracy;
  if (mapLinkEl) mapLinkEl.setAttribute('href', loc.mapLink);
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
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log("Audio alert playback notice");
  }
}

// --- Voice Listener Initialization ---
function initVoiceListener() {
  voiceListener.startListening(
    (triggerData) => {
      // Voice trigger word detected!
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

// --- Trigger Emergency Alert Flow ---
function triggerEmergencyAlert(triggerType = "MANUAL_BUTTON", phrase = "") {
  countdownSeconds = 5;
  const modal = document.getElementById('sosModal');
  const counterEl = document.getElementById('countdownValue');
  const phraseEl = document.getElementById('sosPhraseNote');

  modal.classList.add('active');
  counterEl.textContent = countdownSeconds;
  if (phraseEl) phraseEl.textContent = phrase ? `Detected voice: "${phrase}"` : "Manual SOS button pressed";

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
    detailsEl.textContent = `Event #${sosResponse.event_id} • Patient: ${esc.user_name || 'Patient'} • Phone: ${esc.user_phone || ''} • Trigger: ${sosResponse.trigger_type}`;
  }

  if (mapLinkEl && esc.location_link) {
    mapLinkEl.setAttribute('href', esc.location_link);
  }

  if (logListEl && esc.dispatch_log) {
    logListEl.innerHTML = esc.dispatch_log.map(d => `
      <div style="padding: 10px 14px; background: rgba(10, 13, 20, 0.7); border-radius: 10px; border-left: 3px solid ${d.level === 1 ? 'var(--accent-red)' : 'var(--accent-cyan)'}; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 13px; font-weight: 600; color: #fff;">Level ${d.level}: ${d.target}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${d.action || d.note || ''}</div>
        </div>
        <span class="badge ${d.status.includes('DELIVERED') ? 'badge-danger' : 'badge-primary'}">${d.status}</span>
      </div>
    `).join('');
  }

  // Start 120s Escalation timer
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

  const res = await fetch(`${API_BASE}/sos/${currentActiveSOSEventId}/acknowledge`, {
    method: 'POST'
  });
  if (res.ok) {
    alert("SOS Event acknowledged and resolved successfully.");
    if (escalationTimer) clearInterval(escalationTimer);
    document.getElementById('activeDispatchCard').style.display = 'none';
    currentActiveSOSEventId = null;
    loadHistory();
  }
}

// --- Profile & Data Loading ---
async function loadProfile() {
  const user = await EmergencyAPI.getProfile(currentUserId);
  if (user) {
    document.getElementById('profileName').textContent = user.full_name;
    document.getElementById('profileBlood').textContent = user.blood_group || "O+";
    document.getElementById('profileAllergies').textContent = user.allergies || "None";
    document.getElementById('profileConditions').textContent = user.chronic_conditions || "None";
    document.getElementById('profileMedicines').textContent = user.medicines || "None";
    document.getElementById('profileHospital').textContent = user.preferred_hospital || "St. Mary's General";
    document.getElementById('triggerWordInput').value = user.trigger_word || "HELP EMERGENCY";

    voiceListener.setTargetTrigger(user.trigger_word || "HELP EMERGENCY");
  }
}

async function updateTriggerWord() {
  const newTrigger = document.getElementById('triggerWordInput').value;
  if (!newTrigger) return alert("Please enter a valid trigger phrase.");

  await EmergencyAPI.updateProfile(currentUserId, { trigger_word: newTrigger });
  voiceListener.setTargetTrigger(newTrigger);
  alert(`Trigger word updated to: "${newTrigger.toUpperCase()}"`);
}

async function loadContacts() {
  const contacts = await EmergencyAPI.getContacts(currentUserId);
  const container = document.getElementById('contactsListContainer');
  if (!container) return;

  if (contacts.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No emergency contacts configured yet.</p>';
    return;
  }

  container.innerHTML = contacts.map(c => `
    <div class="contact-item">
      <div>
        <h4 style="font-size: 16px; font-weight: 600;">${c.name}</h4>
        <p style="font-size: 13px; color: var(--text-secondary);">${c.relationship} • ${c.phone_number}</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge ${c.priority_order === 1 ? 'badge-danger' : 'badge-primary'}">
          Priority ${c.priority_order}
        </span>
        <span class="badge badge-primary">${c.notification_method}</span>
        <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="handleDeleteContact(${c.contact_id})">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

async function handleDeleteContact(contactId) {
  if (confirm("Are you sure you want to delete this emergency contact?")) {
    await EmergencyAPI.deleteContact(contactId);
    loadContacts();
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
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">No previous SOS events recorded.</p>';
    return;
  }

  container.innerHTML = history.map(ev => `
    <div class="contact-item" style="border-left: 4px solid var(--accent-red);">
      <div>
        <h4 style="font-size: 15px; font-weight: 600;">SOS Event #${ev.event_id} (${ev.trigger_type})</h4>
        <p style="font-size: 12px; color: var(--text-secondary);">${new Date(ev.timestamp).toLocaleString()} • ${ev.notes || ''}</p>
      </div>
      <span class="badge badge-danger">${ev.response_status}</span>
    </div>
  `).join('');
}

async function downloadMedicalSummary() {
  const data = await EmergencyAPI.exportMedicalSummary(currentUserId);
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", jsonStr);
  downloadAnchor.setAttribute("download", `Emergency_Medical_Card_${currentUserId}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
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
    appendChatMessage('HEALTHCARE AI BOT', response.reply, response.should_trigger_sos);

    if (response.should_trigger_sos) {
      setTimeout(() => {
        if (confirm("🚨 CRITICAL WARNING: AI detected emergency symptoms. Trigger VoiceCare SOS alert now?")) {
          triggerEmergencyAlert("VOICE_KEYWORD", message);
        }
      }, 500);
    }
  } catch (e) {
    appendChatMessage('HEALTHCARE AI BOT', "Notice: Unable to reach online AI service. Please tap the red SOS button directly if you are experiencing an emergency.", true);
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

  msgDiv.style.padding = '12px 16px';
  msgDiv.style.borderRadius = '14px';
  msgDiv.style.maxWidth = '85%';
  msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';

  if (isUser) {
    msgDiv.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(2, 132, 199, 0.2))';
    msgDiv.style.border = '1px solid rgba(6, 182, 212, 0.4)';
    msgDiv.style.borderBottomRightRadius = '4px';
  } else if (isCritical) {
    msgDiv.style.background = 'rgba(50, 12, 25, 0.9)';
    msgDiv.style.border = '2px solid var(--accent-red)';
    msgDiv.style.borderBottomLeftRadius = '4px';
    msgDiv.style.boxShadow = '0 0 15px rgba(255, 51, 102, 0.4)';
  } else {
    msgDiv.style.background = 'rgba(26, 35, 54, 0.7)';
    msgDiv.style.border = '1px solid var(--border-glass)';
    msgDiv.style.borderBottomLeftRadius = '4px';
  }

  msgDiv.innerHTML = `
    <div style="font-size: 11px; font-weight: 700; color: ${isUser ? 'var(--accent-cyan)' : (isCritical ? 'var(--accent-red)' : 'var(--accent-cyan)')}; mb: 4px;">${sender}</div>
    <div style="font-size: 13px; color: #ffffff; line-height: 1.5;">${text}</div>
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
