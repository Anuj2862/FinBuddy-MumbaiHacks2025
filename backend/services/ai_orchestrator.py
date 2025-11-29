# backend/services/ai_orchestrator.py

import json
import traceback

from backend.services.ai_agents.sms_agent import SMSAgent
from backend.services.ai_agents.voice_agent import VoiceAgent
from backend.services.ai_agents.categorization_agent import CategorizationAgent
from backend.services.ai_agents.insights_agent import InsightsAgent
from backend.services.ai_agents.gst_agent import GSTAgent
from backend.services.ai_agents.ocr_agent import OCRAgent
from backend.services.ai_agents.ocr_agent import OCRAgent
from backend.services.nlp_engine import NLPEngine
from backend.ml.reasoning_engine import MultimodalReasoningEngine
from backend.ml.voice_semantics import VoiceSemanticsModel

from backend.parsers.sms_parser import parse_sms
from backend.parsers.receipt_parser import parse_receipt_text
from backend.utils.logger import logger


class AIOrchestrator:
    """
    Central AI Orchestrator:
    - SMS → NLP + Categorization + Insights
    - Voice → STT → NLP → Categorization + Insights
    - Receipt OCR
    """

    def __init__(self):
        self.sms_agent = SMSAgent()
        self.voice_agent = VoiceAgent()
        self.categorization_agent = CategorizationAgent()
        self.insights_agent = InsightsAgent()
        self.gst_agent = GSTAgent()
        self.ocr_agent = OCRAgent()
        self.ocr_agent = OCRAgent()
        self.nlp = NLPEngine()
        self.reasoning_engine = MultimodalReasoningEngine()
        self.voice_semantics = VoiceSemanticsModel()

    # =====================================================================================
    # 📩 1. PROCESS SMS
    # =====================================================================================
    async def process_sms(self, sms_text: str):
        try:
            logger.info("🚀 Starting SMS processing pipeline...")

            # ----------------------------------------
            # 1) AI attempt
            # ----------------------------------------
            sms_ai = await self.sms_agent.analyze_sms(sms_text)

            parsed = None

            if sms_ai.success and sms_ai.text:
                try:
                    # AI returns a JSON string — parse safely
                    parsed = json.loads(sms_ai.text)
                except Exception:
                    parsed = parse_sms(sms_text)
            else:
                parsed = parse_sms(sms_text)

            # ----------------------------------------
            # 2) Normalization
            # ----------------------------------------
            parsed.setdefault("txn_type", "Unknown")
            parsed.setdefault("amount", 0)
            parsed.setdefault("counterparty", "Unknown")
            parsed.setdefault("category", "Miscellaneous")

            # ----------------------------------------
            # 3) Category refinement
            # ----------------------------------------
            category = await self.categorization_agent.categorize_transaction(
                sms_text,
                parsed.get("amount", 0)
            )
            parsed["category"] = category

            # ----------------------------------------
            # 4) AI insights
            # ----------------------------------------
            insight = await self.insights_agent.generate_insight(parsed)

            # ----------------------------------------
            # 5) Multimodal Reasoning
            # ----------------------------------------
            reasoning = self.reasoning_engine.analyze_context(parsed, source="sms")

            return {
                "success": True,
                "type": "sms",
                "provider_used": sms_ai.provider,
                "parsed_data": parsed,
                "category": category,
                "ai_insight": insight,
                "reasoning": reasoning
            }

        except Exception as e:
            logger.error(f"❌ SMS processing failed: {e}")
            return {"success": False, "error": str(e)}

    # =====================================================================================
    # 🎤 2. PROCESS VOICE (STT → NLP → Categorization)
    # =====================================================================================
    async def process_voice(self, audio_base64: str, mime_type: str = "audio/webm"):
        try:
            logger.info("🎤 Starting voice processing pipeline...")

            # ------------------------------------
            # 1) Speech to Text
            # ------------------------------------
            text = await self.voice_agent.speech_to_text(audio_base64, mime_type)
            text = text.strip()

            if not text or "unavailable" in text.lower():
                return {"success": False, "error": "Speech could not be transcribed"}

            logger.info(f"🗣️ STT → {text}")

            # ------------------------------------
            # 2) NLP Intent
            # ------------------------------------
            intent, confidence, entities = self.nlp.detect_intent(text)
            logger.info(f"🧠 Intent={intent}, conf={confidence}, entities={entities}")

            # ------------------------------------
            # 2A) LOW CONFIDENCE
            # ------------------------------------
            if confidence < 0.4:
                return {
                    "success": True,
                    "text": text,
                    "intent": "clarification_needed",
                    "reply": "I'm not sure… did you want to check balance or record a transaction?"
                }

            # ------------------------------------
            # 2B) MEDIUM CONFIDENCE
            # ------------------------------------
            if 0.4 <= confidence < 0.6:
                fallback = self.nlp.generate_fallback_response(text)
                return {
                    "success": True,
                    "text": text,
                    "intent": intent,
                    "entities": entities,
                    "reply": fallback
                }

            # ------------------------------------
            # 3) HIGH CONFIDENCE → Treat as SMS-like
            # ------------------------------------
            sms_result = await self.process_sms(text)

            sms_result["text"] = text
            sms_result["intent"] = intent
            sms_result["entities"] = entities
            sms_result["confidence"] = confidence

            # ------------------------------------
            # 4) Voice Semantics & Reasoning
            # ------------------------------------
            semantics = self.voice_semantics.analyze_semantics(text)
            reasoning = self.reasoning_engine.analyze_context(sms_result.get("parsed_data", {}), source="voice")

            sms_result["voice_semantics"] = semantics
            sms_result["reasoning"] = reasoning

            return sms_result

        except Exception as e:
            logger.error(f"❌ Voice pipeline failed: {e}")
            traceback.print_exc()
            return {"success": False, "error": "Voice processing failed"}

    # =====================================================================================
    # 🧾 3. PROCESS RECEIPT (OCR → PARSER → INSIGHTS)
    # =====================================================================================
    async def process_receipt(self, image_path: str):
        try:
            logger.info("📷 Starting receipt OCR pipeline...")

            # 1) OCR extraction
            extracted_text = await self.ocr_agent.extract_text_from_image(image_path)

            # 2) Run our real parser (we already fixed this file)
            receipt_data = parse_receipt_text(extracted_text)

            # 3) AI insights
            insight = await self.insights_agent.generate_insight(receipt_data)

            # 4) Multimodal Reasoning
            reasoning = self.reasoning_engine.analyze_context(receipt_data, source="ocr")

            return {
                "success": True,
                "type": "receipt",
                "receipt_data": receipt_data,
                "ai_insight": insight,
                "extracted_text": extracted_text,
                "reasoning": reasoning
            }

        except Exception as e:
            logger.error(f"❌ Receipt pipeline failed: {e}")
            traceback.print_exc()
            return {"success": False, "error": "Receipt processing failed"}
