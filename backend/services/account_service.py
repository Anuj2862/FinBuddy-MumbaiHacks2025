from typing import List, Dict, Any, Optional
from backend.core.database import mongo
from datetime import datetime

class AccountService:
    def __init__(self):
        self.db = None

    async def _get_collection(self):
        if self.db is None:
            self.db = mongo.get_db()
        return self.db.accounts

    async def initialize_defaults(self, user_id: str):
        """Initialize default accounts for a specific user if they have none."""
        collection = await self._get_collection()
        count = await collection.count_documents({"user_id": user_id})
        
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
            # Add user_id to each default
            for d in defaults:
                d["user_id"] = user_id
                
            await collection.insert_many(defaults)
            return True
        return False

    async def get_all_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        collection = await self._get_collection()
        
        # Ensure defaults are initialized for this user
        await self.initialize_defaults(user_id)
        
        cursor = collection.find({"user_id": user_id})
        accounts = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            accounts.append(doc)
        return accounts

    async def update_balance(self, account_name: str, amount: float, user_id: str, is_credit: bool = False):
        """
        Update account balance.
        amount: Transaction amount (always positive)
        is_credit: True if money coming IN, False if money going OUT
        """
        collection = await self._get_collection()
        
        # Find user's account (case-insensitive)
        account = await collection.find_one({
            "user_id": user_id,
            "name": {"$regex": f"^{account_name}$", "$options": "i"}
        })
        
        if not account:
            # If account doesn't exist, maybe create it or default to Cash?
            # For now, let's default to 'Cash' if not found, or just return False
            if account_name.lower() == "cash":
                # Should exist from defaults, but just in case
                return False
            
            # Try falling back to Cash for this user
            account = await collection.find_one({"user_id": user_id, "name": "Cash"})
            if not account:
                return False

        change = amount if is_credit else -amount
        new_balance = account["balance"] + change
        
        await collection.update_one(
            {"_id": account["_id"]},
            {"$set": {"balance": new_balance}}
        )
        return True
