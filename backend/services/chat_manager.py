# backend/services/chat_manager.py

from datetime import datetime
from backend.utils.logger import logger
import re

# ML Components
from backend.ml.intent_classifier import IntentClassifier
from backend.ml.ner_extractor import NERExtractor
from backend.ml.memory_store import VectorMemory
from backend.ml.categorizer import SmartCategorizer
from backend.ml.anomaly_detector import AnomalyDetector
from backend.ml.forecaster import BudgetForecaster
from backend.ml.score_engine import FinancialHealthScorer

# Database Services
from backend.services.transaction_service import TransactionService
from backend.models.transaction import TransactionType

class ChatManager:
    def __init__(self):
        logger.info("Initializing ML Components for ChatManager...")
        self.intent_classifier = IntentClassifier()
        self.ner_extractor = NERExtractor()
        self.memory = VectorMemory()
        self.categorizer = SmartCategorizer()
        self.anomaly_detector = AnomalyDetector()
        self.forecaster = BudgetForecaster()
        self.scorer = FinancialHealthScorer()
        
        # Database Connection
        self.transaction_service = TransactionService()
        logger.info("ML Components & DB Service initialized.")

        # Central message bank (easy to expand)
        self.demo_responses = {
            "tax": (
                "📊 **Tax Saving Options:**\n\n"
                "• ELSS Mutual Funds (80C)\n"
                "• PPF (Public Provident Fund)\n"
                "• NPS (₹50k extra deduction)\n"
                "• Health Insurance (80D)\n"
                "• Home Loan Principal (80C)"
            ),
            "greeting": (
                "👋 **Hello! I'm FinBuddy AI** — Your personal finance assistant!\n\n"
                "I can help you with:\n"
                "• Checking balance\n"
                "• Adding transactions\n"
                "• Tax savings\n"
                "• Financial planning\n"
                "• Viewing history"
            ),
            "help": (
                "🤖 **FinBuddy AI Help Menu**\n\n"
                "Try asking:\n"
                "• 'What's my balance?'\n"
                "• 'Add petrol expense 500'\n"
                "• 'Tax saving options'\n"
                "• 'Show my transactions'\n"
                "You can also use voice commands!"
            ),
            "health_score": (
                "🩺 **Financial Health Score**\n\n"
                "Calculating your score based on recent activity..."
            ),
            "predict_budget": (
                "🔮 **Budget Forecast**\n\n"
                "Analyzing your spending trends..."
            )
        }

    # ========================================================================================
    # CENTRAL CHAT HANDLER
    # ========================================================================================
    async def process_message(self, user_id: str, message: str, is_voice: bool = False, parsed_data: dict = None) -> dict:
        try:
            if not message:
                return self._error_response("Empty message received")

            msg = message.strip()
            logger.info(f"💬 Chat message received: {msg}")

            # 1. Retrieve Context (Memory)
            context = self.memory.get_context(msg)
            if context:
                logger.info(f"🧠 Found {len(context)} relevant past interactions.")

            # 2. Intent Detection
            intent, confidence = self.intent_classifier.predict(msg)
            
            # ------------------------------------------------------------------
            # 🎤 VOICE AGENT OVERRIDE
            # If we have pre-parsed data from Whisper/Orchestrator, USE IT!
            # ------------------------------------------------------------------
            entities = {}
            if parsed_data and parsed_data.get("amount", 0) > 0:
                logger.info(f"🎤 Voice Agent Override: Using parsed data {parsed_data}")
                intent = "add_transaction"
                entities = {
                    "AMOUNT": parsed_data.get("amount"),
                    "ORG": parsed_data.get("counterparty", "Unknown"),
                    "CATEGORY": parsed_data.get("category")  # Pass category to be used later
                }
            else:
                logger.info(f"🎯 Predicted Intent: {intent} (Confidence: {confidence:.2f})")
            
            # Handle new intents manually if classifier isn't retrained yet
            # Simple keyword override for demo purposes
            msg_lower = msg.lower()
            # Simple keyword overrides for demo purposes
            if "bank" in msg_lower or "saving" in msg_lower or "deposit" in msg_lower:
                intent = "add_transaction"
            elif "score" in msg_lower or "health" in msg_lower:
                intent = "health_score"
            elif "budget" in msg_lower or "forecast" in msg_lower or "predict" in msg_lower:
                intent = "predict_budget"

            # 3. Entity Extraction
            if not entities:
                entities = self.ner_extractor.extract_entities(msg)
            logger.info(f"🔍 Extracted Entities: {entities}")

            # 4. Generate Response based on Intent (with Context)
            # NOW ASYNC to handle DB calls
            response_data = await self._generate_response(intent, entities, msg, context)

            # 5. Update Memory
            self.memory.add_interaction(msg, response_data['text'], intent, entities)

            return response_data

        except Exception as e:
            logger.error(f"Chat processing failed: {e}")
            import traceback
            traceback.print_exc()
            return self._error_response("Internal error")

    # ========================================================================================
    # INTERNAL HELPERS
    # ========================================================================================

    async def _generate_response(self, intent, entities, user_message, context=None):
        """Generate response based on ML intent, entities, and conversation context"""
        
        # 0. Context-Aware Intent Refinement
        # If intent is 'unknown' or generic, check if context implies a follow-up
        if intent == "unknown" and context:
            last_interaction = context[0] # Most recent
            # Example: User says "Why?" after a budget alert
            if "budget" in last_interaction['metadata'].get('bot_response', '').lower():
                intent = "explain_budget"
            elif "score" in last_interaction['metadata'].get('bot_response', '').lower():
                intent = "explain_score"

        # Map ML intents to response keys
        
        # Map ML intents to response keys
        intent_map = {
            "check_balance": "balance",
            "add_transaction": "transaction",
            "tax_advice": "tax",
            "transaction_history": "history",
            "greeting": "greeting",
            "help": "help",
            "health_score": "health_score",
            "predict_budget": "predict_budget"
        }
        
        key = intent_map.get(intent)
        
        if key == "balance":
            # -------------------------------------------------------
            # REAL DB CALL: Get Balance
            # -------------------------------------------------------
            try:
                summary = await self.transaction_service.get_transactions_summary()
                text = (
                    "💰 **Your Current Balance:**\n\n"
                    f"• Total Income: ₹{summary['total_credit']:,.2f}\n"
                    f"• Total Expenses: ₹{summary['total_debit']:,.2f}\n"
                    f"• Net Balance: ₹{summary['net_balance']:,.2f}\n"
                    f"• YTD Income: ₹{summary['ytd_credit']:,.2f}"
                )
                return self._response(text, "balance", intent)
            except Exception as e:
                logger.error(f"Balance query failed: {e}")
                import traceback
                traceback.print_exc()
                return self._error_response(f"Could not fetch balance: {str(e)}")


        elif key == "transaction":
            # -------------------------------------------------------
            # REAL DB CALL: Create Transaction
            # -------------------------------------------------------
            amount = entities.get("AMOUNT", 0)
            if amount <= 0:
                # Fallback: try to extract a number from the raw message
                match = re.search(r"\d+(?:\.\d+)?", user_message)
                if match:
                    try:
                        amount = float(match.group())
                    except ValueError:
                        amount = 0
                if amount <= 0:
                    return self._response("I couldn't find a valid amount. Please try again (e.g., 'Spent 500 on food').", "error", intent)

            # 1. Smart Categorization
            # Use pre-parsed category if available (from Voice Agent), else predict
            category = entities.get("CATEGORY")
            if not category or category == "Miscellaneous":
                category = self.categorizer.predict(user_message)
            
            # 2. Anomaly Detection
            anomaly_result = self.anomaly_detector.check(amount, category, "Unknown Merchant")
            anomaly_warning = ""
            if anomaly_result["is_anomaly"]:
                anomaly_warning = f"\n⚠️ **Warning:** {anomaly_result['reason']}"
                
            # 3. Budget Overshoot Check
            # Get current month stats for accurate projection
            summary = await self.transaction_service.get_transactions_summary()
            current_spend = summary['total_debit'] # Simplified, ideally should be this month's debit
            day_of_month = datetime.now().day
            
            budget_check = self.forecaster.check_overshoot(current_spend + amount, 50000, day_of_month)
            budget_warning = ""
            if budget_check["overshoot"]:
                budget_warning = f"\n📉 **Projection Alert:** {budget_check['message']}"
            
            # 4. Generate Dynamic Insight (Context-Aware)
            # Check for smart counseling advice first
            counseling_advice = await self._generate_counseling_response(category, amount)
            
            insights = {
                "Food": "Eating out frequently adds up! Consider cooking at home to save ~30%.",
                "Travel": "Travel expenses are high. Look for monthly passes or carpooling options.",
                "Shopping": "Impulse buying? Try the 24-hour rule before purchasing non-essentials.",
                "Bills": "Set up auto-pay to avoid late fees. Check for energy-efficient appliances.",
                "Entertainment": "Subscription fatigue is real. Cancel unused services to save money.",
                "General": "Tracking every penny helps! Keep it up to build better financial habits.",
                "Income": "Great! Consider investing 20% of your income for long-term goals."
            }
            
            # Use counseling advice if available, otherwise fallback to static insight
            insight = counseling_advice if counseling_advice else insights.get(category, insights["General"])
            
            # --- EXTRACT SOURCE (Multi-Account) ---
            source = "Cash" # Default
            msg_lower = user_message.lower()
            if "paytm" in msg_lower:
                source = "Paytm Wallet"
            elif "hdfc" in msg_lower or "bank" in msg_lower:
                source = "HDFC Bank"
            elif "cash" in msg_lower:
                source = "Cash"
            elif "upi" in msg_lower or "gpay" in msg_lower or "phonepe" in msg_lower:
                source = "HDFC Bank" # Assume UPI linked to Bank for now
            
            # 5. SAVE TO DB
            txn_data = {
                "amount": amount,
                "category": category,
                "message": user_message,
                "counterparty": entities.get("ORG", "Unknown"),
                "txn_type": TransactionType.DEBITED.value, # Default to expense
                "date": datetime.utcnow(),
                "source": source
            }
            
            # Check if it looks like income
            if "received" in user_message.lower() or "income" in user_message.lower() or "salary" in user_message.lower():
                txn_data["txn_type"] = TransactionType.CREDITED.value
                insight = insights["Income"]

            await self.transaction_service.create_transaction(txn_data)
            
            text = (
                "✅ **Transaction Added Successfully!**\n\n"
                f"• Amount: ₹{amount}\n"
                f"• Type: {txn_data['txn_type']}\n"
                f"• Category: {category}\n"
                f"• Source: {source}\n"
                f"• AI Insight: {insight}\n"
                f"{anomaly_warning}\n"
                f"{budget_warning}"
            )
            
            return self._response(text, "transaction_action", intent)

        elif key == "history":
            # -------------------------------------------------------
            # REAL DB CALL: Get History
            # -------------------------------------------------------
            txs = await self.transaction_service.get_all_transactions()
            recent = txs[:5] # Top 5
            
            if not recent:
                return self._response("No recent transactions found.", "history", intent)
                
            lines = []
            for t in recent:
                icon = "🟢" if t.txn_type == TransactionType.CREDITED.value else "🔴"
                lines.append(f"• {icon} ₹{t.amount} - {t.category} ({t.message[:20]}...)")
            
            text = "📈 **Recent Transactions:**\n\n" + "\n".join(lines)
            return self._response(text, "history", intent)
            
        elif key == "health_score":
            # -------------------------------------------------------
            # REAL DB CALL: Health Score
            # -------------------------------------------------------
            summary = await self.transaction_service.get_transactions_summary()
            score, note = self.scorer.calculate_score(
                summary['total_credit'], 
                summary['total_debit'], 
                anomalies=0 # We need to track anomalies in DB to get real count
            )
            
            savings_rate = 0
            if summary['total_credit'] > 0:
                savings_rate = ((summary['total_credit'] - summary['total_debit']) / summary['total_credit']) * 100
                
            text = (
                f"🩺 **Financial Health Score: {score}/100**\n\n"
                f"{note}\n\n"
                f"• **Savings Rate**: {savings_rate:.1f}%\n"
                f"• **Net Balance**: ₹{summary['net_balance']:,.2f}"
            )
            return self._response(text, "health_score", intent)
            
        elif key == "predict_budget":
            # Forecast
            forecast = self.forecaster.predict_next_month()
            text = (
                f"🔮 **Budget Forecast for Next Month**\n\n"
                f"• **Predicted Spend**: ₹{forecast}\n"
                f"• **Trend**: Increasing by ~5% month-over-month.\n"
                "• **Advice**: Try to reduce 'Food' expenses to stay on track."
            )
            return self._response(text, "predict_budget", intent)
            
        elif key:
            return self._response(self.demo_responses[key], key, intent)
            
            # Fallback / Unknown
            return {
                "text": self._format_persona_response(
                    "I'm not quite sure I understood that. I'm still learning! "
                    "Try asking about your balance, adding an expense, or checking your health score."
                ),
                "type": "general",
                "intent": "unknown",
                "confidence": 0.0,
                "entities": entities,
                "suggestions": ["Check balance", "Add expense", "Health Score"],
                "timestamp": datetime.now().isoformat()
            }

    # ========================================================================================
    # NEW: CONTEXT & COUNSELING LOGIC
    # ========================================================================================

    def _format_persona_response(self, raw_text: str, sentiment: str = "neutral") -> str:
        """Wraps raw text in an empathetic, advisory persona"""
        prefixes = {
            "positive": ["Great job! ", "Nice work. ", "Looking good! "],
            "negative": ["I noticed something concerning. ", "Heads up: ", "Careful there. "],
            "neutral": ["", "Here's the info: ", ""]
        }
        
        # Simple random selection could be added here
        prefix = prefixes.get(sentiment, [""])[0]
        return f"{prefix}{raw_text}"

    async def _generate_counseling_response(self, category: str, amount: float) -> str:
        """Generates smart advice based on spending"""
        # In a real app, this would check historical averages
        if category.lower() == "food" and amount > 2000:
            return "That's a bit high for a single meal. Cooking at home could save you ~₹5,000/month!"
        elif category.lower() == "shopping" and amount > 5000:
            return "Big purchase! Make sure this fits your 50/30/20 rule."
        return ""

    def _response(self, text: str, response_type: str, intent: str):
        """Unified response formatter"""
        # Simple Hindi Translation (Demo)
        # In production, use a real translation API or library
        is_hindi = "नमस्ते" in text or "शेष राशि" in text # Check if text is already Hindi (not implemented yet)
        
        # We can't easily translate dynamic text here without an external API.
        # But we can translate the static parts if we passed the language param.
        # For now, we'll rely on the frontend to send Hindi voice input, 
        # and the bot will reply in English (or Hinglish if we add it).
        
        # Let's add a simple Hinglish modifier for common phrases if needed
        
        return {
            "text": text,
            "type": response_type,
            "intent": intent,
            "confidence": 0.95,
            "entities": {},
            "suggestions": ["Check balance", "Add expense", "Tax tips", "View history"],
            "timestamp": datetime.now().isoformat()
        }

    def _error_response(self, message="Something went wrong"):
        return {
            "text": message,
            "type": "error",
            "intent": "error",
            "confidence": 0.0,
            "entities": {},
            "suggestions": ["Try again", "Help"],
            "timestamp": datetime.now().isoformat()
        }
