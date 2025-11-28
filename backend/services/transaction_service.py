# backend/services/transaction_service.py

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from backend.core.database import get_transactions_collection
from backend.models.transaction import Transaction, TransactionType
from backend.services.compliance_service import ComplianceService
from backend.utils.logger import logger

IST = timezone(timedelta(hours=5, minutes=30))

def mongo_to_transaction(doc) -> Transaction:
    return Transaction.from_mongo(doc)

class TransactionService:
    def __init__(self):
        self.collection = get_transactions_collection()
        self.compliance_service = ComplianceService()

    async def get_all_transactions(self) -> List[Transaction]:
        docs = await self.collection.find({}).sort("date", -1).to_list(None)
        return [mongo_to_transaction(doc) for doc in docs]

    async def create_transaction(self, txn_data: Dict[str, Any]) -> Transaction:
        # Compliance check
        ai_update = await self.compliance_service.analyze_transaction(txn_data)
        txn_data["ai_insight"] = ai_update.get("insight", "")
        txn_data["compliance_alert"] = ai_update.get("compliance_alert", "")
        
        # Insert
        result = await self.collection.insert_one(txn_data)
        
        # Return with ID
        new_doc = await self.collection.find_one({"_id": result.inserted_id})
        return mongo_to_transaction(new_doc)

    # ---------------------------------------------------------
    # GET BY ID
    # ---------------------------------------------------------
    async def get_transaction_by_id(self, tx_id: str) -> Optional[Transaction]:
        try:
            obj_id = ObjectId(tx_id)
        except:
            return None

        doc = await self.collection.find_one({"_id": obj_id})
        return mongo_to_transaction(doc) if doc else None

    # ---------------------------------------------------------
    # UPDATE TRANSACTION
    # ---------------------------------------------------------
    async def update_transaction(self, tx_id: str, update_data: Dict[str, Any]) -> Optional[Transaction]:
        try:
            obj_id = ObjectId(tx_id)
        except:
            return None

        old_doc = await self.collection.find_one({"_id": obj_id})
        if not old_doc:
            return None

        # Normalize txn_type
        if "txn_type" in update_data:
            try:
                update_data["txn_type"] = TransactionType(update_data["txn_type"]).value
            except:
                update_data["txn_type"] = TransactionType.UNKNOWN.value

        # Merge old + new before compliance check
        merged = old_doc | update_data
        ai_update = await self.compliance_service.analyze_transaction(merged)

        update_data["ai_insight"] = ai_update.get("insight", "")
        update_data["compliance_alert"] = ai_update.get("compliance_alert", "")

        await self.collection.update_one({"_id": obj_id}, {"$set": update_data})

        new_doc = await self.collection.find_one({"_id": obj_id})
        return mongo_to_transaction(new_doc) if new_doc else None

    # ---------------------------------------------------------
    # DELETE TRANSACTION
    # ---------------------------------------------------------
    async def delete_transaction(self, tx_id: str) -> bool:
        try:
            obj_id = ObjectId(tx_id)
        except:
            return False

        result = await self.collection.delete_one({"_id": obj_id})
        return result.deleted_count > 0

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------
    async def get_transactions_summary(self) -> Dict[str, Any]:
        txs = await self.get_all_transactions()

        total_credit = sum(t.amount for t in txs if t.txn_type == TransactionType.CREDITED.value)
        total_debit = sum(t.amount for t in txs if t.txn_type == TransactionType.DEBITED.value)
        net_balance = total_credit - total_debit

        year = datetime.now(IST).year
        ytd_credit = sum(
            t.amount for t in txs
            if t.txn_type == TransactionType.CREDITED.value and t.date.year == year
        )

        latest_alert = next((t.compliance_alert for t in txs if t.compliance_alert), None)

        return {
            "total_transactions": len(txs),
            "total_credit": total_credit,
            "total_debit": total_debit,
            "net_balance": net_balance,
            "ytd_credit": ytd_credit,
            "latest_alert": latest_alert
        }

    # ---------------------------------------------------------
    # FILTERS
    # --------------------------------------------------------------------------------------------------
    async def get_transactions_by_date_range(self, start: datetime, end: datetime) -> List[Transaction]:
        docs = await self.collection.find({
            "date": {"$gte": start, "$lte": end}
        }).to_list(None)

        return [mongo_to_transaction(doc) for doc in docs]

    async def get_transactions_by_category(self, category: str) -> List[Transaction]:
        docs = await self.collection.find({
            "category": {"$regex": f"^{category}$", "$options": "i"}
        }).to_list(None)

        return [mongo_to_transaction(doc) for doc in docs]

    async def search_transactions(self, query: str) -> List[Transaction]:
        docs = await self.collection.find({
            "$or": [
                {"counterparty": {"$regex": query, "$options": "i"}},
                {"message": {"$regex": query, "$options": "i"}},
                {"category": {"$regex": query, "$options": "i"}},
            ]
        }).to_list(None)

        return [mongo_to_transaction(doc) for doc in docs]

    async def get_categories(self) -> List[str]:
        categories = await self.collection.distinct("category")
        return sorted([c for c in categories if isinstance(c, str)])