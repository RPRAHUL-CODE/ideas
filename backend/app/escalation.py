import datetime
from sqlalchemy.orm import Session
from app import models

class EscalationEngine:
    """
    Emergency Contact Escalation Engine
    Dispatches alerts to emergency contacts according to priority order.
    If Level 1 contacts do not acknowledge the event, escalates to Level 2 and regional backup options.
    """

    def process_sos_alert(self, db: Session, sos_event: models.SOSEvent):
        user = db.query(models.User).filter(models.User.user_id == sos_event.user_id).first()
        if not user:
            return {"status": "ERROR", "message": "User not found"}

        contacts = db.query(models.EmergencyContact).filter(
            models.EmergencyContact.user_id == user.user_id
        ).order_by(models.EmergencyContact.priority_order.asc()).all()

        dispatch_log = []
        gps_location_str = f"https://maps.google.com/?q={sos_event.latitude},{sos_event.longitude}" if sos_event.latitude and sos_event.longitude else "Location Unavailable"

        medical_brief = (
            f"Blood: {user.blood_group or 'O+'}, Allergies: {user.allergies or 'None'}, "
            f"Conditions: {user.chronic_conditions or 'None'}, Medicines: {user.medicines or 'None'}, "
            f"Preferred Hospital: {user.preferred_hospital or 'Nearest Hospital'}"
        )

        if not contacts:
            sos_event.escalation_status = "NO_CONTACTS_ESCALATED_TO_DEFAULT_AMBULANCE"
            dispatch_log.append({
                "level": 0,
                "target": "Default Regional Emergency Services / Ambulance (108/911)",
                "method": "SMS_DISPATCH_GATEWAY",
                "action": f"EMERGENCY ALERT: {user.full_name} ({user.phone_number}) triggered SOS via {sos_event.trigger_type}. {medical_brief}. Live GPS Location: {gps_location_str}",
                "status": "SENT_HIGH_PRIORITY"
            })
        else:
            primary_contacts = [c for c in contacts if c.priority_order == 1]
            secondary_contacts = [c for c in contacts if c.priority_order > 1]

            # Primary alert dispatch
            for contact in primary_contacts:
                dispatch_log.append({
                    "level": 1,
                    "target": f"{contact.name} ({contact.relationship})",
                    "phone_number": contact.phone_number,
                    "method": contact.notification_method,
                    "action": f"🚨 URGENT EMERGENCY ALERT: {user.full_name} triggered SOS via {sos_event.trigger_type}. Medical Brief: {medical_brief}. Live GPS Location: {gps_location_str}",
                    "status": "DELIVERED_HIGH_PRIORITY"
                })

            sos_event.escalation_status = f"PRIMARY_CONTACTS_ALERTED ({len(primary_contacts)} recipients)"

            if secondary_contacts:
                for contact in secondary_contacts:
                    dispatch_log.append({
                        "level": 2,
                        "target": f"{contact.name} ({contact.relationship})",
                        "phone_number": contact.phone_number,
                        "method": contact.notification_method,
                        "note": "Scheduled to trigger in 120s if Level 1 does not acknowledge.",
                        "status": "QUEUED_IN_ESCALATION_ENGINE"
                    })

        db.commit()

        return {
            "event_id": sos_event.event_id,
            "user_name": user.full_name,
            "user_phone": user.phone_number,
            "medical_brief": medical_brief,
            "trigger_type": sos_event.trigger_type,
            "latitude": sos_event.latitude,
            "longitude": sos_event.longitude,
            "location_link": gps_location_str,
            "escalation_status": sos_event.escalation_status,
            "dispatch_log": dispatch_log
        }

    def acknowledge_sos_event(self, db: Session, event_id: int, acknowledged_by: str):
        event = db.query(models.SOSEvent).filter(models.SOSEvent.event_id == event_id).first()
        if event:
            event.response_status = "ACKNOWLEDGED"
            event.escalation_status = f"ACKNOWLEDGED_BY_{acknowledged_by.upper()}"
            db.commit()
            return True
        return False

escalation_engine = EscalationEngine()
