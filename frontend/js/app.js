let currentUserId = 1;
let countdownTimer = null;
let countdownSeconds = 5;
let audioContext = null;

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadProfile();
  loadContacts();
  loadHistory();
  initVoiceListener();
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
  
  showNotificationModal("🚨 SOS ALERT DISPATCHED", `Emergency alert sent to contacts & caregivers. Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
  loadHistory();
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
      </div>
    </div>
  `).join('');
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
