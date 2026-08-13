import sys
import os
import unittest

# Add app directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.voice_engine import voice_engine

client = TestClient(app)

class TestEmergencyVoiceCareAPI(unittest.TestCase):

    def test_01_root_endpoint(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_02_voice_engine_matching(self):
        # Exact match test
        res1 = voice_engine.evaluate_spoken_input("Please I need HELP EMERGENCY right now", "HELP EMERGENCY")
        self.assertTrue(res1["is_triggered"])
        self.assertGreater(res1["confidence_score"], 0.90)

        # Keyword fallback test
        res2 = voice_engine.evaluate_spoken_input("Somebody call a DOCTOR quickly")
        self.assertTrue(res2["is_triggered"])

        # Non-matching text test
        res3 = voice_engine.evaluate_spoken_input("It is a beautiful sunny morning outside")
        self.assertFalse(res3["is_triggered"])

    def test_03_profile_endpoint(self):
        response = client.get("/api/profile/1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("full_name", data)
        self.assertIn("blood_group", data)

    def test_04_contacts_endpoint(self):
        response = client.get("/api/contacts/1")
        self.assertEqual(response.status_code, 200)
        contacts = response.json()
        self.assertIsInstance(contacts, list)

    def test_05_sos_trigger_flow(self):
        payload = {
            "user_id": 1,
            "trigger_type": "VOICE_KEYWORD",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "spoken_phrase": "HELP EMERGENCY"
        }
        response = client.post("/api/sos/trigger", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "SOS_TRIGGERED")
        self.assertIn("event_id", data)

    def test_06_medical_export(self):
        response = client.get("/api/medical/export/1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("emergency_medical_card", data)
        card = data["emergency_medical_card"]
        self.assertIn("full_name", card)
        self.assertIn("blood_group", card)

    def test_07_contact_add_and_delete(self):
        # Add contact
        add_res = client.post("/api/contacts/1/add", json={
            "name": "Test Contact",
            "relationship": "Friend",
            "phone_number": "+1-555-999-0000",
            "priority_order": 3,
            "notification_method": "SMS"
        })
        self.assertEqual(add_res.status_code, 200)
        contact_data = add_res.json()
        contact_id = contact_data["contact_id"]

        # Delete contact
        del_res = client.delete(f"/api/contacts/{contact_id}")
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(del_res.json()["status"], "SUCCESS")

    def test_08_healthcare_ai_chatbot(self):
        # General query
        res1 = client.post("/api/chat/health-assistant", json={"message": "What is CPR?", "user_id": 1})
        self.assertEqual(res1.status_code, 200)
        self.assertIn("CPR Instructions", res1.json()["reply"])
        self.assertFalse(res1.json()["should_trigger_sos"])

        # Critical red-flag emergency query
        res2 = client.post("/api/chat/health-assistant", json={"message": "I have severe chest pain and left arm numbness", "user_id": 1})
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json()["should_trigger_sos"])

if __name__ == "__main__":
    unittest.main()
