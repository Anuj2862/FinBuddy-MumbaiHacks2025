const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AIProviderService — multi-provider fallback chain
 * Priority: Gemini → Groq → OpenAI → Cohere → Regex
 */
class AIProviderService {
    constructor() {
        this.providers = [
            { name: 'gemini', priority: 1 },
            { name: 'groq',   priority: 2 },
            { name: 'openai', priority: 3 },
            { name: 'cohere', priority: 4 },
            { name: 'regex',  priority: 5 }
        ];

        // Gemini
        if (process.env.GEMINI_API_KEY) {
            try {
                this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            } catch (e) {
                console.warn('[AI] Gemini init failed:', e.message);
            }
        }

        // Groq (uses OpenAI-compatible SDK via fetch)
        this.groqKey   = process.env.GROQ_API_KEY   || null;
        this.openaiKey = process.env.OPENAI_API_KEY  || null;
        this.cohereKey = process.env.COHERE_API_KEY  || null;
    }

    async processInput(prompt, context = {}) {
        for (const provider of this.providers) {
            try {
                console.log(`Attempting with provider: ${provider.name}`);
                const result = await this.callProvider(provider.name, prompt, context);
                if (result) return { provider: provider.name, data: result };
            } catch (error) {
                console.error(`Provider ${provider.name} failed:`, error.message);
            }
        }
        throw new Error('All AI providers failed.');
    }

    async callProvider(name, prompt, context) {
        switch (name) {
            case 'gemini': return await this.callGemini(prompt);
            case 'groq':   return await this.callGroq(prompt);
            case 'openai': return await this.callOpenAI(prompt);
            case 'cohere': return await this.callCohere(prompt);
            case 'regex':  return this.regexFallback(prompt);
            default: return null;
        }
    }

    // ── Gemini ──────────────────────────────────────────────
    async callGemini(prompt) {
        if (!this.genAI) throw new Error('Gemini not configured');

        // Try models in order — gemini-2.0-flash is current stable
        const modelNames = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];
        let lastError;

        for (const modelName of modelNames) {
            try {
                const model = this.genAI.getGenerativeModel({ model: modelName });
                const systemPrompt = `You are a financial parsing assistant for Indian informal economy vendors.
Extract financial data from the user's input and return ONLY a valid JSON object (no markdown, no code blocks).
Format:
{
  "amount": number,
  "category": "food|inventory|rent|travel|salary|general|inquiry",
  "type": "expense|income|info",
  "description": "brief summary"
}
If the user asks about balance/summary, set type to "info" and category to "inquiry".`;

                const result = await model.generateContent(`${systemPrompt}\n\nUser Input: ${prompt}`);
                const text = result.response.text().replace(/```json|```/g, '').trim();
                return JSON.parse(text);
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        throw lastError;
    }

    // ── Groq ────────────────────────────────────────────────
    async callGroq(prompt) {
        if (!this.groqKey) throw new Error('Groq key missing');

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.groqKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: `You are a financial parsing assistant. Extract financial data and return ONLY valid JSON:
{"amount":number,"category":"food|inventory|rent|travel|salary|general|inquiry","type":"expense|income|info","description":"string"}
No markdown, no explanation.`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 200
            })
        });

        if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim();
        if (!text) throw new Error('Empty Groq response');
        return JSON.parse(text);
    }

    // ── OpenAI ──────────────────────────────────────────────
    async callOpenAI(prompt) {
        if (!this.openaiKey) throw new Error('OpenAI key missing');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openaiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `Extract financial data and return ONLY valid JSON:
{"amount":number,"category":"food|inventory|rent|travel|salary|general|inquiry","type":"expense|income|info","description":"string"}`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 200
            })
        });

        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim();
        if (!text) throw new Error('Empty OpenAI response');
        return JSON.parse(text);
    }

    // ── Cohere ──────────────────────────────────────────────
    async callCohere(prompt) {
        if (!this.cohereKey) throw new Error('Cohere key missing');

        const res = await fetch('https://api.cohere.ai/v1/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.cohereKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'command',
                prompt: `Extract financial data from the following input and return ONLY valid JSON with keys: amount (number), category (food/inventory/rent/travel/salary/general/inquiry), type (expense/income/info), description (string). No markdown.\n\nInput: ${prompt}\n\nJSON:`,
                max_tokens: 200,
                temperature: 0.1
            })
        });

        if (!res.ok) throw new Error(`Cohere HTTP ${res.status}`);
        const data = await res.json();
        const text = data.generations?.[0]?.text?.replace(/```json|```/g, '').trim();
        if (!text) throw new Error('Empty Cohere response');
        return JSON.parse(text);
    }

    // ── Regex Fallback ──────────────────────────────────────
    regexFallback(prompt) {
        console.log('Using Regex Fallback Logic...');
        const lower = prompt.toLowerCase();

        const inquiryKeywords = ['balance', 'summary', 'बैलेंस', 'हेलो', 'hi', 'hello',
            'how much', 'total', 'kitna', 'कितना', 'kharcha', 'खर्चा', 'show', 'report'];
        if (inquiryKeywords.some(k => lower.includes(k))) {
            return { amount: 0, category: 'inquiry', type: 'info', isFallback: true, description: prompt };
        }

        const amountMatch =
            prompt.match(/(?:rs\.?|inr|₹|cost|spent|received|got|paid|रुपये|रु\.?)\s*(\d+(?:\.\d{1,2})?)/i) ||
            prompt.match(/(\d+(?:\.\d{1,2})?)/);

        const categoryMap = {
            food: ['food', 'khana', 'खाना', 'chai', 'tea', 'snack', 'lunch', 'dinner', 'breakfast', 'zomato', 'swiggy'],
            transport: ['transport', 'travel', 'uber', 'ola', 'petrol', 'bus', 'auto', 'cab'],
            inventory: ['inventory', 'stock', 'material', 'purchase', 'buy', 'goods'],
            rent: ['rent', 'किराया', 'lease'],
            salary: ['salary', 'wage', 'pay', 'तनख्वाह'],
            shopping: ['shopping', 'amazon', 'flipkart', 'clothes', 'mall']
        };

        let category = 'general';
        for (const [cat, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(k => lower.includes(k))) { category = cat; break; }
        }

        const isIncome = /(?:received|got|earned|sold|income|मिला|आया|बिका|sale)/i.test(prompt);

        return {
            amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
            category,
            type: isIncome ? 'income' : 'expense',
            description: prompt,
            isFallback: true
        };
    }
}

module.exports = new AIProviderService();
