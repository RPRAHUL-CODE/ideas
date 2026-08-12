class VoiceTriggerListener {
  constructor() {
    this.recognition = None;
    this.isListening = false;
    this.targetTrigger = "HELP EMERGENCY";
    this.onTriggerCallback = null;
    this.onSpeechResultCallback = null;

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateUIStatus("Listening for trigger: " + this.targetTrigger, true);
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        
        if (this.onSpeechResultCallback) {
          this.onSpeechResultCallback(transcript);
        }

        this.checkTriggerMatch(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
      };

      this.recognition.onend = () => {
        // Auto-restart if continuous mode active
        if (this.isListening) {
          try { this.recognition.start(); } catch (e) {}
        }
      };
    } else {
      console.warn("Web Speech API not supported in browser; fallback to simulation mode.");
    }
  }

  setTargetTrigger(triggerWord) {
    if (triggerWord) {
      this.targetTrigger = triggerWord.toUpperCase();
    }
  }

  startListening(onTrigger, onResult) {
    this.onTriggerCallback = onTrigger;
    this.onSpeechResultCallback = onResult;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        console.log("Recognition already active");
      }
    } else {
      this.isListening = true;
      this.updateUIStatus("Simulated Listener Active for: " + this.targetTrigger, true);
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.updateUIStatus("Voice Listener Standby", false);
  }

  checkTriggerMatch(text) {
    if (!text) return;
    const cleanText = text.toUpperCase();

    // Direct client-side check or server API evaluation
    if (cleanText.includes(this.targetTrigger) || cleanText.includes("HELP") || cleanText.includes("EMERGENCY")) {
      console.log("🔥 Trigger word detected in speech:", text);
      if (this.onTriggerCallback) {
        this.onTriggerCallback({
          spoken_phrase: text,
          matched_trigger: this.targetTrigger
        });
      }
    }
  }

  updateUIStatus(statusText, active) {
    const badge = document.getElementById('micBadge');
    const label = document.getElementById('micStatusLabel');
    if (label) label.textContent = statusText;
    if (badge) {
      if (active) badge.classList.add('listening');
      else badge.classList.remove('listening');
    }
  }
}

const voiceListener = new VoiceTriggerListener();
