/**
 * Budget Predictions & Adaptive Learning
 * Handles fetching ML forecasts, rendering charts, and generating smart suggestions
 */

class PredictionDashboard {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/transactions';
        this.predictions = null;
        this.alerts = null;
        this.opportunities = null;
    }

    async init() {
        await this.loadPredictions();
        console.log('🔮 Prediction Dashboard initialized');
    }

    async loadPredictions() {
        try {
            // Fetch data from API
            // In a real app, these would be separate async calls
            // For demo, we'll simulate the response structure if API is not fully populated

            // const [predRes, alertRes, saveRes] = await Promise.all([
            //     fetch(`${this.apiBase}/predictions`),
            //     fetch(`${this.apiBase}/alerts`),
            //     fetch(`${this.apiBase}/savings`)
            // ]);

            // this.predictions = await predRes.json();
            // this.alerts = await alertRes.json();
            // this.opportunities = await saveRes.json();

            // Mock data for robust demo
            this.predictions = this.generateMockPredictions();
            this.alerts = this.generateMockAlerts();
            this.opportunities = this.generateMockOpportunities();

            this.renderForecastCard();
            this.renderSmartSuggestions();
            this.renderForecastChart();

        } catch (error) {
            console.error('Error loading predictions:', error);
        }
    }

    generateMockPredictions() {
        return {
            "Food": { predicted_amount: 12500, trend: "increasing", confidence: 0.85 },
            "Travel": { predicted_amount: 4200, trend: "stable", confidence: 0.92 },
            "Shopping": { predicted_amount: 8500, trend: "decreasing", confidence: 0.78 },
            "Utilities": { predicted_amount: 3500, trend: "stable", confidence: 0.95 }
        };
    }

    generateMockAlerts() {
        return [
            { category: "Food", message: "Predicted to exceed budget by ₹2,500", urgency: "high" },
            { category: "Entertainment", message: "Unusual spike detected last weekend", urgency: "medium" }
        ];
    }

    generateMockOpportunities() {
        return [
            { category: "Shopping", message: "Spending trending down. Save ₹1,500?", potential_savings: 1500 },
            { category: "Subscriptions", message: "Unused subscriptions detected", potential_savings: 800 }
        ];
    }

    renderForecastCard() {
        const container = document.getElementById('forecastCard');
        if (!container) return;

        let html = '<div class="list-group list-group-flush">';

        for (const [category, data] of Object.entries(this.predictions)) {
            const trendIcon = data.trend === 'increasing' ? 'fa-arrow-trend-up text-danger' :
                (data.trend === 'decreasing' ? 'fa-arrow-trend-down text-success' : 'fa-minus text-muted');

            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center bg-transparent">
                    <div>
                        <span class="fw-bold">${category}</span>
                        <div class="small text-muted">
                            <i class="fas ${trendIcon} me-1"></i> ${data.trend.charAt(0).toUpperCase() + data.trend.slice(1)}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">₹${data.predicted_amount.toLocaleString()}</div>
                        <div class="small text-muted">${Math.round(data.confidence * 100)}% conf.</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    renderSmartSuggestions() {
        const container = document.getElementById('smartSuggestionsPanel');
        if (!container) return;

        let html = '';

        // 1. Smart Budget Adjustments (Adaptive Learning)
        this.alerts.forEach(alert => {
            if (alert.category === 'Food') {
                html += `
                    <div class="suggestion-item p-3 mb-3 bg-light-danger border-start border-danger border-4 rounded">
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6 class="fw-bold text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Budget Mismatch</h6>
                                <p class="small mb-2">You consistently spend ~₹12.5k on Food, but budget is ₹10k.</p>
                                <button class="btn btn-sm btn-outline-danger" onclick="predictionDashboard.adjustBudget('Food', 12500)">
                                    Auto-Adjust to ₹12.5k
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        // 2. Risk Behavior Detection (Anomaly)
        html += `
            <div class="suggestion-item p-3 mb-3 bg-light-warning border-start border-warning border-4 rounded">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="fw-bold text-warning"><i class="fas fa-user-secret me-2"></i>Risk Behavior</h6>
                        <p class="small mb-2">Unusual 2 AM transaction detected (₹15,000).</p>
                        <button class="btn btn-sm btn-outline-warning" onclick="predictionDashboard.verifyTransaction()">
                            Verify Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        // 3. Saving Opportunity
        this.opportunities.forEach(opp => {
            html += `
                <div class="suggestion-item p-3 mb-3 bg-light-success border-start border-success border-4 rounded">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6 class="fw-bold text-success"><i class="fas fa-leaf me-2"></i>Saving Opportunity</h6>
                            <p class="small mb-2">${opp.message}</p>
                            <button class="btn btn-sm btn-outline-success" onclick="predictionDashboard.saveMoney('${opp.category}', ${opp.potential_savings})">
                                Move ₹${opp.potential_savings} to Savings
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderForecastChart() {
        const ctx = document.getElementById('forecastChart');
        if (!ctx) return;

        // Mock historical + forecast data
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun (Forecast)'];
        const data = [45000, 42000, 48000, 46000, 47000, 52000];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: data,
                    borderColor: '#1e40af',
                    backgroundColor: 'rgba(30, 64, 175, 0.1)',
                    tension: 0.4,
                    fill: true,
                    segment: {
                        borderDash: ctx => ctx.p0DataIndex >= 4 ? [6, 6] : undefined, // Dashed line for forecast
                        borderColor: ctx => ctx.p0DataIndex >= 4 ? '#f59e0b' : '#1e40af'
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: 4.5,
                                xMax: 4.5,
                                borderColor: 'rgba(0,0,0,0.5)',
                                borderWidth: 2,
                                label: {
                                    content: 'Today',
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Actions
    adjustBudget(category, amount) {
        alert(`Smart Adjustment: ${category} budget updated to ₹${amount.toLocaleString()} based on your spending patterns.`);
    }

    verifyTransaction() {
        alert('Opening transaction verification...');
    }

    saveMoney(category, amount) {
        alert(`Great! Moving ₹${amount} from ${category} surplus to Savings Goal.`);
    }
}

// Initialize
let predictionDashboard;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        predictionDashboard = new PredictionDashboard();
        predictionDashboard.init();
    });
} else {
    predictionDashboard = new PredictionDashboard();
    predictionDashboard.init();
}
