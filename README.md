# FinBuddy AI - India's Voice-First Financial Assistant

![FinBuddy AI](https://img.shields.io/badge/FinBuddy-AI--Powered-brightgreen)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Async-blue)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-orange)

A revolutionary financial assistant designed for India's informal economy, featuring multi-modal AI, voice commands, and real-time compliance tracking.

## 🚀 Features & Traces

### 1. Multi-Modal Input Processing
- **SMS Parsing**: Extracts transaction data seamlessly from raw bank SMS using robust RegEx and AI fallback.
- **Voice Commands**: Hindi & English voice recognition (STT) integrated with NLP to understand user intent.
- **Image Receipts (OCR)**: Extracts structured data from uploaded bills and invoices.

### 2. Multi-Agent AI System 🧠
FinBuddy is powered by a **Central AI Orchestrator** managing 6 specific agents working in unison:
1. **SMS Agent**: Leverages a **Provider Fallback Chain (Groq → OpenAI → Gemini → Cohere → Rules)** for foolproof extraction.
2. **Voice Agent**: Converts speech to text and pipes it to the semantic NLP engine.
3. **Categorization Agent**: Automatically tags expenses (e.g., Food, Transport, Utilities, Business).
4. **Insights Agent**: Generates actionable financial advice and tracks budget anomalies.
5. **GST / Compliance Agent**: Monitors GST thresholds in real-time for Indian merchants.
6. **OCR Agent**: Processes receipt images and extracts structured transaction records.

Additionally, our **Multimodal Reasoning Engine** and **Voice Semantics Model** map complex intents (e.g., ambiguous or low-confidence voice queries) into structured pipeline actions and generate intelligent conversational fallbacks.

### 3. Full Stack Architecture 🏗️

#### Frontend (Vanilla JS & PWA)
- **WhatsApp-style Chat UI**: Natural conversation interface for recording expenses.
- **Real-Time Dashboard**: Interactive charts and analytics to visualize spending heatmaps, budgets, and cash flow.
- **Progressive Web App (PWA)**: Includes `manifest.json` and a Service Worker (`sw.js`) for mobile-app-like installation and offline resilience.
- **Voice UI**: Interactive audio recording controls built natively via the Web Audio API.

#### Backend (FastAPI & MongoDB)
- **FastAPI Core**: Highly performant asynchronous API endpoints orchestrating the AI models and database operations.
- **Async MongoDB**: Non-blocking database drivers (`motor`) for high-concurrency storage of Users, Transactions, and Settings.
- **Dynamic Providers**: Environment-based dynamic loading of LLM configurations to ensure zero downtime.
- **Integrated Serving**: The backend simultaneously mounts the frontend directory, offering a clean, unified deployment architecture.

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Anuj2862/FinBuddy-MumbaiHacks2025.git
   cd FinBuddy-MumbaiHacks2025
   ```
2. **Setup your environment variables**
   Create a `.env` file based on the `.env.example` templates (Groq, OpenAI, Cohere, Gemini, and MongoDB URI).
3. **Install Dependencies**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
4. **Run the Project**
   ```bash
   python run.py
   ```
   *The application will actively run on `http://localhost:8000`, serving both the API and static frontend routes.*
