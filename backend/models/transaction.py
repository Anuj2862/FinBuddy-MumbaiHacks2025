# backend/models/transaction.py

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union, Any
from datetime import datetime
from enum import Enum
from bson import ObjectId


# ----------------------------------------------------------
# ENUM: Transaction Type
# ----------------------------------------------------------
class TransactionType(str, Enum):
    CREDITED = "Credited"
    DEBITED = "Debited"
    UNKNOWN = "Unknown"


# ----------------------------------------------------------
# BASE MODEL
# ----------------------------------------------------------
class TransactionBase(BaseModel):
    user_id: str = Field(..., description="Owner's unique identifier (username or email)")
    txn_type: TransactionType = Field(..., description="Credited / Debited")
    amount: float = Field(..., gt=0, description="Transaction amount (> 0)")

    counterparty: str = Field(..., description="Bank/UPI entity involved")
    message: str = Field(..., description="Narration / UPI message")
    category: str = Field(..., description="AI-assigned category")

    ai_insight: Optional[str] = None
    compliance_alert: Optional[str] = None

    # Normalization Validators
    @field_validator("counterparty", "message", "category")
    def strip_text(cls, v):
        return v.strip()

    @field_validator("category")
    def normalize_category(cls, v):
        return v.lower()


# ----------------------------------------------------------
# MODEL FOR CREATION
# ----------------------------------------------------------
class TransactionCreate(TransactionBase):
    """Input model when creating a new transaction."""
    pass


# ----------------------------------------------------------
# FULL TRANSACTION MODEL (DB → Frontend)
# ----------------------------------------------------------
class Transaction(TransactionBase):
    id: str = Field(..., description="MongoDB Document ID as string")
    date: datetime = Field(default_factory=datetime.utcnow)

    # Pydantic v2 config
    model_config = {
        "from_attributes": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat(),
        }
    }

    @classmethod
    def from_mongo(cls, data: dict) -> "Transaction":
        """Convert MongoDB document to Transaction model"""
        if data.get("_id"):
            data["id"] = str(data["_id"])
            del data["_id"]
        return cls(**data)


# ----------------------------------------------------------
# AGGREGATED SUMMARY MODEL
# ----------------------------------------------------------
class TransactionSummary(BaseModel):
    total_credit: float
    total_debit: float
    net_balance: float
    ytd_credit: float
    latest_alert: Optional[str] = None

    model_config = {"from_attributes": True}