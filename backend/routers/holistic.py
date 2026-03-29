from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.services.business_finance import BusinessFinanceService
from backend.services.wealth_manager import WealthManagerService
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/holistic", 
    tags=["Holistic Finance"],
    dependencies=[Depends(get_current_user)]
)

business_service = BusinessFinanceService()
wealth_service = WealthManagerService()

# --- Models ---
class InvoiceItem(BaseModel):
    description: str
    quantity: float
    unit_price: float

class InvoiceRequest(BaseModel):
    client_name: str
    items: List[InvoiceItem]
    gst_rate: float = 18.0

class SIPRequest(BaseModel):
    monthly_investment: float
    years: int
    rate: float = 12.0

class DebtRequest(BaseModel):
    principal: float
    interest_rate: float
    tenure_months: int

# --- Endpoints ---

@router.post("/invoice/generate")
async def generate_invoice(request: InvoiceRequest, current_user: dict = Depends(get_current_user)):
    try:
        # User ID can be used for logging or future expansion
        user_id = current_user.get("username") or current_user.get("email")
        items_dict = [item.dict() for item in request.items]
        result = business_service.generate_invoice(request.client_name, items_dict, request.gst_rate)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/gst/estimate")
async def estimate_gst(income: float, rate: float = 18.0, current_user: dict = Depends(get_current_user)):
    return business_service.estimate_gst_liability(income, rate)

@router.post("/wealth/sip")
async def calculate_sip(request: SIPRequest, current_user: dict = Depends(get_current_user)):
    return wealth_service.calculate_sip_returns(request.monthly_investment, request.years, request.rate)

@router.post("/wealth/debt")
async def analyze_debt(request: DebtRequest, current_user: dict = Depends(get_current_user)):
    return wealth_service.analyze_debt_impact(request.principal, request.interest_rate, request.tenure_months)
