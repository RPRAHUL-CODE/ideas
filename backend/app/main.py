import os
import datetime
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app import models, schemas
from app.voice_engine import voice_engine
from app.escalation import escalation_engine
from app.medical_export import generate_medical_summary

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Emergency Voice Care API",
    description="Backend services for voice-activated medical emergency assistance, caregiver escalation, and medical summary export.",
    version="1.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Frontend static assets
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    css_dir = os.path.join(FRONTEND_DIR, "css")
    js_dir = os.path.join(FRONTEND_DIR, "js")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

@app.get("/")
def serve_home():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Emergency Voice Care API is running successfully."}

# Helper to seed default demo user if DB empty
def seed_demo_user(db: Session):
    user = db.query(models.User).filter(models.User.email == "demo@carevoice.app").first()
    if not user:
        demo_user = models.User(
            full_name="Eleanor Vance",
            phone_number="+1-555-019-2831",
            email="demo@carevoice.app",
            password_hash="demo_hashed_pw",
            age=74,
            address="742 Evergreen Terrace, Springfield, OR",
            blood_group="A+",
            allergies="Penicillin, Peanuts",
            chronic_conditions="Hypertension, Type 2 Diabetes",
            medicines="Lisinopril 10mg, Metformin 500mg",
            preferred_hospital="St. Mary's General Hospital",
            trigger_word="HELP EMERGENCY"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        # Seed contacts
        c1 = models.EmergencyContact(
            user_id=demo_user.user_id,
            name="Dr. Robert Vance",
            relationship="Son / Primary Caregiver",
            phone_number="+1-555-019-9944",
            priority_order=1,
            notification_method="SMS_CALL"
        )
        c2 = models.EmergencyContact(
            user_id=demo_user.user_id,
            name="Sarah Jenkins",
            relationship="Home Helper",
            phone_number="+1-555-019-8833",
            priority_order=2,
            notification_method="PUSH"
        )
        db.add_all([c1, c2])

        # Seed device status
        dev = models.DeviceStatus(
            user_id=demo_user.user_id,
            battery_level=88,
            network_status="ONLINE_WIFI",
            microphone_permission=True,
            location_permission=True
        )
        db.add(dev)
        db.commit()

# --- Auth Endpoints ---
@app.post("/api/auth/register", response_model=schemas.UserOut)
def register_user(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(
        (models.User.email == user_in.email) | (models.User.phone_number == user_in.phone_number)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or phone number already exists.")

    new_user = models.User(
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        email=user_in.email,
        password_hash="hashed_" + user_in.password,
        age=user_in.age,
        address=user_in.address,
        blood_group=user_in.blood_group,
        allergies=user_in.allergies,
        chronic_conditions=user_in.chronic_conditions,
        medicines=user_in.medicines,
        preferred_hospital=user_in.preferred_hospital,
        trigger_word=user_in.trigger_word or "HELP EMERGENCY"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize device status
    dev = models.DeviceStatus(user_id=new_user.user_id)
    db.add(dev)
    db.commit()

    return new_user

@app.post("/api/auth/login", response_model=schemas.UserOut)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    seed_demo_user(db)
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid email or password.")
    return user

# --- Profile Endpoints ---
@app.get("/api/profile/{user_id}", response_model=schemas.UserOut)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    seed_demo_user(db)
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        user = db.query(models.User).first()
    return user

@app.post("/api/profile/{user_id}/update", response_model=schemas.UserOut)
def update_user_profile(user_id: int, update_data: schemas.UserProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, val in update_data.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(user, field, val)

    db.commit()
    db.refresh(user)
    return user

# --- Contact Endpoints ---
@app.get("/api/contacts/{user_id}", response_model=List[schemas.ContactOut])
def list_contacts(user_id: int, db: Session = Depends(get_db)):
    seed_demo_user(db)
    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id
    ).order_by(models.EmergencyContact.priority_order.asc()).all()
    return contacts

@app.post("/api/contacts/{user_id}/add", response_model=schemas.ContactOut)
def add_contact(user_id: int, contact_in: schemas.ContactCreate, db: Session = Depends(get_db)):
    contact = models.EmergencyContact(
        user_id=user_id,
        name=contact_in.name,
        relationship=contact_in.relationship,
        phone_number=contact_in.phone_number,
        priority_order=contact_in.priority_order,
        notification_method=contact_in.notification_method
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(models.EmergencyContact).filter(models.EmergencyContact.contact_id == contact_id).first()
    if contact:
        db.delete(contact)
        db.commit()
        return {"status": "SUCCESS", "message": "Contact deleted"}
    raise HTTPException(status_code=404, detail="Contact not found")

# --- SOS & Speech Endpoints ---
@app.post("/api/sos/evaluate-speech")
def evaluate_speech(spoken_text: str, user_id: int = 1, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    trigger_word = user.trigger_word if user else "HELP EMERGENCY"
    result = voice_engine.evaluate_spoken_input(spoken_text, trigger_word)
    return result

@app.post("/api/sos/trigger")
def trigger_sos(req: schemas.SOSTriggerRequest, db: Session = Depends(get_db)):
    seed_demo_user(db)
    user = db.query(models.User).filter(models.User.user_id == req.user_id).first()
    if not user:
        user = db.query(models.User).first()
        req.user_id = user.user_id

    # Create SOS Event
    event = models.SOSEvent(
        user_id=req.user_id,
        trigger_type=req.trigger_type,
        latitude=req.latitude,
        longitude=req.longitude,
        notes=req.notes or f"Spoken phrase: '{req.spoken_phrase}'" if req.spoken_phrase else "SOS Trigger Activated",
        response_status="ACTIVE",
        escalation_status="INITIATED"
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Process Escalation Dispatch
    dispatch_result = escalation_engine.process_sos_alert(db, event)

    return {
        "status": "SOS_TRIGGERED",
        "event_id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "trigger_type": event.trigger_type,
        "escalation": dispatch_result
    }

@app.post("/api/sos/{event_id}/acknowledge")
def acknowledge_sos(event_id: int, responder_name: str = "Primary Caregiver", db: Session = Depends(get_db)):
    success = escalation_engine.acknowledge_sos_event(db, event_id, responder_name)
    if not success:
        raise HTTPException(status_code=404, detail="SOS Event not found")
    return {"status": "SUCCESS", "message": f"SOS Event #{event_id} acknowledged by {responder_name}"}

@app.get("/api/sos/history/{user_id}", response_model=List[schemas.SOSEventOut])
def get_sos_history(user_id: int, db: Session = Depends(get_db)):
    seed_demo_user(db)
    events = db.query(models.SOSEvent).filter(
        models.SOSEvent.user_id == user_id
    ).order_by(models.SOSEvent.timestamp.desc()).all()
    return events

# --- Medical Export Endpoint ---
@app.get("/api/medical/export/{user_id}")
def export_medical_summary(user_id: int, db: Session = Depends(get_db)):
    seed_demo_user(db)
    return generate_medical_summary(db, user_id)

# --- Device Status Endpoint ---
@app.get("/api/device/status/{user_id}")
def get_device_status(user_id: int, db: Session = Depends(get_db)):
    seed_demo_user(db)
    status_rec = db.query(models.DeviceStatus).filter(models.DeviceStatus.user_id == user_id).first()
    if not status_rec:
        status_rec = models.DeviceStatus(user_id=user_id, battery_level=92, network_status="ONLINE_5G")
        db.add(status_rec)
        db.commit()
        db.refresh(status_rec)
    return {
        "battery_level": status_rec.battery_level,
        "network_status": status_rec.network_status,
        "microphone_permission": status_rec.microphone_permission,
        "location_permission": status_rec.location_permission,
        "last_sync_time": status_rec.last_sync_time.isoformat()
    }

# --- Healthcare AI Chatbot Endpoint ---
@app.post("/api/chat/health-assistant")
def healthcare_ai_assistant(data: dict, db: Session = Depends(get_db)):
    user_message = data.get("message", "").strip()
    user_id = data.get("user_id", 1)
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    user_name = user.full_name if user else "Patient"

    msg_lower = user_message.lower()
    
    # Red-flag emergency triage check
    critical_triggers = ["chest pain", "heart attack", "stroke", "cannot breathe", "breathing difficulty", "unconscious", "heavy bleeding", "numbness left arm", "severe allergic"]
    is_critical = any(ct in msg_lower for ct in critical_triggers)
    
    if is_critical:
        bot_response = f"🚨 URGENT MEDICAL WARNING: Your query indicates a potentially critical emergency ({user_message}). Please stay calm. I am automatically offering to dispatch your VoiceCare SOS alert to your primary contacts and emergency services immediately."
        triage_level = "CRITICAL_RED_FLAG"
        should_sos = True
    elif "cpr" in msg_lower:
        bot_response = "CPR Instructions: 1) Call emergency service 108/911. 2) Place hands in center of chest. 3) Push hard and fast (100-120 compressions/min) to the beat of 'Staying Alive'. 4) Continue until help arrives."
        triage_level = "FIRST_AID_GUIDANCE"
        should_sos = False
    elif "fever" in msg_lower:
        bot_response = "Fever Guidance: Stay hydrated, rest, and use OTC antipyretics like acetaminophen/paracetamol if appropriate. If fever exceeds 103°F (39.4°C) or lasts >3 days, seek urgent medical evaluation."
        triage_level = "GENERAL_HEALTH"
        should_sos = False
    elif "burn" in msg_lower:
        bot_response = "First Aid for Burns: Cool the burn under cool running water for 10-20 minutes. Cover loosely with a clean, sterile bandage. Do not apply ice, butter, or break blisters."
        triage_level = "FIRST_AID_GUIDANCE"
        should_sos = False
    else:
        bot_response = f"Hello {user_name}, I am your VoiceCare Healthcare AI Assistant. I can assist with first-aid steps, symptom checking, and emergency guidance. How are you feeling right now? (Note: For severe pain or breathing issues, use the SOS button immediately)."
        triage_level = "GENERAL_ASSISTANT"
        should_sos = False
        
    return {
        "reply": bot_response,
        "triage_level": triage_level,
        "should_trigger_sos": should_sos,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "disclaimer": "This AI Healthcare Assistant provides first-aid information and symptom triage only, not professional medical diagnosis."
    }
