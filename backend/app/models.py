import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship as ORMRelationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    address = Column(Text, nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(Text, nullable=True)
    chronic_conditions = Column(Text, nullable=True)
    medicines = Column(Text, nullable=True)
    preferred_hospital = Column(String(150), nullable=True)
    trigger_word = Column(String(50), default="HELP EMERGENCY", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    contacts = ORMRelationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")
    sos_events = ORMRelationship("SOSEvent", back_populates="user", cascade="all, delete-orphan")
    device_status = ORMRelationship("DeviceStatus", back_populates="user", uselist=False, cascade="all, delete-orphan")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    contact_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    name = Column(String(100), nullable=False)
    relationship = Column(String(50), nullable=False)
    phone_number = Column(String(20), nullable=False)
    priority_order = Column(Integer, default=1)
    notification_method = Column(String(30), default="SMS_CALL") # SMS, CALL, PUSH, EMAIL

    user = ORMRelationship("User", back_populates="contacts")

class SOSEvent(Base):
    __tablename__ = "sos_events"

    event_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    trigger_type = Column(String(30), nullable=False) # VOICE_KEYWORD, MANUAL_BUTTON, FALL_DETECTION
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address_snapshot = Column(Text, nullable=True)
    response_status = Column(String(30), default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED, CANCELLED
    escalation_status = Column(String(30), default="PRIMARY_CONTACTS_ALERTED")
    notes = Column(Text, nullable=True)

    user = ORMRelationship("User", back_populates="sos_events")

class DeviceStatus(Base):
    __tablename__ = "device_status"

    device_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    battery_level = Column(Integer, default=100)
    network_status = Column(String(20), default="ONLINE")
    microphone_permission = Column(Boolean, default=True)
    location_permission = Column(Boolean, default=True)
    last_sync_time = Column(DateTime, default=datetime.datetime.utcnow)

    user = ORMRelationship("User", back_populates="device_status")
