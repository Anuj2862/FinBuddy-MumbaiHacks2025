# backend/routers/ai_insights.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.ai_orchestrator import AIOrchestrator
from backend.parsers.pdf_statement_parser import parse_pdf_statement
from backend.parsers.bank_email_parser import parse_email_text
from backend.parsers.bank_email_parser import parse_email_text
from backend.utils.logger import logger
from backend.ml.chart_explainer import ChartExplainer

router = APIRouter(prefix="/api/ai", tags=["AI Processing"])

router = APIRouter(prefix="/api/ai", tags=["AI Processing"])

orchestrator = AIOrchestrator()
chart_explainer = ChartExplainer()


# ---------------------------------------------------------
# REQUEST MODELS (Pydantic v2 clean style)
# ---------------------------------------------------------
class VoiceRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio input.")
    model_config = {"from_attributes": True}


class ReceiptRequest(BaseModel):
    image_path: str = Field(..., description="Path to receipt image.")
    model_config = {"from_attributes": True}


class PDFRequest(BaseModel):
    ocr_text: str = Field(..., description="OCR-extracted text from PDF.")
    model_config = {"from_attributes": True}


class EmailRequest(BaseModel):
    text: str = Field(..., description="Email body text for parsing.")
    model_config = {"from_attributes": True}


class ChartRequest(BaseModel):
    data_points: list[float]
    labels: list[str]
    category_data: Optional[dict[str, float]] = None


# ---------------------------------------------------------
# 1️⃣ PROCESS VOICE INPUT
# ---------------------------------------------------------
@router.post("/voice")
async def process_voice(req: VoiceRequest):
    try:
        logger.info("🎤 Voice processing request received")

        result = await orchestrator.process_voice(req.audio_base64)

        return {
            "success": result.get("success", False),
            "text": result.get("text"),  # unified key
            "category": result.get("category"),
            "ai_insight": result.get("ai_insight"),
            "parsed_data": result.get("parsed_data", {}),
            "provider": result.get("provider_used", "unknown")
        }

    except Exception as e:
        logger.error(f"Voice processing error: {e}")
        raise HTTPException(status_code=500, detail="Voice processing failed.")


# ---------------------------------------------------------
# 2️⃣ RECEIPT OCR PIPELINE
# ---------------------------------------------------------
@router.post("/receipt")
async def process_receipt(req: ReceiptRequest):
    try:
        logger.info(f"📷 Receipt OCR request: {req.image_path}")

        result = await orchestrator.process_receipt(req.image_path)

        return {
            "success": result.get("success", False),
            "data": result.get("receipt_data"),
            "ai_insight": result.get("ai_insight"),
            "extracted_text": result.get("extracted_text")
        }

    except Exception as e:
        logger.error(f"Receipt processing error: {e}")
        raise HTTPException(status_code=500, detail="Receipt processing failed.")


# ---------------------------------------------------------
# 3️⃣ PDF BANK STATEMENT PARSER
# ---------------------------------------------------------
@router.post("/pdf")
async def process_pdf(req: PDFRequest):
    try:
        logger.info("📄 Processing bank statement OCR")

        parsed = parse_pdf_statement(req.ocr_text)

        return {
            "success": True,
            "total_extracted": parsed.get("total_extracted", 0),
            "transactions": parsed.get("transactions", [])
        }

    except Exception as e:
        logger.error(f"PDF processing error: {e}")
        raise HTTPException(status_code=500, detail="PDF processing failed.")


# ---------------------------------------------------------
# 4️⃣ EMAIL TRANSACTION PARSER
# ---------------------------------------------------------
@router.post("/email")
async def process_email(req: EmailRequest):
    try:
        logger.info("📧 Processing email transaction")

        parsed = parse_email_text(req.text)

        return {
            "success": True,
            "data": parsed
        }

    except Exception as e:
        logger.error(f"Email processing error: {e}")
        raise HTTPException(status_code=500, detail="Email parsing failed.")


# ---------------------------------------------------------
# 5️⃣ CHART INSIGHTS
# ---------------------------------------------------------
@router.post("/chart-insights")
async def get_chart_insights(req: ChartRequest):
    try:
        trend_insight = chart_explainer.explain_spending_trend(req.data_points, req.labels)
        category_insights = chart_explainer.explain_category_pie(req.category_data) if req.category_data else []
        
        return {
            "success": True,
            "trend_insight": trend_insight,
            "category_insights": category_insights
        }
    except Exception as e:
        logger.error(f"Chart insight error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate chart insights")


# ---------------------------------------------------------
# 🏥 FINANCIAL HEALTH SCORE
# ---------------------------------------------------------
from backend.services.health_score_service import HealthScoreService

# health_service = HealthScoreService()  <-- Removed to avoid DB init on import


@router.get("/health-score")
async def get_financial_health_score():
    """
    Calculate comprehensive 0-100 Financial Wellness Index.
    
    Returns:
        - overall_score: 0-100 score
        - grade: Letter grade (A+, A, B, C, D, F)
        - trend: Improving/Stable/Declining
        - breakdown: Scores for each of 6 metrics
        - recommendations: Top 3 personalized improvement suggestions
        - assessment: Text description
    """
    try:
        logger.info("💚 Calculating financial health score...")
        
        # Instantiate here to ensure DB is connected
        health_service = HealthScoreService()
        result = await health_service.get_financial_health_score(days=60)
        
        return {
            "success": True,
            **result
        }
    
    except Exception as e:
        logger.error(f"Health score endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health score calculation failed: {str(e)}")

