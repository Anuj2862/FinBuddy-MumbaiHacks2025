// frontend/assets/js/chat.js — HYBRID MODE H2 (FINAL)

class FinBuddyChat {
    constructor() {
        this.chatMessages = document.getElementById("chatMessages");
        this.messageInput = document.getElementById("messageInput");
        this.voiceBtn = document.getElementById("voiceBtn");
        this.suggestions = document.getElementById("suggestions");
        this.sendBtn = document.getElementById("sendBtn");

        this.userId = "user_" + Math.random().toString(36).slice(2);
        this.isProcessing = false;

        this.sendBtn.onclick = () => this.sendMessage();
        this.messageInput.addEventListener("keypress", e => {
            if (e.key === "Enter") this.sendMessage();
        });

        this.voiceBtn.onclick = () => {
            if (window.voiceRecorder) window.voiceRecorder.toggleRecording();
        };
    }

    // ----------------------------------------------------------
    // SEND TEXT MESSAGE TO BACKEND CHAT INTENT ENGINE
    // ----------------------------------------------------------
    async sendMessage(isVoice = false, parsedData = null) {
        const msg = this.messageInput.value.trim();
        if (!msg || this.isProcessing) return;

        this.addMessage(msg, "user");
        this.messageInput.value = "";
        this.hideSuggestions();

        this.showTyping();
        this.isProcessing = true;

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: msg,
                    user_id: this.userId,
                    is_voice: isVoice,
                    parsed_data: parsedData
                })
            });

            const data = await res.json();

            if (data.success && data.data) {
                const r = data.data;
                this.addMessage(r.text, "bot", r.type);
                this.showSuggestions(r.suggestions);
            } else {
                this.addMessage("Error: Something went wrong.", "bot", "error");
            }
        } catch (error) {
            this.addMessage("Network error. Try again.", "bot", "error");
        }

        this.hideTyping();
        this.isProcessing = false;
    }

    // ----------------------------------------------------------
    // ADD MESSAGE TO UI
    // ----------------------------------------------------------
    addMessage(text, sender, type = "general") {
        const div = document.createElement("div");
        div.className = `message ${sender}-message message-${type} animate-fade-in`;
        div.innerHTML =
            sender === "bot"
                ? `<strong>FinBuddy 🤖</strong><br>${text}`
                : `<strong>You 👤</strong><br>${text}`;

        this.chatMessages.appendChild(div);
        this.scrollBottom();
    }

    // ----------------------------------------------------------
    // SUGGESTIONS
    // ----------------------------------------------------------
    showSuggestions(list) {
        if (!list || list.length === 0) return;
        this.suggestions.innerHTML = "";
        this.suggestions.classList.remove("d-none");
        this.suggestions.classList.add("animate-fade-in");

        list.forEach(s => {
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-primary btn-sm suggestion-btn";
            btn.textContent = s;
            btn.onclick = () => {
                this.messageInput.value = s;
                this.sendMessage();
            };
            this.suggestions.appendChild(btn);
        });
    }

    hideSuggestions() {
        this.suggestions.classList.add("d-none");
    }

    // ----------------------------------------------------------
    // TYPING INDICATOR
    // ----------------------------------------------------------
    showTyping() {
        const div = document.createElement("div");
        div.id = "typing";
        div.className = "message bot-message";
        div.innerHTML = `
            <strong>FinBuddy</strong>
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>`;
        this.chatMessages.appendChild(div);
        this.scrollBottom();
    }

    hideTyping() {
        const t = document.getElementById("typing");
        if (t) t.remove();
    }

    scrollBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // ----------------------------------------------------------
    // VOICE → CHAT BRIDGE (HYBRID MODE H2)
    // ----------------------------------------------------------
    async processVoiceText(text, parsedData = null) {
        this.messageInput.value = text;
        await this.sendMessage(true, parsedData);
    }
}

window.chat = new FinBuddyChat();
