# 🚨 Emergency Voice Care Application

> **Hands-free emergency assistance system for elderly users, medical patients, and individuals unable to speak or tap a screen during a crisis.**

![System License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python Version](https://img.shields.io/badge/Python-3.10%2B-green.svg)
![FastAPI](https://img.shields.io/badge/Framework-FastAPI-teal.svg)
![Web Speech API](https://img.shields.io/badge/Voice-Web_Speech_API-red.svg)

---

## 📌 Executive Overview

The **Emergency Voice Care App** provides a reliable safety net for individuals in sudden medical crises (such as heart attacks, strokes, severe falls, fainting, or choking). By combining continuous ambient voice keyword detection with multi-tier emergency contact escalation, real-time GPS tracking, and instant medical profile handoff, this platform ensures help is summoned even when the user cannot dial a phone or speak at length.

---

## ⚡ Key Features

* **🎙️ Continuous Ambient Voice Listener:** Real-time keyword recognition using the Web Speech API and fuzzy Levenshtein phrase verification.
* **🚨 Glowing SOS Pulse Interface:** Single-tap manual override with a 5-second safety countdown to prevent false alarms.
* **🔊 Synthesized Audio Alarm:** Emergency tone generator built using the browser's Web Audio API.
* **📍 Live Location Sharing:** Automatic GPS coordinate detection with direct Google Maps link generation.
* **🛡️ Caregiver Escalation Chain:** Multi-tier priority dispatch logic (Priority 1 contacts -> Priority 2 contacts -> Regional Ambulance Fallback).
* **📋 Medical ID Card Export:** Instant export of medical summaries (blood type, allergies, conditions, medicines) formatted for emergency first responders.
* **📜 Audit Log & History:** Real-time event log tracking timestamp, trigger method, and escalation status.

---

## 🏗️ Project Structure

```
emergency_voice_care_app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                # FastAPI endpoints & static routing
│   │   ├── database.py            # SQLite & SQLAlchemy configuration
│   │   ├── models.py              # User, EmergencyContact, SOSEvent, DeviceStatus models
│   │   ├── schemas.py             # Pydantic validation schemas
│   │   ├── voice_engine.py        # Keyword matching & fuzzy verification engine
│   │   ├── escalation.py          # Escalation dispatch engine
│   │   └── medical_export.py      # Emergency medical summary exporter
│   ├── requirements.txt           # Python dependencies
│   └── tests/
│       └── test_api.py            # Automated API test suite
├── frontend/
│   ├── index.html                 # Glassmorphic dashboard UI
│   ├── css/
│   │   └── style.css              # Glassmorphic theme & CSS animations
│   ├── js/
│   │   ├── app.js                 # UI controller & countdown alarm
│   │   ├── voice_listener.js      # Continuous speech listener
│   │   ├── location_service.js    # GPS coordinates & mapping
│   │   └── api.js                 # REST API client
│   └── assets/                    # Icons and media
├── README.md                      # Quickstart and architecture guide
├── ABSTRACT.md                    # Formal project abstract & vision document
└── PROJECT_BLUEPRINT_SRS.md       # Complete SRS & technical blueprint
```

---

## 🚀 Quickstart Guide

### 1. Requirements
* Python 3.10+ installed
* Modern browser (Chrome, Edge, Safari, Firefox)

### 2. Launch the Application Server
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the uvicorn server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Open in Browser
Open your browser and navigate to:
**`http://localhost:8000`**

---

## 🧪 Running Automated Tests

To execute the backend test suite:
```bash
python backend/tests/test_api.py
```

Expected Output:
```
Ran 6 tests in 0.254s
OK
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new patient account |
| `POST` | `/api/auth/login` | Authenticate user |
| `GET` | `/api/profile/{user_id}` | Retrieve patient medical profile |
| `POST` | `/api/profile/{user_id}/update` | Update trigger word & medical details |
| `GET` | `/api/contacts/{user_id}` | List configured emergency contacts |
| `POST` | `/api/contacts/{user_id}/add` | Add a priority emergency contact |
| `POST` | `/api/sos/trigger` | Trigger emergency alert & dispatch notifications |
| `POST` | `/api/sos/evaluate-speech` | Test spoken phrase against trigger word |
| `GET` | `/api/sos/history/{user_id}` | Fetch historical SOS events |
| `GET` | `/api/medical/export/{user_id}` | Download medical summary JSON card |

---

## 📄 License
This project is licensed under the MIT License.
