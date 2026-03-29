# backend/routers/transactions.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from backend.services.transaction_service import TransactionService
from backend.services.ai_orchestrator import AIOrchestrator
from backend.parsers.sms_parser import parse_sms
from backend.parsers.voice_parser import parse_voice_command
from backend.parsers.receipt_parser import parse_receipt_text
from backend.parsers.bank_email_parser import parse_email_text
from backend.parsers.pdf_statement_parser import parse_pdf_statement

from backend.utils.logger import logger
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/transactions", 
    tags=["Transactions"],
    dependencies=[Depends(get_current_user)]
)


# ---------------------------------------------------------
# HELPERS TO AVOID GLOBAL INSTANCES
# ---------------------------------------------------------
def get_transaction_service():
    return TransactionService()

def get_orchestrator():
    return AIOrchestrator()


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------
class SMSText(BaseModel):
    text: str = Field(...)

class VoiceCommand(BaseModel):
    audio_base64: str = Field(...)

class EmailText(BaseModel):
    text: str = Field(...)

class PDFText(BaseModel):
    ocr_text: str = Field(...)

class ReceiptOCR(BaseModel):
    text: str = Field(...)


# =========================================================
# 🔄 0️⃣ PARSE SMS (no save)
# =========================================================
@router.post("/parse-sms")
async def parse_sms_endpoint(payload: SMSText):
    text = payload.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="SMS text is required")

    logger.info(f"📩 Parsing SMS (no save): {text}")

    ai_result = await get_orchestrator().process_sms(text)

    if not ai_result.get("success"):
        raise HTTPException(status_code=500, detail="SMS processing failed")

    parsed = ai_result.get("parsed_data")

    return {
        "success": True,
        "id": f"txn_preview_{uuid.uuid4().hex}",
        "txn_type": parsed.get("txn_type", "Unknown"),
        "amount": parsed.get("amount", 0),
        "counterparty": parsed.get("counterparty", "Unknown"),
        "category": ai_result.get("category", "Unknown"),
        "message": text,
        "ai_insight": ai_result.get("ai_insight"),
        "compliance_alert": None
    }


# =========================================================
# 1️⃣ CREATE TXN FROM SMS
# =========================================================
@router.post("/from-sms")
async def create_transaction_from_sms(payload: SMSText, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")
    lines = [line.strip() for line in payload.text.split('\n') if line.strip()]

    if not lines:
        raise HTTPException(status_code=400, detail="SMS text is empty")

    logger.info(f"📩 Creating transactions from {len(lines)} SMS lines...")

    saved_txns = []
    errors = []

    for text in lines:
        try:
            ai_result = await get_orchestrator().process_sms(text)
            
            if not ai_result.get("success"):
                errors.append({"text": text, "error": "AI pipeline failed"})
                continue

            parsed = ai_result.get("parsed_data")

            txn_dict = {
                "date": datetime.now(),
                "txn_type": parsed.get("txn_type", "Unknown"),
                "amount": parsed.get("amount", 0),
                "counterparty": parsed.get("counterparty", "Unknown"),
                "category": ai_result.get("category", "Unknown"),
                "message": text,
                "ai_insight": ai_result.get("ai_insight"),
                "compliance_alert": None
            }

            saved = await get_transaction_service().create_transaction(txn_dict, user_id=user_id)
            saved_txns.append(saved.dict())
        except Exception as e:
            logger.error(f"Error parsing line: {text} - {str(e)}")
            errors.append({"text": text, "error": str(e)})

    # If nothing succeeded but we tried, throw error
    if not saved_txns and errors:
        raise HTTPException(status_code=500, detail="Failed to parse any of the provided SMS lines.")

    return {
        "success": True, 
        "total_parsed": len(saved_txns),
        "total_failed": len(errors),
        "transactions": saved_txns,
        "errors": errors
    }


# =========================================================
# 2️⃣ FROM VOICE (STT → NLP → AI)
# =========================================================
@router.post("/from-voice")
async def create_transaction_from_voice(payload: VoiceCommand, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")

    logger.info("🎙 Processing voice transaction...")

    voice_result = await get_orchestrator().process_voice(payload.audio_base64)

    if not voice_result.get("success"):
        raise HTTPException(status_code=500, detail="Voice AI pipeline failed")

    parsed = voice_result.get("parsed_data")

    txn_dict = {
        "date": datetime.now(),
        "txn_type": parsed.get("txn_type", "Debited"),
        "amount": parsed.get("amount", 0),
        "counterparty": parsed.get("counterparty", "Voice Entry"),
        "category": voice_result.get("category", "Unknown"),
        "message": voice_result.get("text", ""),   # fixed!
        "ai_insight": voice_result.get("ai_insight"),
        "compliance_alert": None
    }

    saved = await get_transaction_service().create_transaction(txn_dict, user_id=user_id)
    return saved.dict()


# =========================================================
# 3️⃣ FROM RECEIPT OCR
# =========================================================
@router.post("/from-receipt")
async def create_transaction_from_receipt(payload: ReceiptOCR, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")

    text = payload.text.strip()
    logger.info("🧾 Processing receipt OCR...")

    receipt_data = parse_receipt_text(text)

    txn = {
        "date": datetime.now(),
        "txn_type": "Debited",
        "amount": receipt_data.get("amount", 0),
        "counterparty": receipt_data.get("merchant", "Receipt Merchant"),
        "category": receipt_data.get("category", "Expense"),
        "message": text,
        "ai_insight": None,
        "compliance_alert": None,
    }

    saved = await get_transaction_service().create_transaction(txn, user_id=user_id)
    return saved.dict()


# =========================================================
# 4️⃣ FROM EMAIL
# =========================================================
@router.post("/from-email")
async def create_transaction_from_email(payload: EmailText, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")

    parsed = parse_email_text(payload.text)

    txn = {
        "date": datetime.now(),
        "txn_type": parsed.get("txn_type", "Unknown"),
        "amount": parsed.get("amount", 0),
        "counterparty": parsed.get("counterparty", "Unknown"),
        "category": parsed.get("category", "Other"),
        "message": payload.text,
        "ai_insight": None,
        "compliance_alert": None
    }

    saved = await get_transaction_service().create_transaction(txn, user_id=user_id)
    return saved.dict()


# =========================================================
# 5️⃣ FROM PDF BANK STATEMENT
# =========================================================
@router.post("/from-pdf")
async def create_transactions_from_pdf(payload: PDFText, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")

    result = parse_pdf_statement(payload.ocr_text)
    txns = result.get("transactions", [])

    saved = []

    for t in txns:
        base = {
            "date": datetime.now(),
            "txn_type": t.get("txn_type", "Unknown"),
            "amount": t.get("amount"),
            "counterparty": t.get("counterparty"),
            "category": t.get("category", "Statement Entry"),
            "message": t.get("message"),
            "ai_insight": None,
            "compliance_alert": None
        }

        saved_txn = await get_transaction_service().create_transaction(base, user_id=user_id)
        saved.append(saved_txn.dict())

    return {"total": len(saved), "saved": saved}


# =========================================================
# 6️⃣ GET ALL TXNS
# =========================================================
@router.get("/")
async def get_transactions(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")
    txns = await get_transaction_service().get_all_transactions(user_id)
    return {"transactions": [t.dict() for t in txns]}


# =========================================================
# 7️⃣ SUMMARY
# =========================================================
@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")
    return await get_transaction_service().get_transactions_summary(user_id)


# =========================================================
# 8️⃣ DELETE TXN
# =========================================================
@router.delete("/{txn_id}")
async def delete_transaction(txn_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")
    ok = await get_transaction_service().delete_transaction(txn_id, user_id=user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True, "deleted_id": txn_id}


# =========================================================
# 9️⃣ UPDATE TXN
# =========================================================
@router.put("/{txn_id}")
async def update_transaction(txn_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("username") or current_user.get("email")
    updated = await get_transaction_service().update_transaction(txn_id, update_data, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return updated.dict()


# =========================================================
# 🔮 ML BUDGET PREDICTIONS
# =========================================================
from backend.services.prediction_service import PredictionService

def get_prediction_service():
    return PredictionService()


@router.get("/predictions")
async def get_budget_predictions(current_user: dict = Depends(get_current_user)):
    """
    Get AI-predicted expenses for next month by category.
    Uses Prophet time-series forecasting.
    """
    try:
        service = get_prediction_service()
        user_id = current_user.get("username") or current_user.get("email")
        predictions = await service.get_monthly_predictions(user_id)
        
        return {
            "success": True,
            "predictions": predictions,
            "message": "Budget predictions generated successfully"
        }
    except Exception as e:
        logger.error(f"Prediction endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/alerts")
async def get_overspend_alerts(current_user: dict = Depends(get_current_user)):
    """
    Get overspend alerts for categories predicted to exceed budget.
    """
    try:
        service = get_prediction_service()
        user_id = current_user.get("username") or current_user.get("email")
        alerts = await service.get_overspend_alerts(user_id)
        
        return {
            "success": True,
            "alerts": alerts,
            "count": len(alerts)
        }
    except Exception as e:
        logger.error(f"Alerts endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")


@router.get("/savings")
async def get_saving_opportunities(current_user: dict = Depends(get_current_user)):
    """
    Get AI-identified saving opportunities based on decreasing spending trends.
    """
    try:
        service = get_prediction_service()
        user_id = current_user.get("username") or current_user.get("email")
        opportunities = await service.get_saving_opportunities(user_id)
        
        return {
            "success": True,
            "opportunities": opportunities,
            "count": len(opportunities)
        }
    except Exception as e:
        logger.error(f"Savings endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get savings: {str(e)}")


@router.get("/insights/complete")
async def get_complete_insights(current_user: dict = Depends(get_current_user)):
    """
    Get all ML insights: predictions, alerts, and saving opportunities in one call.
    """
    try:
        service = get_prediction_service()
        user_id = current_user.get("username") or current_user.get("email")
        insights = await service.get_complete_insights(user_id)
        
        return {
            "success": True,
            **insights
        }
    except Exception as e:
        logger.error(f"Complete insights endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")

