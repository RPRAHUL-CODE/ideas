# 📐 PROJECT BLUEPRINT & SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Emergency Voice Care Application

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Problem Statement](#2-product-vision--problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Target Users](#4-target-users)
5. [Key Features & Scope Breakdown](#5-key-features--scope-breakdown)
6. [Software Requirements Specification (SRS)](#6-software-requirements-specification-srs)
    * 6.1 Purpose
    * 6.2 Scope
    * 6.3 Functional Requirements
    * 6.4 Non-Functional Requirements
    * 6.5 System Constraints
7. [Recommended Technology Stack](#7-recommended-technology-stack)
8. [System Architecture](#8-system-architecture)
9. [Database Design & Schema](#9-database-design--schema)
10. [API Specification](#10-api-specification)
11. [Security, Privacy & Risk Mitigation](#11-security-privacy--risk-mitigation)
12. [Development Roadmap & Team Strategy](#12-development-roadmap--team-strategy)
13. [Winning Differentiation Strategy](#13-winning-differentiation-strategy)

---

## 1. Executive Summary
The **Emergency Voice Care App** is a hands-free emergency assistance system engineered for elderly citizens, medical patients, and individuals who may be physically or verbally unable to use a smartphone during a crisis. By speaking a pre-configured trigger phrase (e.g. *"HELP EMERGENCY"*), the system immediately initiates a multi-stage emergency workflow: alerting priority caregivers, broadcasting live GPS coordinates, presenting emergency medical records, and escalating to fallback contacts if no acknowledgement is received.

---

## 2. Product Vision & Problem Statement

### **Problem Statement**
During acute medical crises (stroke, cardiac arrest, fainting, severe falls, choking), victims often suffer from motor loss, confusion, or severe physical weakness. Manually unlocking a phone, scrolling through contacts, or operating traditional apps is frequently impossible. Delay in reaching caregivers or medical personnel significantly increases mortality and long-term morbidity rates.

### **Product Vision**
To build a zero-friction, ambient safety app that behaves like an omnipresent virtual caregiver. A single word spoken anywhere in the room triggers an automated emergency response chain.

---

## 3. Solution Overview
The application executes the following automated workflow:
1. **Continuous Voice Monitoring:** Listens for ambient voice matching a custom trigger phrase.
2. **Cancellation Window:** Gives a 5-second window with an audible alarm tone to cancel false triggers.
3. **Location & Data Package:** Attaches real-time GPS coordinates and mapping URLs.
4. **Caregiver Escalation:** Alerts Level 1 primary contacts via SMS/Call/Push. If unacknowledged within 120 seconds, escalates to Level 2 contacts and emergency service fallbacks.
5. **Responder Medical Summary:** Generates an accessible medical ID card containing blood group, allergies, medications, and preferred hospital.

---

## 4. Target Users
* **Elderly individuals** living independently at home.
* **Patients with chronic health conditions** (cardiovascular disease, epilepsy, severe diabetes).
* **Individuals with speech or mobility impairments.**
* **Family caregivers, home helpers, and medical guardians.**

---

## 5. Key Features & Scope Breakdown

| Feature Category | Core MVP Scope | Future Scope (Post-MVP) |
| :--- | :--- | :--- |
| **Voice Trigger** | Custom keyword detection & fuzzy acoustic phrase matching | Multi-language triggers & speaker voice profiling |
| **Emergency SOS** | One-tap manual button + 5s countdown modal + audio alarm tone | Automatic accelerometer fall detection |
| **Escalation** | Multi-tier priority escalation (Priority 1 -> Priority 2) | Automatic regional 911 / 108 ambulance dispatch integration |
| **Location** | Live GPS location tracking & Google Maps URL generation | Indoor Bluetooth beacon & room-level positioning |
| **Medical Record** | Medical profile storage & JSON/HTML emergency card export | Direct hospital EHR / EMR system handoff |

---

## 6. Software Requirements Specification (SRS)

### 6.1 Purpose
This document defines the complete functional and non-functional requirements for the Emergency Voice Care system across mobile, web, and backend services.

### 6.2 Scope
Applies to the core Web / Mobile client application, the voice trigger engine, the FastAPI backend services, SQLite database schema, and medical export utilities.

### 6.3 Functional Requirements
* **FR-1 Authentication:** System shall allow user registration, login, and profile credential management.
* **FR-2 Profile Management:** System shall store blood type, allergies, chronic conditions, medicines, preferred hospital, and custom trigger phrases.
* **FR-3 Emergency Contacts:** System shall allow users to add, update, and order emergency contacts by priority.
* **FR-4 Voice Detection:** System shall continuously monitor ambient audio for the trigger word when enabled.
* **FR-5 SOS Activation:** System shall trigger an SOS event upon keyword match or manual SOS button press.
* **FR-6 Alert Dispatch:** System shall dispatch notifications with live GPS location links to primary contacts.
* **FR-7 Escalation Logic:** System shall automatically escalate alerts if primary contacts do not acknowledge within 120 seconds.
* **FR-8 Medical Summary:** System shall generate exportable medical ID summaries formatted for first responders.

### 6.4 Non-Functional Requirements
* **NFR-1 Response Time:** Voice trigger match to alert generation shall execute within < 1.5 seconds.
* **NFR-2 Reliability:** False positive rates shall be minimized using fuzzy Levenshtein matching and confirmation countdowns.
* **NFR-3 Usability:** High-contrast glassmorphic UI with large high-visibility buttons for elderly users.
* **NFR-4 Security:** End-to-end data encryption in transit and at rest for sensitive medical information.

### 6.5 System Constraints
* Background microphone permissions mandated by Android/iOS operating systems.
* Device battery optimization policies affecting continuous background execution.
* Network dependency for real-time map link generation and SMS gateway delivery.

---

## 7. Recommended Technology Stack

```
+-----------------------------------------------------------------------+
|                           TECHNOLOGY STACK                            |
+-----------------------------------------------------------------------+
|  Frontend UI      | HTML5, CSS3 (Glassmorphic Theme), JavaScript (ES6+)  |
|  Voice Engine     | Web Speech API (Client) + Levenshtein Engine (Backend)|
|  Backend API      | Python (FastAPI framework)                            |
|  Database Layer   | SQLite / SQLAlchemy ORM                               |
|  Location Engine  | HTML5 Geolocation API + Google Maps URL Engine        |
|  Audio Alert      | Web Audio API (Synthesized Sawtooth Frequency Alarm)  |
+-----------------------------------------------------------------------+
```

---

## 8. System Architecture

The architecture consists of 6 decoupled layers:

1. **Layer 1 (Client UI):** Collects user profile, manages permissions, renders high-contrast glassmorphic dashboard, handles manual SOS taps.
2. **Layer 2 (Voice Engine):** Continuous microphone listener, speech-to-text parser, keyword matcher.
3. **Layer 3 (Backend API):** FastAPI application handling authentication, profile updates, contact management, and event routing.
4. **Layer 4 (Escalation Engine):** Manages multi-tier alert queues, timed fallback triggers, and acknowledgement statuses.
5. **Layer 5 (Location Engine):** Captures latitude/longitude coordinates and generates shareable map URLs.
6. **Layer 6 (Medical Exporter):** Generates structured JSON / HTML medical ID cards for emergency personnel.

---

## 9. Database Design & Schema

### `users` Table
```sql
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    age INTEGER,
    address TEXT,
    blood_group VARCHAR(10),
    allergies TEXT,
    chronic_conditions TEXT,
    medicines TEXT,
    preferred_hospital VARCHAR(150),
    trigger_word VARCHAR(50) DEFAULT 'HELP EMERGENCY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `emergency_contacts` Table
```sql
CREATE TABLE emergency_contacts (
    contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER FOREIGN KEY REFERENCES users(user_id),
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    priority_order INTEGER DEFAULT 1,
    notification_method VARCHAR(30) DEFAULT 'SMS_CALL'
);
```

### `sos_events` Table
```sql
CREATE TABLE sos_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER FOREIGN KEY REFERENCES users(user_id),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    trigger_type VARCHAR(30) NOT NULL,
    latitude FLOAT,
    longitude FLOAT,
    address_snapshot TEXT,
    response_status VARCHAR(30) DEFAULT 'ACTIVE',
    escalation_status VARCHAR(30) DEFAULT 'PRIMARY_CONTACTS_ALERTED',
    notes TEXT
);
```

### `device_status` Table
```sql
CREATE TABLE device_status (
    device_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER FOREIGN KEY REFERENCES users(user_id),
    battery_level INTEGER DEFAULT 100,
    network_status VARCHAR(20) DEFAULT 'ONLINE',
    microphone_permission BOOLEAN DEFAULT TRUE,
    location_permission BOOLEAN DEFAULT TRUE,
    last_sync_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 10. API Specification

* `POST /api/auth/register` - Create patient account
* `POST /api/auth/login` - Authenticate patient
* `GET /api/profile/{user_id}` - Get patient profile
* `POST /api/profile/{user_id}/update` - Update profile & trigger word
* `GET /api/contacts/{user_id}` - Fetch emergency contacts
* `POST /api/contacts/{user_id}/add` - Add emergency contact
* `POST /api/sos/trigger` - Dispatch SOS event
* `POST /api/sos/evaluate-speech` - Evaluate spoken phrase against trigger
* `POST /api/sos/{event_id}/acknowledge` - Acknowledge active SOS event
* `GET /api/sos/history/{user_id}` - Retrieve past SOS event history
* `GET /api/medical/export/{user_id}` - Export medical card JSON summary

---

## 11. Security, Privacy & Risk Mitigation

* **Data Encryption:** All sensitive medical and location data is encrypted in transit via HTTPS/TLS and at rest.
* **Consent & Privacy:** Explicit user consent screens; full support for account and medical record deletion.
* **False Positive Reduction:** 5-second cancellation modal with audible countdown beeps to allow users to cancel accidental triggers.
* **Connectivity Fallback:** If internet data connection fails, emergency alerts fallback to cellular SMS and direct voice dialers.

---

## 12. Development Roadmap & Team Strategy

### **Development Phases**
* **Phase 1 (MVP - Completed):** Core FastAPI API, SQLite Database models, Glassmorphic Web App, Web Speech voice trigger listener, Live GPS simulation, Medical ID exporter.
* **Phase 2 (Stability & Escalation):** Automated SMS Gateway integration (Twilio/Plivo), background worker service, advanced permission handling.
* **Phase 3 (Hardware & AI):** Fall detection algorithms using device accelerometer/gyroscope, smartwatch companion app, AI emergency severity classifier.

### **Execution Model**
* **Plan A (Full Enterprise Team):** Backend Lead, Mobile Developer, UI/UX Designer, DevOps Engineer, QA Automation Engineer, Product Manager.
* **Plan B (Lean Solo Build - Executed):** Full-stack engineer leveraging Python FastAPI, SQLite, and Web APIs for rapid deployment.

---

## 13. Winning Differentiation Strategy

The **Emergency Voice Care App** stands out in the personal safety market through four core pillars:
1. **Frictionless Spoken Triggers:** Hands-free emergency activation when the phone is across the room or out of physical reach.
2. **Structured Medical Handoff:** Instantly provides first responders with life-saving health context (blood type, allergies, medications) rather than just a generic alarm.
3. **Reliable Escalation Protocols:** Ensures alerts never get lost by automatically escalating if primary caregivers are unavailable.
4. **Accessible Glassmorphic UI:** High-contrast, large-touch target design tailored for elderly users and individuals experiencing visual or physical distress.
