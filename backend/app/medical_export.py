from sqlalchemy.orm import Session
from app import models

def generate_medical_summary(db: Session, user_id: int) -> dict:
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        return {"error": "User not found"}

    contacts = db.query(models.EmergencyContact).filter(
        models.EmergencyContact.user_id == user_id
    ).order_by(models.EmergencyContact.priority_order.asc()).all()

    contacts_summary = [
        {
            "name": c.name,
            "relationship": c.relationship,
            "phone": c.phone_number,
            "priority": c.priority_order
        } for c in contacts
    ]

    return {
        "emergency_medical_card": {
            "full_name": user.full_name,
            "age": user.age,
            "blood_group": user.blood_group,
            "phone_number": user.phone_number,
            "emergency_address": user.address,
            "allergies": user.allergies,
            "chronic_conditions": user.chronic_conditions,
            "current_medicines": user.medicines,
            "preferred_hospital": user.preferred_hospital,
            "registered_trigger_word": user.trigger_word,
            "emergency_contacts": contacts_summary,
            "export_disclaimer": "CONFIDENTIAL MEDICAL RECORD - TO BE ACCESSED ONLY DURING MEDICAL EMERGENCY"
        }
    }
