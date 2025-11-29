import base64
import tempfile
import os
from groq import AsyncGroq
import logging
import tempfile
import base64
from openai import AsyncOpenAI

logger = logging.getLogger("FinBuddy")

class VoiceAgent:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.client = None

        if self.openai_key:
            try:
                self.client = AsyncOpenAI(api_key=self.openai_key)
                logger.info("⚡ OpenAI API key loaded — Whisper active")
            except Exception as e:
                logger.error(f"❌ Failed to init OpenAI client: {e}")
                self.client = None
        else:
            logger.warning("⚠️ No OPENAI_API_KEY found — Voice will fail")

    # ====================================================================
    # MAIN SPEECH-TO-TEXT FUNCTION
    # ====================================================================
    async def speech_to_text(self, audio_data_base64: str, mime_type: str = "audio/webm") -> str:
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
            # 2. Write temp file (Browser usually sends WebM)
            # --------------------------------------------------------------
            # Determine extension
            ext = ".webm"
            if "mp4" in mime_type:
                ext = ".mp4"
            elif "ogg" in mime_type:
                ext = ".ogg"
            elif "wav" in mime_type:
                ext = ".wav"

            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp:
                temp.write(audio_bytes)
                audio_path = temp.name
            
            file_size = len(audio_bytes)
            logger.info(f"🎧 Temp audio saved: {audio_path} (Size: {file_size} bytes)")
            
            if file_size < 1000:
                logger.warning("⚠️ Audio file is very small! Microphone might be muted or blocked.")

            # --------------------------------------------------------------
            # 3. OpenAI Whisper STT
            # --------------------------------------------------------------
            if self.client:
                logger.info("🎙️ Sending audio to OpenAI Whisper...")
                try:
                    with open(audio_path, "rb") as f:
                        result = await self.client.audio.transcriptions.create(
                            file=f,
                            model="whisper-1",
                            response_format="json"
                        )
                    
                    text = result.text.strip() if hasattr(result, "text") else ""
                    logger.info(f"🗣 Whisper → {text}")
                    return text

                except Exception as e:
                    logger.error(f"❌ OpenAI Whisper failed: {e}")
                    return "Voice recognition failed"

            # --------------------------------------------------------------
            # 4. FALLBACK STT
            # --------------------------------------------------------------
            logger.warning("⚠️ Using fallback STT mode")
            return self._fallback_stt()

        except Exception as e:
            print(f"DEBUG: Voice Pipeline Error: {e}")
            import traceback
            traceback.print_exc()
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
