// frontend/assets/js/dashboard.js — FINAL FIXED VERSION

class FinBuddyDashboard {
    constructor() {
        this.transactions = [];
        this.summary = {};
        this.statusDiv = document.getElementById('status');
        this.splitChart = null;
        this.trendChart = null;
        this.currentSplitView = 'main'; // 'main', 'credit', or 'debit'
        this.expenseDistributionChart = null;
        this.monthlyBudgetLimit = 50000; // Default budget limit in INR
    }

    async loadDashboard() {
        this.showLoading('Loading dashboard data...');

        try {
            console.log("🌐 Fetching dashboard data...");

            // FINAL FIXED ENDPOINTS
            const [transactionsRes, summaryRes] = await Promise.all([
                fetch('/api/transactions/').catch(() => { throw new Error('Transactions API not reachable') }),
                fetch('/api/transactions/summary').catch(() => { throw new Error('Summary API not reachable') })
            ]);

            console.log("API Responses:", transactionsRes, summaryRes);

            // Validate content-type
            const txType = transactionsRes.headers.get('content-type') || "";
            const smType = summaryRes.headers.get('content-type') || "";

            if (!txType.includes('application/json')) {
                const txt = await transactionsRes.text();
                console.error("❌ Non-JSON TX response:", txt);
                throw new Error("Transactions API returned non-JSON response");
            }

            if (!smType.includes('application/json')) {
                const txt = await summaryRes.text();
                console.error("❌ Non-JSON summary response:", txt);
                throw new Error("Summary API returned non-JSON response");
            }

            if (!transactionsRes.ok) throw new Error(`Transactions API error: ${transactionsRes.status}`);
            if (!summaryRes.ok) throw new Error(`Summary API error: ${summaryRes.status}`);

            const transactionsData = await transactionsRes.json();
            const summaryData = await summaryRes.json();

            console.log("Loaded data:", { transactionsData, summaryData });

            this.transactions = transactionsData.transactions || [];
            this.summary = summaryData;

            this.updateKPIs();
            this.updateComplianceAlert();
            this.renderCharts();
            this.renderTransactionsTable();
            this.loadChartInsights();
            this.renderExpenseDistribution(); // New section
            this.checkBudgetLimit(); // Check budget on load

            this.showSuccess(`Loaded ${this.transactions.length} transactions successfully`);

        } catch (error) {
            console.error("Dashboard load error:", error);
            this.showError("Failed to load dashboard: " + error.message);
            this.showFallbackData();
        }
    }

    showFallbackData() {
        console.log("Showing fallback data...");

        this.summary = {
            total_credit: 150000,
            total_debit: 75000,
            net_balance: 75000,
            ytd_credit: 450000,
            latest_alert: "⚠️ WARNING: Approaching GST limit"
        };

        this.transactions = [
            {
                id: "txn_1",
                date: "2024-01-15T10:30:00",
                txn_type: "Credited",
                amount: 25000,
                counterparty: "Salary",
                category: "Income",
                ai_insight: "Monthly salary credited"
            },
            {
                id: "txn_2",
                date: "2024-01-16T14:20:00",
                txn_type: "Debited",
                amount: 1500,
                counterparty: "Petrol Pump",
                category: "Travel",
                ai_insight: "Fuel expense"
            }
        ];

        this.updateKPIs();
        this.updateComplianceAlert();
        this.renderCharts();
        this.renderTransactionsTable();

        this.showSuccess(`Loaded ${this.transactions.length} sample transactions (fallback)`);
    }

    updateKPIs() {
        document.getElementById('totalCredit').textContent = this.formatCurrency(this.summary.total_credit);
        document.getElementById('totalDebit').textContent = this.formatCurrency(this.summary.total_debit);
        document.getElementById('netBalance').textContent = this.formatCurrency(this.summary.net_balance);

        // animate KPI cards on refresh
        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards.forEach((card, index) => {
            card.classList.remove('stagger-item', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4');
            void card.offsetWidth; // force reflow to restart animation
            card.classList.add('stagger-item', `stagger-${(index % 4) + 1}`);
        });
    }

    updateComplianceAlert() {
        const banner = document.getElementById('complianceAlert');
        const msg = document.getElementById('alertMessage');

        if (this.summary.latest_alert) {
            banner.classList.remove('d-none');
            msg.textContent = this.summary.latest_alert;

            if (this.summary.latest_alert.includes('CRITICAL')) {
                banner.className = 'compliance-alert alert alert-danger';
            } else {
                banner.className = 'compliance-alert alert alert-warning';
            }
        } else {
            banner.classList.add('d-none');
        }
    }

    renderCharts() {
        this.renderSplitChart();
        this.renderTrendChart();
    }

    renderSplitChart() {
        const ctx = document.getElementById('splitChart');
        if (!ctx) return;

        if (this.splitChart instanceof Chart) this.splitChart.destroy();

        // Update title and back button based on view
        const titleEl = document.getElementById('splitChartTitle');
        const backBtn = document.getElementById('splitChartBackBtn');

        if (this.currentSplitView === 'main') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-chart-pie me-2"></i>Expense Split';
            if (backBtn) backBtn.style.display = 'none';
            this.renderMainSplitChart(ctx);
            this.renderTransactionsTable(); // Show all transactions
        } else if (this.currentSplitView === 'credit') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-arrow-up me-2 text-success"></i>Credit Breakdown';
            if (backBtn) backBtn.style.display = 'inline-block';
            this.renderCategoryBreakdown(ctx, 'Credited');
            this.renderTransactionsTable('Credited'); // Show only credits
        } else if (this.currentSplitView === 'debit') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-arrow-down me-2 text-danger"></i>Debit Breakdown';
            if (backBtn) backBtn.style.display = 'inline-block';
            this.renderCategoryBreakdown(ctx, 'Debited');
            this.renderTransactionsTable('Debited'); // Show only debits
        }
    }

    renderMainSplitChart(ctx) {
        const self = this;
        this.splitChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Total Credit', 'Total Debit'],
                datasets: [{
                    data: [this.summary.total_credit, this.summary.total_debit],
                    backgroundColor: ['#198754', '#dc3545'],
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                onClick: function (evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        if (index === 0) {
                            self.currentSplitView = 'credit';
                        } else {
                            self.currentSplitView = 'debit';
                        }
                        self.renderSplitChart();
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return context.label + ': ' + new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR'
                                }).format(context.parsed);
                            }
                        }
                    }
                }
            }
        });
    }

    renderCategoryBreakdown(ctx, txnType) {
        const categoryData = this.calculateCategoryBreakdown(txnType);
        const self = this;

        // Generate distinct colors for categories
        const colors = this.generateColors(categoryData.labels.length);

        this.splitChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': ' + new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR'
                                }).format(context.parsed) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    calculateCategoryBreakdown(txnType) {
        const categoryMap = {};

        this.transactions.forEach(txn => {
            if (txn.txn_type === txnType) {
                const category = txn.category || 'Uncategorized';
                categoryMap[category] = (categoryMap[category] || 0) + txn.amount;
            }
        });

        const labels = Object.keys(categoryMap);
        const data = Object.values(categoryMap);

        // Sort by amount descending
        const sorted = labels.map((label, i) => ({ label, amount: data[i] }))
            .sort((a, b) => b.amount - a.amount);

        return {
            labels: sorted.map(item => item.label),
            data: sorted.map(item => item.amount)
        };
    }

    generateColors(count) {
        const colors = [
            '#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545',
            '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0',
            '#6c757d', '#f8f9fa', '#343a40', '#e83e8c', '#17a2b8'
        ];

        // If we need more colors, generate them
        while (colors.length < count) {
            const hue = (colors.length * 137.508) % 360;
            colors.push(`hsl(${hue}, 70%, 50%)`);
        }

        return colors.slice(0, count);
    }

    backToMainSplit() {
        this.currentSplitView = 'main';
        this.renderSplitChart();
    }

    renderTrendChart() {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        if (this.trendChart instanceof Chart) this.trendChart.destroy();

        const monthlyData = this.calculateMonthlyTrend();
        const prediction = this.predictNextMonth(monthlyData);

        // Combine historical and prediction
        const allLabels = [...monthlyData.map(x => x.month), prediction.month];
        const historicalData = monthlyData.map(x => x.netBalance);
        const predictionData = new Array(monthlyData.length).fill(null);
        predictionData.push(prediction.netBalance);

        const self = this;

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Historical Net Balance',
                        data: historicalData,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13,110,253,0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Predicted',
                        data: predictionData,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255,193,7,0.1)',
                        borderWidth: 3,
                        borderDash: [10, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointStyle: 'star'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: function (evt, activeElements) {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        if (index < monthlyData.length) {
                            self.showMonthDetail(monthlyData[index]);
                        } else {
                            self.showPredictionDetail(prediction);
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.parsed.y;
                                if (value === null) return '';
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR'
                                }).format(value);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    }

    calculateMonthlyTrend() {
        // Get last 6 months
        const monthsData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            const year = date.getFullYear();
            const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            let credit = 0;
            let debit = 0;

            this.transactions.forEach(txn => {
                const txnDate = new Date(txn.date);
                const txnMonthKey = `${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}`;

                if (txnMonthKey === monthKey) {
                    if (txn.txn_type === 'Credited') {
                        credit += txn.amount;
                    } else if (txn.txn_type === 'Debited') {
                        debit += txn.amount;
                    }
                }
            });

            monthsData.push({
                month: monthName,
                fullDate: date,
                credit: credit,
                debit: debit,
                netBalance: credit - debit
            });
        }

        return monthsData;
    }

    predictNextMonth(monthlyData) {
        // Simple moving average prediction
        const recentMonths = monthlyData.slice(-3); // Last 3 months
        const avgCredit = recentMonths.reduce((sum, m) => sum + m.credit, 0) / recentMonths.length;
        const avgDebit = recentMonths.reduce((sum, m) => sum + m.debit, 0) / recentMonths.length;
        const predictedNet = avgCredit - avgDebit;

        // Calculate trend
        const trend = monthlyData.length >= 2 ?
            monthlyData[monthlyData.length - 1].netBalance - monthlyData[monthlyData.length - 2].netBalance : 0;

        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        return {
            month: nextMonth.toLocaleDateString('en-US', { month: 'short' }) + ' (Pred)',
            fullDate: nextMonth,
            credit: Math.round(avgCredit),
            debit: Math.round(avgDebit),
            netBalance: Math.round(predictedNet),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            isPrediction: true
        };
    }

    showMonthDetail(monthData) {
        const message = `
📅 ${monthData.month} Details:

💰 Credit: ${this.formatCurrency(monthData.credit)}
💸 Debit: ${this.formatCurrency(monthData.debit)}
📊 Net Balance: ${this.formatCurrency(monthData.netBalance)}
        `.trim();

        alert(message);
    }

    showPredictionDetail(prediction) {
        const trendIcon = prediction.trend === 'increasing' ? '📈' :
            prediction.trend === 'decreasing' ? '📉' : '➡️';

        const message = `
🔮 ${prediction.month} Prediction:

💰 Expected Credit: ${this.formatCurrency(prediction.credit)}
💸 Expected Debit: ${this.formatCurrency(prediction.debit)}
📊 Predicted Net: ${this.formatCurrency(prediction.netBalance)}
${trendIcon} Trend: ${prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)}

⚠️ This is a simple prediction based on your last 3 months average.
        `.trim();

        alert(message);
    }

    async loadChartInsights() {
        try {
            const monthlyData = this.calculateMonthlyTrend();
            const labels = monthlyData.map(x => x.month);
            const dataPoints = monthlyData.map(x => x.netBalance);

            // Calculate category data from transactions
            const categoryData = {};
            this.transactions.forEach(t => {
                if (t.txn_type === 'Debited') {
                    categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
                }
            });

            const response = await fetch('/api/ai/chart-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data_points: dataPoints,
                    labels: labels,
                    category_data: categoryData
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    document.getElementById('aiInsightsRow').style.display = 'flex';
                    document.getElementById('trendInsight').textContent = data.trend_insight;

                    const catList = document.getElementById('categoryInsights');
                    catList.innerHTML = data.category_insights.map(i => `<li>${i}</li>`).join('');
                }
            }
        } catch (error) {
            console.error("Failed to load chart insights:", error);
        }
    }

    renderTransactionsTable(filterType = null) {
        // Filter transactions based on type if specified
        const filteredTransactions = filterType
            ? this.transactions.filter(txn => txn.txn_type === filterType)
            : this.transactions;

        const countSpan = document.getElementById('transactionCount');
        if (countSpan) {
            const filterText = filterType ? ` ${filterType.toLowerCase()}` : '';
            countSpan.textContent = `${filteredTransactions.length}${filterText} transactions`;
        }

        const tbody = document.getElementById('transactionsTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (filteredTransactions.length === 0) {
            const message = filterType
                ? `No ${filterType.toLowerCase()} transactions found.`
                : 'No transactions found.';
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-3 d-block"></i>
                        ${message} <a href="/">Add your first transaction</a>
                    </td>
                </tr>
            `;
            return;
        }

        filteredTransactions.forEach(txn => {
            const row = document.createElement('tr');

            const dateStr = this.formatDate(txn.date);
            const color = txn.txn_type === 'Credited' ? 'text-success' : 'text-danger';
            const badge = txn.txn_type === 'Credited' ? 'bg-success' : 'bg-danger';
            const icon = txn.txn_type === 'Credited' ? 'fa-arrow-up' : 'fa-arrow-down';

            row.innerHTML = `
                <td>${dateStr}</td>
                <td>
                    <span class="badge ${badge}">
                        <i class="fas ${icon} me-1"></i>${txn.txn_type}
                    </span>
                </td>
                <td class="fw-bold ${color}">
                    ${this.formatCurrency(txn.amount)}
                </td>
                <td>${txn.counterparty}</td>
                <td><span class="badge bg-secondary">${txn.category}</span></td>
                <td><small class="text-muted">${txn.ai_insight || 'No insight'}</small></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.generateInvoice('${txn.id}')">
                        <i class="fas fa-file-invoice me-1"></i>Invoice
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    async generateInvoice(transactionId) {
        const txn = this.transactions.find(t => t.id === transactionId);
        if (!txn) return this.showError("Transaction not found");

        this.showLoading("Generating invoice...");

        try {
            const response = await fetch('/api/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txn)
            });

            const raw = await response.text();
            let data = {};
            try { data = JSON.parse(raw); }
            catch { throw new Error("Invalid JSON from invoice API"); }

            if (!response.ok) throw new Error(data.detail || "Invoice generation failed");

            this.showSuccess("Invoice generated successfully!");

        } catch (err) {
            this.showError("Failed to generate invoice: " + err.message);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return isNaN(date) ? "Invalid Date" : date.toLocaleString('en-IN');
    }

    showLoading(msg) {
        this.statusDiv.className = 'alert alert-info mt-3';
        this.statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${msg}`;
        this.statusDiv.classList.remove('d-none');
    }

    showSuccess(msg) {
        this.statusDiv.className = 'alert alert-success mt-3';
        this.statusDiv.innerHTML = `<i class="fas fa-check-circle me-2"></i>${msg}`;
        this.statusDiv.classList.remove('d-none');
        setTimeout(() => this.statusDiv.classList.add('d-none'), 5000);
    }

    showError(msg) {
        this.statusDiv.className = 'alert alert-danger mt-3';
        this.statusDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${msg}`;
        this.statusDiv.classList.remove('d-none');
    }

    // ===== MONTHLY EXPENSE DISTRIBUTION SECTION =====

    renderExpenseDistribution() {
        this.renderExpenseDistributionChart();
        this.renderExpenseTable();
    }

    calculateMonthlyExpenseDistribution() {
        const categories = {
            'Food': 0,
            'Travel': 0,
            'Shopping': 0,
            'Subscriptions': 0,
            'EMI': 0,
            'Medical': 0
        };

        // Get current month transactions
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        this.transactions.forEach(txn => {
            if (txn.txn_type !== 'Debited') return;

            const txnDate = new Date(txn.date);
            if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
                const category = txn.category || 'Shopping';

                // Map transaction categories to expense categories
                if (category.toLowerCase().includes('food') || category.toLowerCase().includes('restaurant')) {
                    categories['Food'] += txn.amount;
                } else if (category.toLowerCase().includes('travel') || category.toLowerCase().includes('transport')) {
                    categories['Travel'] += txn.amount;
                } else if (category.toLowerCase().includes('shopping') || category.toLowerCase().includes('retail')) {
                    categories['Shopping'] += txn.amount;
                } else if (category.toLowerCase().includes('subscription') || category.toLowerCase().includes('netflix') || category.toLowerCase().includes('spotify')) {
                    categories['Subscriptions'] += txn.amount;
                } else if (category.toLowerCase().includes('emi') || category.toLowerCase().includes('loan')) {
                    categories['EMI'] += txn.amount;
                } else if (category.toLowerCase().includes('medical') || category.toLowerCase().includes('health')) {
                    categories['Medical'] += txn.amount;
                } else {
                    // Default to shopping for uncategorized
                    categories['Shopping'] += txn.amount;
                }
            }
        });

        return categories;
    }

    renderExpenseDistributionChart() {
        const ctx = document.getElementById('expenseDistributionChart');
        if (!ctx) return;

        if (this.expenseDistributionChart instanceof Chart) {
            this.expenseDistributionChart.destroy();
        }

        const expenseData = this.calculateMonthlyExpenseDistribution();
        const labels = Object.keys(expenseData);
        const data = Object.values(expenseData);
        const total = data.reduce((sum, val) => sum + val, 0);

        // Generate vibrant colors for each category
        const colors = [
            '#FF6384', // Food - Pink
            '#36A2EB', // Travel - Blue
            '#FFCE56', // Shopping - Yellow
            '#4BC0C0', // Subscriptions - Teal
            '#9966FF', // EMI - Purple
            '#FF9F40'  // Medical - Orange
        ];

        this.expenseDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR'
                                }).format(value)} (${percentage}%)`;
                            }
                        },
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8
                    }
                }
            }
        });
    }

    renderExpenseTable() {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;

        const expenseData = this.calculateMonthlyExpenseDistribution();
        const total = Object.values(expenseData).reduce((sum, val) => sum + val, 0);

        // Sort by amount descending
        const sorted = Object.entries(expenseData)
            .sort((a, b) => b[1] - a[1]);

        tbody.innerHTML = '';

        sorted.forEach(([category, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            const row = document.createElement('tr');

            row.innerHTML = `
                <td class="fw-bold">${category}</td>
                <td class="text-end">${this.formatCurrency(amount)}</td>
                <td class="text-end">
                    <span class="badge bg-primary">${percentage}%</span>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Add total row
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-active fw-bold';
        totalRow.innerHTML = `
            <td>TOTAL</td>
            <td class="text-end">${this.formatCurrency(total)}</td>
            <td class="text-end">
                <span class="badge bg-success">100%</span>
            </td>
        `;
        tbody.appendChild(totalRow);
    }

    checkBudgetLimit() {
        const expenseData = this.calculateMonthlyExpenseDistribution();
        const totalExpenses = Object.values(expenseData).reduce((sum, val) => sum + val, 0);

        if (totalExpenses > this.monthlyBudgetLimit) {
            this.showBudgetAlert(totalExpenses);
        }
    }

    showBudgetAlert(totalExpenses) {
        const modal = document.getElementById('budgetAlertModal');
        if (!modal) return;

        const exceeded = totalExpenses - this.monthlyBudgetLimit;
        const percentageOver = ((exceeded / this.monthlyBudgetLimit) * 100).toFixed(1);

        document.getElementById('budgetTotalExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('budgetLimit').textContent = this.formatCurrency(this.monthlyBudgetLimit);
        document.getElementById('budgetExceeded').textContent = this.formatCurrency(exceeded);
        document.getElementById('budgetPercentage').textContent = percentageOver;

        // Show modal using Bootstrap
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    destroyCharts() {
        if (this.splitChart) this.splitChart.destroy();
        if (this.trendChart) this.trendChart.destroy();
        if (this.expenseDistributionChart) this.expenseDistributionChart.destroy();
    }
}

const dashboard = new FinBuddyDashboard();

document.addEventListener("DOMContentLoaded", () => dashboard.loadDashboard());
window.addEventListener("beforeunload", () => dashboard.destroyCharts());
