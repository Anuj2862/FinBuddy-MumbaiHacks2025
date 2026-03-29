from fastapi import APIRouter, HTTPException, Response, Depends
from backend.services.transaction_service import TransactionService
from backend.core.database import mongo
import json
from datetime import datetime
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/privacy", 
    tags=["Privacy"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/export")
async def export_data(current_user: dict = Depends(get_current_user)):
    """
    Export all user data as a JSON file for the current user.
    """
    try:
        service = TransactionService()
        user_id = current_user.get("username") or current_user.get("email")
        transactions = await service.get_all_transactions(user_id)
        
        # Convert transactions to list of dicts
        data = [tx.dict() for tx in transactions]
        
        # Create a JSON string
        json_data = json.dumps({
            "export_date": datetime.now().isoformat(),
            "record_count": len(data),
            "transactions": data
        }, default=str, indent=4)
        
        # Return as a downloadable file
        return Response(
            content=json_data,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=finbuddy_data_export.json"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """
    Delete all user data (Right to be Forgotten).
    """
    try:
        db = mongo.get_db()
        user_id = current_user.get("username") or current_user.get("email")
        
        # Delete user's transactions
        await db.transactions.delete_many({"user_id": user_id})
        
        # Delete user's accounts
        await db.accounts.delete_many({"user_id": user_id})
        
        return {"success": True, "message": "All account data has been permanently deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
