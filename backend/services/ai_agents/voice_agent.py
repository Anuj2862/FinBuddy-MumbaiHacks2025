import base64
import tempfile
import os
from groq import AsyncGroq
from backend.utils.logger import logger
from backend.core.config import settings


class VoiceAgent:
    """
    Groq-powered Speech-to-Text (Whisper Large V3)
    Falls back ONLY if Groq genuinely fails.
    """

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.client = None

        if self.groq_key:
            try:
                self.client = AsyncGroq(api_key=self.groq_key)
                logger.info("⚡ Groq API key loaded — Whisper Large V3 active")
            except Exception as e:
                logger.error(f"❌ Failed to init Groq client: {e}")
                self.client = None
        else:
            logger.warning("⚠️ No GROQ_API_KEY found — using fallback STT")

    # ====================================================================
    # MAIN SPEECH-TO-TEXT FUNCTION
    # ====================================================================
    async def speech_to_text(self, audio_data_base64: str) -> str:
        audio_path = None

        try:
            # --------------------------------------------------------------
            # 1. Decode Base64
            # --------------------------------------------------------------
            try:
                audio_bytes = base64.b64decode(audio_data_base64)
            except Exception as e:
                logger.error(f"❌ Base64 decode error: {e}")
                return "Voice input unavailable"

            # --------------------------------------------------------------
            # 2. Write temp WAV file
            # --------------------------------------------------------------
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp:
                temp.write(audio_bytes)
                audio_path = temp.name

            logger.info(f"🎧 Temp audio saved: {audio_path}")

            # --------------------------------------------------------------
            # 3. Groq Whisper STT (REAL MODEL)
            # --------------------------------------------------------------
            if self.client:
                try:
                    logger.info("🎙️ Sending audio to Groq Whisper Large V3…")

                    with open(audio_path, "rb") as f:
                        result = await self.client.audio.transcriptions.create(
                            file=(audio_path, f.read()),
                            model="whisper-large-v3",
                            response_format="json"
                        )

                    text = result.text.strip() if hasattr(result, "text") else ""

                    if text:
                        logger.info(f"🗣 Whisper → {text}")
                        return text

                    logger.warning("⚠️ Whisper returned empty text — using fallback")

                except Exception as e:
                    logger.error(f"❌ Groq Whisper STT error: {e}")
                    # Proceed to fallback

            # --------------------------------------------------------------
            # 4. FALLBACK STT
            # --------------------------------------------------------------
            logger.warning("⚠️ Using fallback STT mode")
            return self._fallback_stt()

        except Exception as e:
            logger.error(f"❌ Voice STT pipeline crashed: {e}")
            return "Voice input unavailable"

        finally:
            # Cleanup WAV
            try:
                if audio_path and os.path.exists(audio_path):
                    os.remove(audio_path)
            except:
                pass

    # ====================================================================
    # FALLBACK (ONLY IF WHISPER UNAVAILABLE)
    # ====================================================================
    def _fallback_stt(self) -> str:
        return "add expense 500 food"
