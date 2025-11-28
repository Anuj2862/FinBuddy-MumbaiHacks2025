"""
Autonomous Scheduler - Background Task Manager for Agentic AI
Runs autonomous agents continuously to monitor user finances and take proactive actions
"""

import schedule
import time
import threading
import logging
from datetime import datetime
from typing import List, Dict, Any
from backend.services.transaction_service import TransactionService
from backend.services.compliance_service import ComplianceService
from backend.ml.score_engine import AdvancedFinancialHealthScorer
from backend.ml.budget_predictor import BudgetPredictor

logger = logging.getLogger(__name__)


class AutonomousScheduler:
    """
    Background scheduler that runs autonomous agents continuously
    Monitors user finances and triggers proactive interventions
    """
    
    def __init__(self):
        self.transaction_service = TransactionService()
        self.compliance_service = ComplianceService()
        self.health_scorer = AdvancedFinancialHealthScorer()
        self.budget_predictor = BudgetPredictor()
        self.is_running = False
        self.thread = None
        
        # Agent states
        self.agent_states = {
            "budget_guardian": {"status": "active", "last_check": None, "alerts": []},
            "compliance_monitor": {"status": "active", "last_check": None, "alerts": []},
            "anomaly_detective": {"status": "active", "last_check": None, "alerts": []},
            "savings_optimizer": {"status": "active", "last_check": None, "alerts": []},
            "goal_tracker": {"status": "active", "last_check": None, "alerts": []},
            "habit_coach": {"status": "active", "last_check": None, "alerts": []},
            "market_intelligence": {"status": "active", "last_check": None, "alerts": []},
            "emergency_responder": {"status": "active", "last_check": None, "alerts": []}
        }
        
        logger.info("AutonomousScheduler initialized with 8 agents")
    
    def start(self):
        """Start the autonomous scheduler in a background thread"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.is_running = True
        
        # Schedule tasks
        # Every 1 hour - Quick checks
        schedule.every(1).hours.do(self.run_hourly_checks)
        
        # Every 6 hours - Deep analysis
        schedule.every(6).hours.do(self.run_deep_analysis)
        
        # Daily at 9 AM - Morning briefing
        schedule.every().day.at("09:00").do(self.send_morning_briefing)
        
        # Daily at 9 PM - Evening summary
        schedule.every().day.at("21:00").do(self.send_evening_summary)
        
        # Start scheduler thread
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        
        logger.info("🤖 Autonomous Scheduler started - 8 agents monitoring")
    
    def stop(self):
        """Stop the autonomous scheduler"""
        self.is_running = False
        schedule.clear()
        logger.info("Autonomous Scheduler stopped")
    
    def _run_scheduler(self):
        """Internal method to run the scheduler loop"""
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    # ==================== HOURLY CHECKS ====================
    
    def run_hourly_checks(self):
        """Run quick checks every hour"""
        logger.info("🔍 Running hourly autonomous checks...")
        
        try:
            # Get all transactions
            transactions = self.transaction_service.get_all_transactions()
            
            # Run quick agents
            self.check_budget_guardian(transactions)
            self.check_anomaly_detective(transactions)
            self.check_emergency_responder(transactions)
            
            logger.info("✅ Hourly checks complete")
        except Exception as e:
            logger.error(f"Error in hourly checks: {str(e)}")
    
    # ==================== DEEP ANALYSIS ====================
    
    def run_deep_analysis(self):
        """Run comprehensive analysis every 6 hours"""
        logger.info("🧠 Running deep autonomous analysis...")
        
        try:
            transactions = self.transaction_service.get_all_transactions()
            
            # Run all agents
            self.check_budget_guardian(transactions)
            self.check_compliance_monitor(transactions)
            self.check_anomaly_detective(transactions)
            self.check_savings_optimizer(transactions)
            self.check_goal_tracker(transactions)
            self.check_habit_coach(transactions)
            self.check_market_intelligence(transactions)
            self.check_emergency_responder(transactions)
            
            logger.info("✅ Deep analysis complete")
        except Exception as e:
            logger.error(f"Error in deep analysis: {str(e)}")
    
    # ==================== AGENT 1: BUDGET GUARDIAN ====================
    
    def check_budget_guardian(self, transactions: List[Dict]):
        """Monitor spending and predict overspend"""
        try:
            # Calculate current month spending by category
            from datetime import datetime
            current_month = datetime.now().month
            current_year = datetime.now().year
            
            monthly_transactions = [
                t for t in transactions 
                if datetime.fromisoformat(t.get('date', '')).month == current_month
                and datetime.fromisoformat(t.get('date', '')).year == current_year
                and t.get('type') == 'debit'
            ]
            
            # Group by category
            category_spending = {}
            for t in monthly_transactions:
                category = t.get('category', 'General')
                amount = t.get('amount', 0)
                category_spending[category] = category_spending.get(category, 0) + amount
            
            # Check against budgets (example budgets)
            budgets = {
                "Food": 10000,
                "Travel": 5000,
                "Shopping": 8000,
                "Entertainment": 3000,
                "Bills": 15000
            }
            
            alerts = []
            for category, budget in budgets.items():
                current_spend = category_spending.get(category, 0)
                percentage = (current_spend / budget) * 100 if budget > 0 else 0
                
                # Alert at 70%, 85%, 95%
                if percentage >= 95:
                    alerts.append({
                        "urgency": "critical",
                        "category": category,
                        "message": f"🚨 CRITICAL: {category} budget at {percentage:.0f}% (₹{current_spend:,.0f}/₹{budget:,.0f})",
                        "action": "Immediate spending freeze recommended"
                    })
                elif percentage >= 85:
                    alerts.append({
                        "urgency": "high",
                        "category": category,
                        "message": f"⚠️ WARNING: {category} budget at {percentage:.0f}% (₹{current_spend:,.0f}/₹{budget:,.0f})",
                        "action": "Reduce spending in this category"
                    })
                elif percentage >= 70:
                    alerts.append({
                        "urgency": "medium",
                        "category": category,
                        "message": f"💡 NOTICE: {category} budget at {percentage:.0f}% (₹{current_spend:,.0f}/₹{budget:,.0f})",
                        "action": "Monitor spending closely"
                    })
            
            # Update agent state
            self.agent_states["budget_guardian"]["last_check"] = datetime.now().isoformat()
            self.agent_states["budget_guardian"]["alerts"] = alerts
            
            if alerts:
                logger.info(f"🛡️ Budget Guardian: {len(alerts)} alerts generated")
            
        except Exception as e:
            logger.error(f"Budget Guardian error: {str(e)}")
    
    # ==================== AGENT 2: COMPLIANCE MONITOR ====================
    
    def check_compliance_monitor(self, transactions: List[Dict]):
        """Monitor GST compliance and tax thresholds"""
        try:
            # Use existing compliance service
            compliance_result = self.compliance_service.check_gst_compliance(transactions)
            
            alerts = []
            if compliance_result.get("alert_level") == "critical":
                alerts.append({
                    "urgency": "critical",
                    "message": f"🚨 GST ALERT: {compliance_result.get('message')}",
                    "action": "Register for GST immediately"
                })
            elif compliance_result.get("alert_level") == "warning":
                alerts.append({
                    "urgency": "high",
                    "message": f"⚠️ GST WARNING: {compliance_result.get('message')}",
                    "action": "Prepare for GST registration"
                })
            
            self.agent_states["compliance_monitor"]["last_check"] = datetime.now().isoformat()
            self.agent_states["compliance_monitor"]["alerts"] = alerts
            
            if alerts:
                logger.info(f"📋 Compliance Monitor: {len(alerts)} alerts generated")
                
        except Exception as e:
            logger.error(f"Compliance Monitor error: {str(e)}")
    
    # ==================== AGENT 3: ANOMALY DETECTIVE ====================
    
    def check_anomaly_detective(self, transactions: List[Dict]):
        """Detect unusual transactions and potential fraud"""
        try:
            from datetime import datetime, timedelta
            
            # Get recent transactions (last 24 hours)
            now = datetime.now()
            recent_cutoff = now - timedelta(hours=24)
            
            recent_transactions = [
                t for t in transactions
                if datetime.fromisoformat(t.get('date', '')) > recent_cutoff
            ]
            
            alerts = []
            
            for t in recent_transactions:
                amount = t.get('amount', 0)
                category = t.get('category', 'General')
                transaction_time = datetime.fromisoformat(t.get('date', ''))
                
                # Check for unusual time (2 AM - 5 AM)
                if 2 <= transaction_time.hour <= 5:
                    alerts.append({
                        "urgency": "high",
                        "transaction_id": t.get('_id'),
                        "message": f"🚨 Unusual time: ₹{amount:,.0f} at {transaction_time.strftime('%I:%M %p')}",
                        "action": "Verify this transaction"
                    })
                
                # Check for large amounts (>₹10,000)
                if amount > 10000:
                    alerts.append({
                        "urgency": "medium",
                        "transaction_id": t.get('_id'),
                        "message": f"💰 Large transaction: ₹{amount:,.0f} in {category}",
                        "action": "Confirm if authorized"
                    })
            
            self.agent_states["anomaly_detective"]["last_check"] = datetime.now().isoformat()
            self.agent_states["anomaly_detective"]["alerts"] = alerts
            
            if alerts:
                logger.info(f"🔍 Anomaly Detective: {len(alerts)} anomalies detected")
                
        except Exception as e:
            logger.error(f"Anomaly Detective error: {str(e)}")
    
    # ==================== AGENT 4: SAVINGS OPTIMIZER ====================
    
    def check_savings_optimizer(self, transactions: List[Dict]):
        """Find savings opportunities"""
        try:
            # Analyze spending patterns
            category_totals = {}
            for t in transactions:
                if t.get('type') == 'debit':
                    category = t.get('category', 'General')
                    amount = t.get('amount', 0)
                    category_totals[category] = category_totals.get(category, 0) + amount
            
            alerts = []
            
            # Check for high food delivery spending
            if category_totals.get('Food', 0) > 8000:
                potential_savings = category_totals['Food'] * 0.3  # 30% savings possible
                alerts.append({
                    "urgency": "medium",
                    "message": f"💡 High food spending: ₹{category_totals['Food']:,.0f}",
                    "action": f"Cook at home more often. Potential savings: ₹{potential_savings:,.0f}/month"
                })
            
            # Check for subscription optimization
            if category_totals.get('Entertainment', 0) > 2000:
                alerts.append({
                    "urgency": "low",
                    "message": f"📺 Review subscriptions: ₹{category_totals['Entertainment']:,.0f}",
                    "action": "Cancel unused streaming services"
                })
            
            self.agent_states["savings_optimizer"]["last_check"] = datetime.now().isoformat()
            self.agent_states["savings_optimizer"]["alerts"] = alerts
            
            if alerts:
                logger.info(f"💰 Savings Optimizer: {len(alerts)} opportunities found")
                
        except Exception as e:
            logger.error(f"Savings Optimizer error: {str(e)}")
    
    # ==================== AGENT 5-8: PLACEHOLDER ====================
    
    def check_goal_tracker(self, transactions: List[Dict]):
        """Track financial goals"""
        self.agent_states["goal_tracker"]["last_check"] = datetime.now().isoformat()
        # TODO: Implement goal tracking logic
    
    def check_habit_coach(self, transactions: List[Dict]):
        """Coach better financial habits"""
        self.agent_states["habit_coach"]["last_check"] = datetime.now().isoformat()
        # TODO: Implement habit coaching logic
    
    def check_market_intelligence(self, transactions: List[Dict]):
        """Provide market insights"""
        self.agent_states["market_intelligence"]["last_check"] = datetime.now().isoformat()
        # TODO: Implement market intelligence logic
    
    def check_emergency_responder(self, transactions: List[Dict]):
        """Respond to financial emergencies"""
        self.agent_states["emergency_responder"]["last_check"] = datetime.now().isoformat()
        # TODO: Implement emergency response logic
    
    # ==================== BRIEFINGS ====================
    
    def send_morning_briefing(self):
        """Send morning financial briefing"""
        logger.info("☀️ Sending morning briefing...")
        # TODO: Compile and send morning briefing
    
    def send_evening_summary(self):
        """Send evening financial summary"""
        logger.info("🌙 Sending evening summary...")
        # TODO: Compile and send evening summary
    
    # ==================== STATUS ====================
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents"""
        return {
            "scheduler_running": self.is_running,
            "agents": self.agent_states,
            "total_alerts": sum(len(agent["alerts"]) for agent in self.agent_states.values())
        }
    
    def get_all_alerts(self) -> List[Dict]:
        """Get all current alerts from all agents"""
        all_alerts = []
        for agent_name, agent_state in self.agent_states.items():
            for alert in agent_state["alerts"]:
                alert["agent"] = agent_name
                all_alerts.append(alert)
        
        # Sort by urgency
        urgency_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_alerts.sort(key=lambda x: urgency_order.get(x.get("urgency", "low"), 3))
        
        return all_alerts


# Global scheduler instance
autonomous_scheduler = AutonomousScheduler()
