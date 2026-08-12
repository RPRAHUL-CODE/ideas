import re
import math

class VoiceEngine:
    """
    Keyword Verification & Acoustic Phrase Matching Engine
    Provides exact & fuzzy matching algorithms for emergency trigger word detection,
    noise filtering, and false-positive risk evaluation.
    """

    def __init__(self, default_trigger="HELP EMERGENCY"):
        self.default_trigger = default_trigger.upper()
        self.emergency_keywords = ["HELP", "EMERGENCY", "SAVE ME", "DOCTOR", "ACCIDENT", "FALLEN", "CHOKING", "PAIN"]

    def normalize_text(self, text: str) -> str:
        if not text:
            return ""
        # Remove special characters and clean whitespace
        cleaned = re.sub(r'[^A-ZA-Z0-9\s]', '', text.upper())
        return " ".join(cleaned.split())

    def calculate_similarity(self, word1: str, word2: str) -> float:
        """ Levenshtein distance based normalized similarity score """
        if word1 == word2:
            return 1.0
        len1, len2 = len(word1), len(word2)
        if len1 == 0 or len2 == 0:
            return 0.0

        matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        for i in range(len1 + 1):
            matrix[i][0] = i
        for j in range(len2 + 1):
            matrix[0][j] = j

        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if word1[i - 1] == word2[j - 1] else 1
                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                )

        distance = matrix[len1][len2]
        max_len = max(len1, len2)
        return round(1.0 - (distance / max_len), 2)

    def evaluate_spoken_input(self, spoken_text: str, user_trigger_word: str = None) -> dict:
        target_trigger = (user_trigger_word or self.default_trigger).upper()
        norm_spoken = self.normalize_text(spoken_text)
        norm_target = self.normalize_text(target_trigger)

        is_match = False
        confidence = 0.0
        match_reason = "No emergency trigger detected."

        # Direct match check
        if norm_target in norm_spoken:
            is_match = True
            confidence = 0.98
            match_reason = f"Exact match for trigger phrase: '{target_trigger}'"
        else:
            # Check individual token matches & fuzzy similarity
            target_tokens = norm_target.split()
            spoken_tokens = norm_spoken.split()

            matched_tokens = 0
            for t_token in target_tokens:
                best_token_score = 0.0
                for s_token in spoken_tokens:
                    score = self.calculate_similarity(t_token, s_token)
                    if score > best_token_score:
                        best_token_score = score
                if best_token_score >= 0.75:
                    matched_tokens += 1

            if len(target_tokens) > 0:
                match_ratio = matched_tokens / len(target_tokens)
                if match_ratio >= 0.5:
                    is_match = True
                    confidence = round(0.70 + (match_ratio * 0.25), 2)
                    match_reason = f"High confidence fuzzy match ({matched_tokens}/{len(target_tokens)} keywords recognized)"

            # General emergency keyword fallback
            if not is_match:
                for ek in self.emergency_keywords:
                    if ek in norm_spoken:
                        is_match = True
                        confidence = 0.85
                        match_reason = f"Standard emergency keyword detected: '{ek}'"
                        break

        return {
            "is_triggered": is_match,
            "confidence_score": confidence,
            "match_reason": match_reason,
            "normalized_input": norm_spoken,
            "target_trigger": norm_target
        }

voice_engine = VoiceEngine()
