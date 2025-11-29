// frontend/assets/js/voice.js — WEB SPEECH API MODE (FAST LANE)

class VoiceRecorder {
    constructor() {
        this.isRecording = false;
        this.recognition = null;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US'; // Default to English

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateButton(true);
                window.chat.addMessage("🎤 Listening...", "bot");
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateButton(false);
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("🎤 Heard:", transcript);
                this.processText(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error("Voice Error:", event.error);
                this.isRecording = false;
                this.updateButton(false);
                this.showVoiceError(`Error: ${event.error}`);
            };
        } else {
            console.warn("Web Speech API not supported.");
            this.showVoiceError("Browser does not support voice.");
        }
    }

    async toggleRecording() {
        if (!this.recognition) return;

        if (!this.isRecording) {
            this.recognition.start();
        } else {
            this.recognition.stop();
        }
    }

    // ----------------------------------------------------------
    // PROCESS TEXT (SEND TO BACKEND FOR PARSING)
    // ----------------------------------------------------------
    async processText(text) {
        try {
            window.chat.addMessage(`🎤 You said: "${text}"`, "user");
            window.chat.showTyping();

            const res = await fetch("/api/voice/process_text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    user_id: window.chat.userId
                })
            });

            const data = await res.json().catch(() => ({}));

            window.chat.hideTyping();

            if (data.success) {
                // Pass text AND parsed data to Chat Manager
                await window.chat.processVoiceText(data.text, data.parsed_data);

                // Show AI Insight if available
                if (data.ai_insight) {
                    window.chat.addMessage(
                        `💡 <strong>AI Insight:</strong> ${data.ai_insight}`,
                        "bot"
                    );
                }
            } else {
                window.chat.addMessage(
                    "Could not process command. Try again.",
                    "bot",
                    "error"
                );
            }
        } catch (err) {
            console.error(err);
            window.chat.hideTyping();
            window.chat.addMessage(
                "Processing error. Please type instead.",
                "bot",
                "error"
            );
        }
    }

    // ----------------------------------------------------------
    // UI BUTTON
    // ----------------------------------------------------------
    updateButton(recording) {
        const btn = document.getElementById("voiceBtn");
        if (!btn) return;

        if (recording) {
            btn.classList.add("recording", "btn-danger");
            btn.innerHTML = `<i class="fas fa-stop"></i>`;
        } else {
            btn.classList.remove("recording", "btn-danger");
            btn.innerHTML = `<i class="fas fa-microphone"></i>`;
        }
    }

    showVoiceError(msg) {
        window.chat.addMessage(`🎤 ${msg}`, "bot", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.voiceRecorder = new VoiceRecorder();
});
