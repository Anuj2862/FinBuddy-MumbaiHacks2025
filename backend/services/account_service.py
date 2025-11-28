from typing import List, Dict, Any, Optional
from backend.core.database import get_database
from datetime import datetime

class AccountService:
    def __init__(self):
        self.db = None

    async def _get_collection(self):
        if self.db is None:
            self.db = await get_database()
        return self.db.accounts

    async def initialize_defaults(self):
        """Initialize default accounts if none exist."""
        collection = await self._get_collection()
        count = await collection.count_documents({})
        
        if count == 0:
            defaults = [
                {
                    "name": "HDFC Bank",
                    "type": "bank",
                    "balance": 25000.0,
                    "icon": "fa-university",
                    "color": "primary"
                },
                {
                    "name": "Paytm Wallet",
                    "type": "wallet",
                    "balance": 1500.0,
                    "icon": "fa-wallet",
                    "color": "info"
                },
                {
                    "name": "Cash",
                    "type": "cash",
                    "balance": 5000.0,
                    "icon": "fa-money-bill-wave",
                    "color": "success"
                }
            ]
            await collection.insert_many(defaults)
            return True
        return False

    async def get_all_accounts(self) -> List[Dict[str, Any]]:
        collection = await self._get_collection()
        cursor = collection.find({})
        accounts = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            accounts.append(doc)
        return accounts

    async def update_balance(self, account_name: str, amount: float, is_credit: bool = False):
        """
        Update account balance.
        amount: Transaction amount (always positive)
        is_credit: True if money coming IN, False if money going OUT
        """
        collection = await self._get_collection()
        
        # Find account (case-insensitive)
        account = await collection.find_one({"name": {"$regex": f"^{account_name}$", "$options": "i"}})
        
        if not account:
            # If account doesn't exist, maybe create it or default to Cash?
            # For now, let's default to 'Cash' if not found, or just return False
            if account_name.lower() == "cash":
                # Should exist from defaults, but just in case
                return False
            
            # Try falling back to Cash
            account = await collection.find_one({"name": "Cash"})
            if not account:
                return False

        change = amount if is_credit else -amount
        new_balance = account["balance"] + change
        
        await collection.update_one(
            {"_id": account["_id"]},
            {"$set": {"balance": new_balance}}
        )
        return True
