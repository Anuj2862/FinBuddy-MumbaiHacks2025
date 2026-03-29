# backend/routers/invoices.py

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pathlib import Path
import uuid

from backend.services.invoice_service import InvoiceService
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/invoices", 
    tags=["Invoices"],
    dependencies=[Depends(get_current_user)]
)

INVOICE_DIR = Path("invoices")
# No global mkdir here, we'll do it per user


# ---------------------------------------------------------
# Helper: avoid global shared service
# ---------------------------------------------------------
def get_invoice_service():
    return InvoiceService()


# ---------------------------------------------------------
# Request Model
# ---------------------------------------------------------
class InvoiceData(BaseModel):
    txn_type: str = Field(..., description="Credited / Debited")
    amount: float = Field(..., description="Transaction amount")
    counterparty: str = Field(..., description="Merchant or source")
    date: str = Field(..., description="ISO date string")
    message: str = Field(..., description="Description or narration")
    category: str = Field(..., description="Expense category")


# ---------------------------------------------------------
# 1️⃣ Generate Invoice PDF
# ---------------------------------------------------------
@router.post("/generate")
async def generate_invoice_endpoint(data: InvoiceData, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user.get("username") or current_user.get("email")
        user_dir = INVOICE_DIR / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"invoice_{uuid.uuid4().hex[:10]}.pdf"
        filepath = user_dir / filename

        invoice_service = get_invoice_service()
        # Generate the PDF from the provided transaction data dict
        invoice_service.generate_invoice_pdf(data.model_dump(), str(filepath))

        return {
            "success": True,
            "filename": filename,
            "download_url": f"/api/invoices/download/{user_id}/{filename}",
            "message": "Invoice generated successfully."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice generation failed: {str(e)}")


# ---------------------------------------------------------
# 2️⃣ Download Invoice
# ---------------------------------------------------------
@router.get("/download/{user_id}/{filename}")
async def download_invoice(user_id: str, filename: str, current_user: dict = Depends(get_current_user)):
    # Security check: only allow user to download their own invoices
    current_user_id = current_user.get("username") or current_user.get("email")
    if current_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    filepath = INVOICE_DIR / user_id / filename

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Invoice not found")

    return FileResponse(
        path=str(filepath),
        media_type="application/pdf",
        filename=filename
    )
