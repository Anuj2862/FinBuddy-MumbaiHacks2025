require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const upload = require('./middleware/upload.middleware');
const TaskOrchestrator = require('./services/TaskOrchestrator');
const PDFService = require('./services/PDFService');
const { sequelize, User, Transaction, GSTStatus } = require('./models/index.js');
const { Op } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Database Connection
sequelize.sync()
    .then(() => console.log('Connected to SQLite & Synchronized Models'))
    .catch(err => console.error('SQLite connection error:', err));

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'FinBuddy AI API' });
});

/**
 * Auth Endpoints
 */
app.post('/api/register', async (req, res) => {
    const { name, password, businessType } = req.body;
    try {
        const existingUser = await User.findOne({ where: { name } });
        if (existingUser) {
            return res.status(400).json({ error: 'Name already taken' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            password: hashedPassword,
            businessType: businessType || 'goods',
            preferredLanguage: 'hi'
        });
        
        res.json({ success: true, userId: user.id, name: user.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const user = await User.findOne({ where: { name } });
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        res.json({ success: true, userId: user.id, name: user.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Main AI Endpoint
 */
app.post('/api/process', upload.single('file'), async (req, res) => {
    const { userId, rawInput } = req.body;
    const file = req.file;

    try {
        const result = await TaskOrchestrator.processUserRequest(userId, rawInput, { file });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PDF Invoice Generation Endpoint
 */
app.get('/api/invoice/:transactionId', async (req, res) => {
    try {
        const transaction = await Transaction.findByPk(req.params.transactionId);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
        
        const user = await User.findByPk(transaction.userId);
        PDFService.generateInvoice(transaction, user, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Dashboard & Transactions Endpoints
 */
app.get('/api/summary', async (req, res) => {
    try {
        const userId = req.headers.authorization?.split(' ')[1] || req.query.userId;
        console.log('[API] Fetching summary for userId:', userId);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const transactions = await Transaction.findAll({ where: { userId } });
        
        let totalIncome = 0;
        let totalExpense = 0;
        const categoryMap = {};

        transactions.forEach(txn => {
            if (txn.type === 'income') {
                totalIncome += txn.amount;
            } else {
                totalExpense += txn.amount;
                const cat = txn.category || 'other';
                categoryMap[cat] = (categoryMap[cat] || 0) + txn.amount;
            }
        });

        const balance = totalIncome - totalExpense;
        const savingsPercentage = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

        const categories = Object.keys(categoryMap).map(name => ({
            name,
            amount: categoryMap[name],
            percentage: totalExpense > 0 ? Math.round((categoryMap[name] / totalExpense) * 100) : 0
        })).sort((a, b) => b.amount - a.amount).slice(0, 5);

        // 7-day trend
        const today = new Date();
        const trendMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            trendMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        transactions.forEach(txn => {
            const txnDate = new Date(txn.date || txn.createdAt);
            if (txnDate >= sevenDaysAgo) {
                const dateStr = txnDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                if (trendMap[dateStr]) {
                    if (txn.type === 'income') {
                        trendMap[dateStr].income += txn.amount;
                    } else {
                        trendMap[dateStr].expense += txn.amount;
                    }
                }
            }
        });

        const dailyTrend = Object.values(trendMap);

        res.json({
            totalIncome,
            totalExpense,
            balance,
            savingsPercentage,
            topCategories: categories,
            dailyTrend
        });
    } catch (error) {
        console.error('[API] Summary Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const userId = req.headers.authorization?.split(' ')[1] || req.query.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const transactions = await Transaction.findAll({ 
            where: { userId },
            order: [['isPinned', 'DESC'], ['date', 'DESC'], ['createdAt', 'DESC']],
            limit: 20
        });
        
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const userId = req.headers.authorization?.split(' ')[1] || req.body.userId;
        console.log('[API] Adding transaction for userId:', userId);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { amount, type, category, description, date } = req.body;
        
        const transaction = await Transaction.create({
            userId,
            amount,
            type,
            category,
            description,
            date: date ? new Date(date) : new Date()
        });
        
        res.json(transaction);
    } catch (error) {
        console.error('[API] Transaction Create Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/transactions/:id', async (req, res) => {
    try {
        const userId = req.headers.authorization?.split(' ')[1];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const transaction = await Transaction.findOne({ where: { id: req.params.id, userId } });
        if (!transaction) return res.status(404).json({ error: 'Not found' });

        await transaction.update(req.body);
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const userId = req.headers.authorization?.split(' ')[1];
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const deleted = await Transaction.destroy({ where: { id: req.params.id, userId } });
        if (!deleted) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * AI Consultant Endpoint
 */
app.get('/api/ai/consult', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const transactions = await Transaction.findAll({ where: { userId } });
        const today = new Date().toISOString().split('T')[0];
        
        const todayExpenses = transactions.filter(t => {
            const tDate = t.date ? new Date(t.date).toISOString().split('T')[0] : '';
            return tDate === today && t.type === 'expense';
        });
        const totalToday = todayExpenses.reduce((acc, t) => acc + t.amount, 0);
        
        // Categorize for advice
        const catMap = {};
        todayExpenses.forEach(t => catMap[t.category] = (catMap[t.category] || 0) + t.amount);
        const topCat = Object.keys(catMap).reduce((a, b) => catMap[a] > catMap[b] ? a : b, 'N/A');

        let advice = "";
        if (totalToday === 0) {
            advice = "You haven't recorded any expenses today. Great start! Remember to track even small tea/snack costs.";
        } else if (totalToday > 1500) {
            advice = `High spending alert! You've spent ₹${totalToday} today. Your top category is ${topCat}. Try to cut down on non-essentials tomorrow.`;
        } else if (catMap['Food'] > totalToday * 0.4) {
            advice = "You're spending a significant portion of your daily budget on Food. Bringing a lunch box could save you ₹2000+ monthly!";
        } else {
            advice = "Your spending pattern looks balanced today. Keep your 'Bucket' under your daily goal to maintain your streak!";
        }

        res.json({ advice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`FinBuddy Server running on port ${PORT}`);
});
