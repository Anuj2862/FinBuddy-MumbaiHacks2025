/**
 * Enhanced Voice Interaction
 * Handles microphone access, visual waveform, and speech recognition.
 */

class VoiceManager {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.canvas = document.getElementById('voiceWaveform');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.animationId = null;

        this.initRecognition();
    }

    initRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-IN'; // Default to Indian English

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("Voice Input:", transcript);
                this.handleVoiceCommand(transcript);
            };

            this.recognition.onstart = () => {
                this.isRecording = true;
                this.updateUI(true);
                this.startVisualizer();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateUI(false);
                this.stopVisualizer();
            };

            this.recognition.onerror = (event) => {
                console.error("Voice Error:", event.error);
                this.stopVisualizer();
                this.updateUI(false);
            };
        } else {
            console.warn("Speech Recognition API not supported.");
        }
    }

    async startVisualizer() {
        if (!this.canvas) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);

            this.analyser.fftSize = 256;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.drawWaveform();
        } catch (err) {
            console.error("Error accessing microphone for visualizer:", err);
        }
    }

    drawWaveform() {
        if (!this.isRecording) return;

        this.animationId = requestAnimationFrame(() => this.drawWaveform());
        this.analyser.getByteFrequencyData(this.dataArray);

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Clear with fade effect
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = this.dataArray[i] / 2;

            this.ctx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    stopVisualizer() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.source) {
            this.source.disconnect();
            this.source.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) this.audioContext.close();

        // Clear canvas
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    toggleRecording() {
        if (this.isRecording) {
            this.recognition.stop();
        } else {
            // Set language based on current preference
            const lang = localStorage.getItem('finbuddy_lang') || 'en';
            this.recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
            this.recognition.start();
        }
    }

    updateUI(isRecording) {
        const btn = document.getElementById('voiceFab');
        const status = document.getElementById('voiceStatus');

        if (isRecording) {
            btn.classList.add('pulse-animation', 'btn-danger');
            btn.classList.remove('btn-primary');
            if (status) status.innerText = translations[currentLang]?.voice_prompt || "Listening...";
            if (this.canvas) this.canvas.style.display = 'block';
        } else {
            btn.classList.remove('pulse-animation', 'btn-danger');
            btn.classList.add('btn-primary');
            if (status) status.innerText = "";
            if (this.canvas) this.canvas.style.display = 'none';
        }
    }

    handleVoiceCommand(text) {
        // Simple client-side shortcuts before sending to backend
        const lower = text.toLowerCase();

        if (lower.includes("balance")) {
            // Trigger balance check via chat
            this.sendToChat(text);
        } else if (lower.includes("add") || lower.includes("spent") || lower.includes("paid")) {
            // Transaction intent
            this.sendToChat(text);
        } else {
            // General chat
            this.sendToChat(text);
        }
    }

    sendToChat(text) {
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');

        if (chatInput && sendBtn) {
            chatInput.value = text;
            sendBtn.click();
        }
    }
}

// Initialize
const voiceManager = new VoiceManager();
document.addEventListener('DOMContentLoaded', () => {
    const fab = document.getElementById('voiceFab');
    if (fab) {
        fab.addEventListener('click', () => voiceManager.toggleRecording());
    }
});
