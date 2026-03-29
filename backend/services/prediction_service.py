# backend/services/prediction_service.py

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from backend.ml.budget_predictor import BudgetPredictor
from backend.services.transaction_service import TransactionService
from backend.utils.logger import logger


class Alert:
    """Represents an overspend alert"""
    def __init__(self, category: str, message: str, severity: str):
        self.category = category
        self.message = message
        self.severity = severity  # "warning", "danger"
    
    def to_dict(self):
        return {
            "category": self.category,
            "message": self.message,
            "severity": self.severity
        }


class SavingOpportunity:
    """Represents a saving opportunity"""
    def __init__(self, category: str, message: str, potential_savings: float):
        self.category = category
        self.message = message
        self.potential_savings = potential_savings
    
    def to_dict(self):
        return {
            "category": self.category,
            "message": self.message,
            "potential_savings": round(self.potential_savings, 2)
        }


class PredictionService:
    """
    Service layer for budget predictions.
    Coordinates data fetching, prediction generation, and insight creation.
    """
    
    def __init__(self):
        self.predictor = BudgetPredictor()
        self.transaction_service = TransactionService()
        logger.info("PredictionService initialized")
    
    async def get_historical_transactions(self, user_id: str, days: int = 60) -> List[dict]:
        """
        Fetch historical transactions from the database for a specific user.
        """
        try:
            # Get all transactions for the user
            transactions = await self.transaction_service.get_all_transactions(user_id)
            
            # Filter by date range
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            filtered = []
            for txn in transactions:
                # txn is a Transaction model, not a dict
                txn_date = txn.date
                if isinstance(txn_date, datetime) and txn_date >= cutoff_date:
                    filtered.append(txn.model_dump() if hasattr(txn, 'model_dump') else txn.dict())
            
            logger.info(f"Retrieved {len(filtered)} transactions from last {days} days")
            return filtered
            
        except Exception as e:
            logger.error(f"Failed to fetch transactions: {str(e)}")
            return []
    
    def get_default_budgets(self) -> Dict[str, float]:
        """
        Get default budget thresholds by category.
        In a real app, this would come from user settings.
        """
        return {
            "food": 15000,
            "travel": 8000,
            "shopping": 10000,
            "entertainment": 5000,
            "bills": 12000,
            "general": 5000
        }
    
    async def get_monthly_predictions(self, user_id: str) -> Dict[str, dict]:
        """
        Generate predictions for the next month across all categories.
        
        Returns:
            Dict of {category: prediction_details}
        """
        logger.info(f"Generating monthly budget predictions for user: {user_id}")
        
        # Fetch historical data
        transactions = await self.get_historical_transactions(user_id, days=60)
        
        if not transactions:
            logger.warning("No transactions available for predictions")
            return {}
        
        # Get budgets
        budgets = self.get_default_budgets()
        
        # Generate predictions
        predictions = self.predictor.predict_all_categories(transactions, budgets)
        
        return predictions
    
    async def get_overspend_alerts(self, user_id: str) -> List[dict]:
        """
        Get alerts for categories predicted to exceed budget.
        
        Returns:
            List of alert dictionaries
        """
        logger.info(f"Checking for overspend alerts for user: {user_id}")
        
        predictions = await self.get_monthly_predictions(user_id)
        alerts = []
        
        for category, pred in predictions.items():
            if pred.get('warning'):
                # Determine severity
                predicted = pred['predicted_amount']
                budgets = self.get_default_budgets()
                budget = budgets.get(category, 0)
                
                if budget > 0:
                    overshoot_pct = ((predicted - budget) / budget) * 100
                    severity = "danger" if overshoot_pct > 20 else "warning"
                else:
                    severity = "warning"
                
                alert = Alert(
                    category=category,
                    message=pred['warning'],
                    severity=severity
                )
                alerts.append(alert.to_dict())
        
        logger.info(f"Found {len(alerts)} overspend alerts")
        return alerts
    
    async def get_saving_opportunities(self, user_id: str) -> List[dict]:
        """
        Identify categories where spending is decreasing (saving opportunities).
        
        Returns:
            List of opportunity dictionaries
        """
        logger.info(f"Identifying saving opportunities for user: {user_id}")
        
        transactions = await self.get_historical_transactions(user_id, days=60)
        predictions = await self.get_monthly_predictions(user_id)
        
        opportunities = []
        
        for category, pred in predictions.items():
            if pred['trend'] == 'decreasing':
                # Calculate historical average
                category_txns = [t for t in transactions if t.get('category', '').lower() == category.lower()]
                
                if category_txns:
                    total_historical = sum(t.get('amount', 0) for t in category_txns if t.get('txn_type') == 'Debited')
                    avg_monthly = total_historical / 2  # Assuming 60 days = 2 months
                    
                    predicted = pred['predicted_amount']
                    potential_savings = avg_monthly - predicted
                    
                    if potential_savings > 100:  # Only show significant savings
                        opp = SavingOpportunity(
                            category=category,
                            message=f"Great! Your {category} spending is decreasing. You could save ₹{potential_savings:,.0f} this month.",
                            potential_savings=potential_savings
                        )
                        opportunities.append(opp.to_dict())
        
        logger.info(f"Found {len(opportunities)} saving opportunities")
        return opportunities
    
    async def get_complete_insights(self, user_id: str) -> dict:
        """
        Get all prediction insights in one call for a specific user.
        """
        return {
            "predictions": await self.get_monthly_predictions(user_id),
            "alerts": await self.get_overspend_alerts(user_id),
            "saving_opportunities": await self.get_saving_opportunities(user_id),
            "timestamp": datetime.utcnow().isoformat()
        }
