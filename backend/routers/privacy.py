from fastapi import APIRouter, HTTPException, Response
from backend.services.transaction_service import TransactionService
from backend.core.database import get_database
import json
from datetime import datetime

router = APIRouter(prefix="/api/privacy", tags=["Privacy"])

@router.get("/export")
async def export_data():
    """
    Export all user data as a JSON file.
    """
    try:
        service = TransactionService()
        transactions = await service.get_all_transactions()
        
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
async def delete_account():
    """
    Delete all user data (Right to be Forgotten).
    """
    try:
        db = await get_database()
        # Delete transactions
        await db.transactions.delete_many({})
        # Delete any other user-specific collections if they existed
        # await db.users.delete_many({}) 
        
        return {"success": True, "message": "All account data has been permanently deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")
