from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    full_name: str
    phone_number: str
    email: str
    password: str
    age: Optional[int] = None
    address: Optional[str] = None
    blood_group: Optional[str] = "O+"
    allergies: Optional[str] = "None"
    chronic_conditions: Optional[str] = "None"
    medicines: Optional[str] = "None"
    preferred_hospital: Optional[str] = "General Hospital"
    trigger_word: Optional[str] = "HELP EMERGENCY"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    medicines: Optional[str] = None
    preferred_hospital: Optional[str] = None
    trigger_word: Optional[str] = None

class UserOut(BaseModel):
    user_id: int
    full_name: str
    phone_number: str
    email: str
    age: Optional[int]
    address: Optional[str]
    blood_group: Optional[str]
    allergies: Optional[str]
    chronic_conditions: Optional[str]
    medicines: Optional[str]
    preferred_hospital: Optional[str]
    trigger_word: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Contact Schemas ---
class ContactCreate(BaseModel):
    name: str
    relationship: str
    phone_number: str
    priority_order: int = 1
    notification_method: str = "SMS_CALL"

class ContactOut(BaseModel):
    contact_id: int
    user_id: int
    name: str
    relationship: str
    phone_number: str
    priority_order: int
    notification_method: str

    class Config:
        from_attributes = True

# --- SOS Schemas ---
class SOSTriggerRequest(BaseModel):
    user_id: int
    trigger_type: str = "VOICE_KEYWORD" # VOICE_KEYWORD, MANUAL_BUTTON, FALL_DETECTION
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946
    spoken_phrase: Optional[str] = None
    notes: Optional[str] = None

class SOSEventOut(BaseModel):
    event_id: int
    user_id: int
    timestamp: datetime
    trigger_type: str
    latitude: Optional[float]
    longitude: Optional[float]
    response_status: str
    escalation_status: str
    notes: Optional[str]

    class Config:
        from_attributes = True

# --- Device Status Schema ---
class DeviceStatusUpdate(BaseModel):
    battery_level: int
    network_status: str
    microphone_permission: bool
    location_permission: bool
