const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes('http'))
  ? `${window.location.origin}/api`
  : 'http://localhost:8080/api';

class EmergencyAPI {
  static async getProfile(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`);
      if (!res.ok) throw new Error("API response error");
      return await res.json();
    } catch (e) {
      console.warn("Using active session profile fallback");
      const savedUser = sessionStorage.getItem('rf_authenticated_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      return {
        user_id: userId,
        full_name: "Rahul Sharma",
        email: "rahul@rakshaflow.app",
        blood_group: "O+",
        allergies: "None",
        chronic_conditions: "None",
        medicines: "None",
        preferred_hospital: "St. Mary's General Hospital",
        trigger_word: "HELP"
      };
    }
  }

  static async updateProfile(userId, profileData) {
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      return await res.json();
    } catch (e) {
      console.warn("Saving profile update to session storage");
      const savedUser = sessionStorage.getItem('rf_authenticated_user');
      let userObj = savedUser ? JSON.parse(savedUser) : {};
      userObj = { ...userObj, ...profileData };
      sessionStorage.setItem('rf_authenticated_user', JSON.stringify(userObj));
      return userObj;
    }
  }

  static async getContacts(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/contacts/${userId}`);
      if (!res.ok) throw new Error("Contacts fetch error");
      return await res.json();
    } catch (e) {
      const storedContacts = localStorage.getItem(`rf_contacts_${userId}`);
      if (storedContacts) {
        return JSON.parse(storedContacts);
      }
      const initialContacts = [
        { contact_id: 101, name: "Dr. Robert Vance", relationship: "Son / Caregiver", phone_number: "+1-555-019-9944", priority_order: 1, notification_method: "SMS_CALL" },
        { contact_id: 102, name: "Sarah Jenkins", relationship: "Home Helper", phone_number: "+1-555-019-8833", priority_order: 2, notification_method: "PUSH" }
      ];
      localStorage.setItem(`rf_contacts_${userId}`, JSON.stringify(initialContacts));
      return initialContacts;
    }
  }

  static async addContact(userId, contactData) {
    try {
      const res = await fetch(`${API_BASE}/contacts/${userId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });
      if (!res.ok) throw new Error("Add contact API error");
      return await res.json();
    } catch (e) {
      const contacts = await EmergencyAPI.getContacts(userId);
      const newContact = { ...contactData, contact_id: Date.now() };
      contacts.push(newContact);
      localStorage.setItem(`rf_contacts_${userId}`, JSON.stringify(contacts));
      return newContact;
    }
  }

  static async deleteContact(contactId, userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Delete API error");
      return await res.json();
    } catch (e) {
      const contacts = await EmergencyAPI.getContacts(userId);
      const updated = contacts.filter(c => c.contact_id !== contactId);
      localStorage.setItem(`rf_contacts_${userId}`, JSON.stringify(updated));
      return { status: "SUCCESS", message: `Contact #${contactId} removed` };
    }
  }

  static async triggerSOS(payload) {
    try {
      const res = await fetch(`${API_BASE}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      return {
        event_id: Date.now(),
        status: "SOS_TRIGGERED",
        trigger_type: payload.trigger_type,
        notes: "Offline SOS payload prepared — alert ready",
        escalation: {
          user_name: "Rahul Sharma",
          user_phone: "+1-555-019-2831",
          location_link: `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`,
          dispatch_log: [
            { level: 1, target: "Primary Emergency Contacts", status: "NOTIFIED (PREPARED)", note: "Emergency alert prepared — SMS gateway service configuration required." }
          ]
        }
      };
    }
  }

  static async getSOSHistory(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/sos/history/${userId}`);
      if (!res.ok) throw new Error("History fetch error");
      return await res.json();
    } catch (e) {
      return [];
    }
  }

  static async exportMedicalSummary(userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/medical/export/${userId}`);
      return await res.json();
    } catch (e) {
      return await EmergencyAPI.getProfile(userId);
    }
  }

  static async sendHealthChatMessage(message, userId = 1) {
    try {
      const res = await fetch(`${API_BASE}/chat/health-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message, user_id: userId })
      });
      return await res.json();
    } catch (e) {
      const lower = message.toLowerCase();
      const isEmergency = lower.includes('chest pain') || lower.includes('stroke') || lower.includes('bleeding');
      return {
        reply: isEmergency 
          ? "CRITICAL ALERT: Chest pain or severe symptoms require immediate emergency care. Please press the red SOS button now."
          : "VoiceCare AI: If you are experiencing mild symptoms, rest and stay hydrated. For severe distress, tap SOS immediately.",
        should_trigger_sos: isEmergency
      };
    }
  }
}
