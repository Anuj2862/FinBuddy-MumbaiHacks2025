from fastapi import APIRouter, HTTPException
from backend.services.account_service import AccountService

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

@router.get("/")
async def get_accounts():
    """
    Get all user accounts with current balances.
    Initializes defaults if no accounts exist.
    """
    try:
        service = AccountService()
        await service.initialize_defaults()
        accounts = await service.get_all_accounts()
        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")
