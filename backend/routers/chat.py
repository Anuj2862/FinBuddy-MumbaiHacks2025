# backend/routers/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.chat_manager import ChatManager
from backend.utils.logger import logger

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])

# Lazy initialization - create ChatManager only when needed
_chat_manager_instance = None

def get_chat_manager():
    global _chat_manager_instance
    if _chat_manager_instance is None:
        _chat_manager_instance = ChatManager()
    return _chat_manager_instance


# ---------------------------------------------------------
# Request Model (Pydantic v2 clean)
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str = Field(..., description="User message text")
    user_id: str = Field(..., description="Unique user identifier")
    is_voice: bool = Field(False, description="Whether the message originated from STT")
    parsed_data: Optional[dict] = Field(None, description="Pre-parsed data from Voice Agent")

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# Chat Endpoint
# ---------------------------------------------------------
@router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        logger.info(f"💬 Chat request from {request.user_id} | Voice: {request.is_voice}")
        logger.info(f"Message: {request.message}")

        chat_manager = get_chat_manager()
        response = await chat_manager.process_message(
            user_id=request.user_id,
            message=request.message,
            is_voice=request.is_voice,
            parsed_data=request.parsed_data
        )

        return {
            "success": True,
            "data": response
        }

    except Exception as e:
        logger.error(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Chat processing failed")
