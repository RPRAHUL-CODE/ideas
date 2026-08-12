const API_BASE = 'http://localhost:8000/api';

class EmergencyAPI {
  static async getProfile(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`);
      return await res.json();
    } catch (e) {
      console.warn("Using offline fallback profile");
      return {
        user_id: 1,
        full_name: "Eleanor Vance",
        phone_number: "+1-555-019-2831",
        blood_group: "A+",
        allergies: "Penicillin, Peanuts",
        chronic_conditions: "Hypertension, Type 2 Diabetes",
        medicines: "Lisinopril 10mg, Metformin 500mg",
        preferred_hospital: "St. Mary's General Hospital",
        trigger_word: "HELP EMERGENCY"
      };
    }
  }

  static async updateProfile(userId, profileData) {
    const res = await fetch(`${API_BASE}/profile/${userId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return await res.json();
  }

  static async getContacts(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/contacts/${userId}`);
      return await res.json();
    } catch (e) {
      return [
        { contact_id: 1, name: "Dr. Robert Vance", relationship: "Son / Primary Caregiver", phone_number: "+1-555-019-9944", priority_order: 1, notification_method: "SMS_CALL" },
        { contact_id: 2, name: "Sarah Jenkins", relationship: "Home Helper", phone_number: "+1-555-019-8833", priority_order: 2, notification_method: "PUSH" }
      ];
    }
  }

  static async addContact(userId, contactData) {
    const res = await fetch(`${API_BASE}/contacts/${userId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contactData)
    });
    return await res.json();
  }

  static async triggerSOS(payload) {
    const res = await fetch(`${API_BASE}/sos/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  static async evaluateSpeech(spokenText, userId = 1) {
    const res = await fetch(`${API_BASE}/sos/evaluate-speech?spoken_text=${encodeURIComponent(spokenText)}&user_id=${userId}`, {
      method: 'POST'
    });
    return await res.json();
  }

  static async getSOSHistory(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/sos/history/${userId}`);
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  static async exportMedicalSummary(userId = 1) {
    const res = await fetch(`${API_BASE}/medical/export/${userId}`);
    return await res.json();
  }
}
