/**
 * TaskOrchestrator handles the Multi-Agent communication flow.
 * Flow: Input -> Category -> Compliance -> Insights -> Formatter
 */

const AIProviderService = require('./AIProviderService');
const { User, Transaction, GSTStatus } = require('../models/index.js');

class TaskOrchestrator {
    async processUserRequest(userId, rawInput, metadata = {}) {
        try {
            console.log(`[Orchestrator] Starting flow for User: ${userId}`);

            // 1. Input Agent Layer (Parsing raw input into structured data)
            const structuredData = await this.runInputAgent(rawInput, metadata);

            // 2. Category Agent Layer (Determining the nature of the transaction)
            const categorizedData = await this.runCategoryAgent(structuredData);

            // 3. Compliance Agent Layer (Checking GST thresholds and rules)
            const complianceCheck = await this.runComplianceAgent(userId, categorizedData);

            // 4. Persistence Layer (Save to DB)
            const savedTransaction = await this.saveTransaction(userId, categorizedData, complianceCheck);

            // 5. Insights Agent Layer (Generate feedback/warnings)
            const insights = await this.runInsightsAgent(userId, savedTransaction, complianceCheck, categorizedData);

            // 6. Formatter Agent Layer (Final UI-ready response)
            return this.runFormatterAgent(savedTransaction, insights, complianceCheck, categorizedData);

        } catch (error) {
            console.error('[Orchestrator] Error in flow:', error.message);
            // Run Error Agent for graceful fallback response
            return this.runErrorAgent(error);
        }
    }

    async runInputAgent(rawInput, metadata) {
        console.log('[Agent] Input Agent processing...');
        // Uses Fallback Chain (Groq/OpenAI/Gemini) to extract amount, items, date
        const result = await AIProviderService.processInput(`Extract financial data from: "${rawInput}"`, metadata);
        return result.data;
    }

    async runCategoryAgent(data) {
        console.log('[Agent] Category Agent processing...');
        // Logic to categorize (Food, Stock, Rent, etc.)
        return { ...data, category: data.category || 'business-expense' };
    }

    async runComplianceAgent(userId, data) {
        console.log('[Agent] Compliance Agent processing...');
        let user = null;
        let gstStatus = null;
        
        if (userId && userId !== 'guest') {
            try {
                user = await User.findByPk(userId);
                gstStatus = await GSTStatus.findOne({ where: { userId } });
            } catch (err) {
                console.warn('Invalid userId or user not found:', err.message);
            }
        }
        
        const threshold = user?.businessType === 'services' ? 2000000 : 4000000; // 20L vs 40L
        const isNearThreshold = (gstStatus?.annualTurnover || 0) + (data.amount || 0) >= threshold * 0.9;

        return {
            isCompliant: true,
            threshold,
            isNearThreshold,
            warning: isNearThreshold ? `You are approaching the GST threshold of ${threshold/100000}L.` : null
        };
    }

    async saveTransaction(userId, data, compliance) {
        if (data.type === 'info') return null; // Don't save inquiries as transactions
        if (!userId || userId === 'guest') return null; // Can't save guest transactions
        
        try {
            const transaction = await Transaction.create({
                userId,
                amount: data.amount || 0,
                type: data.type || 'expense',
                category: data.category || 'general',
                description: data.description,
                isGST: compliance.isNearThreshold, // Flag if it impacts GST monitoring
                metadata: {
                    source: data.source || 'voice',
                    rawInput: data.rawInput
                }
            });
            return transaction;
        } catch (err) {
            console.error('Failed to save transaction:', err.message);
            return null; // Return null so the flow doesn't crash
        }
    }

    async runInsightsAgent(userId, transaction, compliance, data) {
        console.log('[Agent] Insights Agent processing...');
        
        if (data && data.type === 'info') {
            const transactions = await Transaction.findAll({ where: { userId } });
            
            // Check if user is asking about a specific category
            const lowerInput = data.description?.toLowerCase() || '';
            const categories = ['food', 'travel', 'rent', 'inventory', 'shopping', 'stock', 'materials', 'tea'];
            const mentionedCategory = categories.find(cat => lowerInput.includes(cat));

            if (mentionedCategory) {
                const categoryTotal = transactions
                    .filter(txn => txn.category?.toLowerCase() === mentionedCategory && txn.type === 'expense')
                    .reduce((acc, curr) => acc + curr.amount, 0);
                
                return {
                    advice: `You have spent a total of Rs. ${categoryTotal} on ${mentionedCategory} so far.`,
                    gstAdvice: null
                };
            }

            const balance = transactions.reduce((acc, curr) => acc + (curr.type === 'income' ? curr.amount : -curr.amount), 0);
            return {
                advice: `Your current estimated balance based on recorded transactions is Rs. ${balance}.`,
                gstAdvice: null
            };
        }

        // Generate personalized advice
        return {
            advice: transaction?.amount > 5000 ? "This is a large expense. Did you get an invoice?" : `Transaction of Rs. ${transaction?.amount || 0} recorded successfully.`,
            gstAdvice: compliance.warning
        };
    }

    runFormatterAgent(transaction, insights, compliance, data) {
        return {
            status: 'success',
            message: insights.advice,
            warning: insights.gstAdvice,
            data: transaction ? {
                id: transaction.id,
                amount: transaction.amount,
                category: transaction.category
            } : null
        };
    }

    runErrorAgent(error) {
        return {
            status: 'error',
            message: "I couldn't process that. Please try saying the amount and category clearly.",
            details: error.message
        };
    }
}

module.exports = new TaskOrchestrator();
