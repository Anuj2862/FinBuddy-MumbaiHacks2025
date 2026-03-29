from fastapi import APIRouter, HTTPException, Depends
from backend.services.account_service import AccountService
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/api/accounts", 
    tags=["Accounts"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    """
    Get all user accounts with current balances.
    Initializes defaults if no accounts exist for this user.
    """
    try:
        user_id = current_user.get("username") or current_user.get("email")
        service = AccountService()
        await service.initialize_defaults(user_id)
        accounts = await service.get_all_accounts(user_id)
        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")
