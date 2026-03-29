// frontend/assets/js/dashboard.js — FINAL FEATURE-COMPLETE VERSION

class FinBuddyDashboard {
    constructor() {
        this.transactions = [];
        this.summary = {};
        this.statusDiv = document.getElementById('status');
        this.splitChart = null;
        this.trendChart = null;
        this.currentSplitView = 'main'; // 'main', 'credit', or 'debit'
        this.expenseDistributionChart = null;
        this.currentSearchQuery = '';
        
        // Load budget limit from localStorage or default
        const savedLimit = localStorage.getItem('fb_budget_limit');
        this.monthlyBudgetLimit = savedLimit ? parseFloat(savedLimit) : 50000;
        this.transactionLimit = 10;
        
        // Setup budget input UI
        const budgetInput = document.getElementById('globalBudgetLimit');
        if(budgetInput) budgetInput.value = this.monthlyBudgetLimit;
    }

    async loadDashboard() {
        this.showSkeletons();

        try {
            // FINBUDDY UTILS HANDLES 401 EXPIRY AND TOKEN EXTRACTION
            const [transactionsData, summaryData] = await Promise.all([
                FinBuddyUtils.apiFetch('/api/transactions/'),
                FinBuddyUtils.apiFetch('/api/transactions/summary')
            ]);

            console.log("Loaded data:", { transactionsData, summaryData });

            this.transactions = transactionsData.transactions || [];
            this.summary = summaryData;

            this.updateKPIs();
            this.updateComplianceAlert();
            this.renderCharts();
            this.renderTransactionsTable();
            this.loadChartInsights();
            this.renderExpenseDistribution();
            
            // NEW FEATURES
            this.renderBudgetBars();
            this.renderHeatmap();
            this.checkAnomalies();

            FinBuddyUtils.showToast(`Loaded ${this.transactions.length} transactions successfully`, "success");

        } catch (error) {
            console.error("Dashboard load error:", error);
            // Ignore session expired as utils handles the redirect
            if (error.message !== 'Session expired') {
                FinBuddyUtils.showToast("Failed to load dashboard: " + error.message, "error");
                this.showFallbackData();
            }
        }
    }

    // ─────────────────────────────────────────────────────────
    // TIER 1: SKELETON LOADERS
    // ─────────────────────────────────────────────────────────
    showSkeletons() {
        document.getElementById('totalCredit').innerHTML = '<span class="skeleton d-inline-block w-75">Loading</span>';
        document.getElementById('totalDebit').innerHTML = '<span class="skeleton d-inline-block w-75">Loading</span>';
        document.getElementById('netBalance').innerHTML = '<span class="skeleton d-inline-block w-75">Loading</span>';
        
        const tbody = document.getElementById('transactionsTable');
        if (tbody) {
            tbody.innerHTML = Array(5).fill().map(() => `
                <tr>
                    <td><span class="skeleton d-inline-block w-75">Date</span></td>
                    <td><span class="skeleton d-inline-block w-100">Badge</span></td>
                    <td><span class="skeleton d-inline-block w-75">Amt</span></td>
                    <td><span class="skeleton d-inline-block w-100">Name</span></td>
                    <td><span class="skeleton d-inline-block w-75">Cat</span></td>
                    <td><span class="skeleton d-inline-block w-100">Insight</span></td>
                    <td><span class="skeleton d-inline-block w-50">Btn</span></td>
                </tr>
            `).join('');
        }
    }

    // ─────────────────────────────────────────────────────────
    // TIER 1: LIVE SEARCH / FILTER
    // ─────────────────────────────────────────────────────────
    filterTransactions(query) {
        this.currentSearchQuery = query.toLowerCase().trim();
        this.renderTransactionsTable(this.currentSplitView === 'main' ? null : (this.currentSplitView === 'credit' ? 'Credited' : 'Debited'));
    }

    // ─────────────────────────────────────────────────────────
    // TIER 1: DELETE TRANSACTION
    // ─────────────────────────────────────────────────────────
    async deleteTransaction(id) {
        if (!confirm("Are you sure you want to delete this transaction? This cannot be undone.")) return;

        try {
            await FinBuddyUtils.apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
            FinBuddyUtils.showToast("Transaction deleted successfully", "success");
            
            // Remove from local array and re-render everything
            this.transactions = this.transactions.filter(t => t.id !== id);
            
            // Recalculate summary locally to avoid full fetch (or just reload complete dashboard)
            this.loadDashboard(); // Refresh full dashboard to ensure server sync
        } catch (err) {
            FinBuddyUtils.showToast(err.message || "Failed to delete transaction", "error");
        }
    }

    // ─────────────────────────────────────────────────────────
    // TIER 2: BUDGET PLANNER
    // ─────────────────────────────────────────────────────────
    updateGlobalBudgetLimit(val) {
        const limit = parseFloat(val);
        if (isNaN(limit) || limit < 0) return;
        this.monthlyBudgetLimit = limit;
        localStorage.setItem('fb_budget_limit', limit);
        this.renderBudgetBars();
        FinBuddyUtils.showToast(`Monthly budget limit updated to ₹${limit.toLocaleString()}`, "success");
    }

    renderBudgetBars() {
        const container = document.getElementById('budgetBarsContainer');
        if (!container) return;

        const expenses = this.calculateMonthlyExpenseDistribution();
        const totalExpense = Object.values(expenses).reduce((a, b) => a + b, 0);
        
        // Add total summary bar
        let html = `
            <div class="budget-category-row mb-3 pb-2 border-bottom">
                <div class="budget-labels text-dark fw-bold">
                    <span>Total Monthly Expense</span>
                    <span>${FinBuddyUtils.formatCurrency(totalExpense)} / ${FinBuddyUtils.formatCurrency(this.monthlyBudgetLimit)}</span>
                </div>
                <div class="budget-progress" style="height: 12px">
                    ${this.getBudgetFillHTML(totalExpense, this.monthlyBudgetLimit)}
                </div>
            </div>
            <p class="text-muted small mb-2 fw-bold">Top Categories:</p>
        `;

        // Sort categories by amount
        const sortedCats = Object.entries(expenses)
            .filter(([_, amt]) => amt > 0)
            .sort((a, b) => b[1] - a[1]);

        if (sortedCats.length === 0) {
            html += `<p class="text-muted text-center py-3">No expenses recorded this month.</p>`;
        }

        // Generate per-category bars (assume 30% of global budget is limit per category for demo)
        const catLimit = this.monthlyBudgetLimit * 0.3;

        sortedCats.forEach(([cat, amt]) => {
            html += `
                <div class="budget-category-row">
                    <div class="budget-labels">
                        <span>${cat}</span>
                        <span>${FinBuddyUtils.formatCurrency(amt)} <span class="text-muted" style="font-size:10px">/ ${FinBuddyUtils.formatCurrency(catLimit)} max</span></span>
                    </div>
                    <div class="budget-progress">
                        ${this.getBudgetFillHTML(amt, catLimit)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getBudgetFillHTML(amount, limit) {
        let pct = (amount / limit) * 100;
        let colorClass = 'safe';
        
        if (pct >= 100) {
            pct = 100;
            colorClass = 'danger';
        } else if (pct > 75) {
            colorClass = 'warning';
        }
        
        return `<div class="budget-fill ${colorClass}" style="width: 0%" data-width="${pct}%"></div>`;
    }

    // ─────────────────────────────────────────────────────────
    // TIER 2: SPENDING HEATMAP CALENDAR
    // ─────────────────────────────────────────────────────────
    renderHeatmap() {
        const grid = document.getElementById('heatmapGrid');
        if (!grid) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        // Calculate days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Find what day of the week the 1st is (0 = Sunday, 1 = Monday, etc.)
        let firstDay = new Date(year, month, 1).getDay();
        // Convert so Monday is 0, Sunday is 6
        firstDay = firstDay === 0 ? 6 : firstDay - 1;

        // Group transactions by day
        const dailyTotals = {};
        let maxDaily = 0;
        
        this.transactions.forEach(txn => {
            if (txn.txn_type !== 'Debited') return;
            const d = new Date(txn.date);
            if (d.getMonth() === month && d.getFullYear() === year) {
                const day = d.getDate();
                dailyTotals[day] = (dailyTotals[day] || 0) + txn.amount;
                if (dailyTotals[day] > maxDaily) maxDaily = dailyTotals[day];
            }
        });

        let html = '';
        
        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="heatmap-cell" style="opacity: 0.1"></div>`;
        }

        // Cells for days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const amount = dailyTotals[day] || 0;
            let bg = 'var(--border-color)'; // Empty
            let tooltip = `No spending`;
            
            if (amount > 0) {
                // Color scale based on intensity relative to max spend
                const intensity = amount / maxDaily;
                if (intensity < 0.25) bg = '#a7f3d0'; // Light green
                else if (intensity < 0.5) bg = '#34d399'; // Green
                else if (intensity < 0.8) bg = '#fbbf24'; // Yellow/Orange
                else bg = '#ef4444'; // Red (High spend)
                
                tooltip = `${FinBuddyUtils.formatCurrency(amount)}`;
            }

            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const border = isToday ? 'border: 2px solid var(--primary-color)' : '';

            html += `
                <div class="heatmap-cell ${amount > 0 ? 'has-data' : ''}" style="background: ${bg}; ${border}">
                    ${amount > 0 ? `<div class="heatmap-tooltip">Day ${day}: ${tooltip}</div>` : ''}
                    ${isToday ? `<div style="position:absolute;bottom:2px;right:2px;width:4px;height:4px;background:var(--primary-color);border-radius:50%"></div>` : ''}
                </div>
            `;
        }

        grid.innerHTML = html;
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        document.getElementById('heatmapMonth').textContent = `${monthNames[month]} ${year}`;
    }

    // ─────────────────────────────────────────────────────────
    // TIER 2: ANOMALY ALERT BANNER
    // ─────────────────────────────────────────────────────────
    checkAnomalies() {
        const banner = document.getElementById('anomalyBanner');
        const msg = document.getElementById('anomalyMessage');
        if (!banner || !msg) return;

        // Skip if less than 5 transactions
        const debits = this.transactions.filter(t => t.txn_type === 'Debited');
        if (debits.length < 5) return;

        // Simple algorithm: find transactions that are > 3x the average of their category
        const catTotals = {};
        const catCounts = {};
        
        debits.forEach(t => {
            const c = t.category || 'Other';
            catTotals[c] = (catTotals[c] || 0) + t.amount;
            catCounts[c] = (catCounts[c] || 0) + 1;
        });

        // Check recent 3 transactions for anomalies
        const recent = debits.slice(0, 3);
        let anomalyFound = null;

        for (const t of recent) {
            const c = t.category || 'Other';
            if (catCounts[c] > 2) {
                // exclude current txn from average
                const avg = (catTotals[c] - t.amount) / (catCounts[c] - 1);
                if (avg > 500 && t.amount > (avg * 3)) { // Only flag if average is meaningful (>500)
                    anomalyFound = t;
                    break;
                }
            }
        }

        // Hardcoded anomaly logic for showcase if Anomaly Model flagged it from backend
        const aiAnomaly = debits.find(t => t.ai_insight && t.ai_insight.toLowerCase().includes('unusual'));
        
        const target = aiAnomaly || anomalyFound;

        if (target) {
            msg.innerHTML = `Action required: A high transaction of <strong>${FinBuddyUtils.formatCurrency(target.amount)}</strong> at <strong>${target.counterparty}</strong> was detected. This is unusually high for the ${target.category} category.`;
            banner.classList.remove('d-none');
        } else {
            banner.classList.add('d-none');
        }
    }


    /* ════════════════════════════════════════════════════════════
       REMAINING DASHBOARD CORE (Untouched logic with apiFetch added)
       ════════════════════════════════════════════════════════════ */

    showFallbackData() {
        console.log("Showing fallback data...");
        this.summary = { total_credit: 150000, total_debit: 75000, net_balance: 75000, ytd_credit: 450000, latest_alert: "⚠️ WARNING: Approaching GST limit" };
        this.transactions = [
            { id: "txn_1", date: "2024-01-15T10:30:00", txn_type: "Credited", amount: 25000, counterparty: "Salary", category: "Income", ai_insight: "Monthly salary credited" },
            { id: "txn_2", date: "2024-01-16T14:20:00", txn_type: "Debited", amount: 1500, counterparty: "Petrol Pump", category: "Travel", ai_insight: "Fuel expense" }
        ];
        this.updateKPIs();
        this.updateComplianceAlert();
        this.renderCharts();
        this.renderTransactionsTable();
        FinBuddyUtils.showToast(`Loaded sample transactions (fallback mode)`, "warning");
    }

    updateKPIs() {
        document.getElementById('totalCredit').textContent = FinBuddyUtils.formatCurrency(this.summary.total_credit);
        document.getElementById('totalDebit').textContent = FinBuddyUtils.formatCurrency(this.summary.total_debit);
        document.getElementById('netBalance').textContent = FinBuddyUtils.formatCurrency(this.summary.net_balance);

        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards.forEach((card, index) => {
            card.classList.remove('stagger-item', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4');
            void card.offsetWidth;
            card.classList.add('stagger-item', `stagger-${(index % 4) + 1}`);
        });
    }

    updateComplianceAlert() {
        const banner = document.getElementById('complianceAlert');
        const msg = document.getElementById('alertMessage');
        if (this.summary.latest_alert) {
            banner.classList.remove('d-none');
            msg.textContent = this.summary.latest_alert;
            banner.className = `compliance-alert alert ${this.summary.latest_alert.includes('CRITICAL') ? 'alert-danger' : 'alert-warning'}`;
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

        const titleEl = document.getElementById('splitChartTitle');
        const backBtn = document.getElementById('splitChartBackBtn');

        if (this.currentSplitView === 'main') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-chart-pie me-2"></i>Expense Split';
            if (backBtn) backBtn.style.display = 'none';
            this.renderMainSplitChart(ctx);
            this.renderTransactionsTable();
        } else if (this.currentSplitView === 'credit') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-arrow-up me-2 text-success"></i>Credit Breakdown';
            if (backBtn) backBtn.style.display = 'inline-block';
            this.renderCategoryBreakdown(ctx, 'Credited');
            this.renderTransactionsTable('Credited');
        } else if (this.currentSplitView === 'debit') {
            if (titleEl) titleEl.innerHTML = '<i class="fas fa-arrow-down me-2 text-danger"></i>Debit Breakdown';
            if (backBtn) backBtn.style.display = 'inline-block';
            this.renderCategoryBreakdown(ctx, 'Debited');
            this.renderTransactionsTable('Debited');
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
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderColor: '#fff', borderWidth: 2, hoverOffset: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                onClick: (evt, activeElements) => {
                    if (activeElements.length > 0) {
                        self.currentSplitView = activeElements[0].index === 0 ? 'credit' : 'debit';
                        self.renderSplitChart();
                    }
                },
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.label + ': ' + FinBuddyUtils.formatCurrency(context.parsed)
                        }
                    }
                }
            }
        });
    }

    renderCategoryBreakdown(ctx, txnType) {
        const categoryData = this.calculateCategoryBreakdown(txnType);
        const colors = this.generateColors(categoryData.labels.length);

        this.splitChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{ data: categoryData.data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2, hoverOffset: 8 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '60%',
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${FinBuddyUtils.formatCurrency(context.parsed)} (${percentage}%)`;
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
        const sorted = labels.map((label, i) => ({ label, amount: data[i] })).sort((a, b) => b.amount - a.amount);
        return { labels: sorted.map(item => item.label), data: sorted.map(item => item.amount) };
    }

    generateColors(count) {
        const colors = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'];
        while (colors.length < count) {
            colors.push(`hsl(${(colors.length * 137.5) % 360}, 70%, 50%)`);
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
        const allLabels = [...monthlyData.map(x => x.month), prediction.month];
        const historicalData = monthlyData.map(x => x.netBalance);
        const predictionData = [...new Array(monthlyData.length).fill(null), prediction.netBalance];

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Historical Net Balance', data: historicalData, borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13,110,253,0.1)', borderWidth: 3, tension: 0.4, fill: true,
                        pointRadius: 5, pointHoverRadius: 7
                    },
                    {
                        label: 'Predicted', data: predictionData, borderColor: '#ffc107',
                        backgroundColor: 'rgba(255,193,7,0.1)', borderWidth: 3, borderDash: [10, 5],
                        tension: 0.4, fill: false, pointRadius: 6, pointHoverRadius: 8, pointStyle: 'star'
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return value === null ? '' : `${context.dataset.label}: ${FinBuddyUtils.formatCurrency(value)}`;
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true, ticks: { callback: (value) => '₹' + value.toLocaleString('en-IN') } } }
            }
        });
    }

    calculateMonthlyTrend() {
        const monthsData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            let credit = 0, debit = 0;

            this.transactions.forEach(txn => {
                const txnDate = new Date(txn.date);
                if (`${txnDate.getFullYear()}-${String(txnDate.getMonth() + 1).padStart(2, '0')}` === monthKey) {
                    if (txn.txn_type === 'Credited') credit += txn.amount;
                    else if (txn.txn_type === 'Debited') debit += txn.amount;
                }
            });

            monthsData.push({ month: monthName, fullDate: date, credit, debit, netBalance: credit - debit });
        }
        return monthsData;
    }

    predictNextMonth(monthlyData) {
        const recent = monthlyData.slice(-3);
        const avgCredit = recent.reduce((s, m) => s + m.credit, 0) / recent.length;
        const avgDebit = recent.reduce((s, m) => s + m.debit, 0) / recent.length;
        const trend = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 1].netBalance - monthlyData[monthlyData.length - 2].netBalance : 0;
        
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        return {
            month: nextMonth.toLocaleDateString('en-US', { month: 'short' }) + ' (Pred)',
            fullDate: nextMonth, credit: Math.round(avgCredit), debit: Math.round(avgDebit), netBalance: Math.round(avgCredit - avgDebit),
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable', isPrediction: true
        };
    }

    async loadChartInsights() {
        try {
            const monthlyData = this.calculateMonthlyTrend();
            const categoryData = {};
            this.transactions.forEach(t => { if (t.txn_type === 'Debited') categoryData[t.category] = (categoryData[t.category] || 0) + t.amount; });

            const data = await FinBuddyUtils.apiFetch('/api/ai/chart-insights', {
                method: 'POST',
                body: { data_points: monthlyData.map(x => x.netBalance), labels: monthlyData.map(x => x.month), category_data: categoryData }
            });

            if (data && data.success) {
                document.getElementById('aiInsightsRow').style.display = 'flex';
                document.getElementById('trendInsight').textContent = data.trend_insight;
                document.getElementById('categoryInsights').innerHTML = data.category_insights.map(i => `<li>${i}</li>`).join('');
            }
        } catch (error) {
            console.error("AI Insights skipped");
        }
    }

    renderTransactionsTable(filterType = null) {
        let fetchList = this.transactions;

        // Apply type filter
        if (filterType) {
            fetchList = fetchList.filter(txn => txn.txn_type === filterType);
        }

        // Apply search query filter
        if (this.currentSearchQuery) {
            fetchList = fetchList.filter(txn => {
                const searchStr = `${txn.counterparty} ${txn.category} ${txn.amount} ${txn.ai_insight}`.toLowerCase();
                return searchStr.includes(this.currentSearchQuery);
            });
        }

        const countSpan = document.getElementById('transactionCount');
        if (countSpan) countSpan.textContent = `${fetchList.length} transactions`;

        const tbody = document.getElementById('transactionsTable');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (fetchList.length === 0) {
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-3 d-block"></i>No transactions found.</td></tr>`;
            return;
        }

        const displayTransactions = fetchList.slice(0, this.transactionLimit);
        if (loadMoreContainer) loadMoreContainer.style.display = fetchList.length > this.transactionLimit ? 'block' : 'none';

        displayTransactions.forEach(txn => {
            const row = document.createElement('tr');
            const color = txn.txn_type === 'Credited' ? 'text-success' : 'text-danger';
            const badge = txn.txn_type === 'Credited' ? 'bg-success' : 'bg-danger';
            const icon = txn.txn_type === 'Credited' ? 'fa-arrow-up' : 'fa-arrow-down';

            row.innerHTML = `
                <td>${FinBuddyUtils.formatDate(txn.date)}</td>
                <td><span class="badge ${badge}"><i class="fas ${icon} me-1"></i>${txn.txn_type}</span></td>
                <td class="fw-bold ${color}">${FinBuddyUtils.formatCurrency(txn.amount)}</td>
                <td>${txn.counterparty}</td>
                <td><span class="badge bg-secondary">${txn.category}</span></td>
                <td><small class="text-muted">${txn.ai_insight || 'No insight'}</small></td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="dashboard.generateInvoice('${txn.id}')" title="Invoice">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-txn" onclick="dashboard.deleteTransaction('${txn.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Setup fill animation for budget bars after DOM update
        setTimeout(() => {
            document.querySelectorAll('.budget-fill').forEach(el => {
                el.style.width = el.getAttribute('data-width');
            });
        }, 50);
    }

    loadMoreTransactions() {
        this.transactionLimit += 10;
        this.renderTransactionsTable(this.currentSplitView === 'main' ? null : (this.currentSplitView === 'credit' ? 'Credited' : 'Debited'));
    }

    async generateInvoice(transactionId) {
        const txn = this.transactions.find(t => t.id === transactionId);
        if (!txn) return FinBuddyUtils.showToast("Transaction not found", "error");

        FinBuddyUtils.showToast("Generating invoice...", "info");

        try {
            await FinBuddyUtils.apiFetch('/api/invoices/generate', {
                method: 'POST', body: txn
            });
            FinBuddyUtils.showToast("Invoice generated successfully!", "success");
        } catch (err) {
            FinBuddyUtils.showToast(err.message || "Failed to generate invoice", "error");
        }
    }

    // ===== MONTHLY EXPENSE DISTRIBUTION SECTION =====
    renderExpenseDistribution() {
        this.renderExpenseDistributionChart();
        this.renderExpenseTable();
    }

    calculateMonthlyExpenseDistribution() {
        const categories = { 'Food': 0, 'Travel': 0, 'Shopping': 0, 'Subscriptions': 0, 'EMI': 0, 'Medical': 0 };
        const now = new Date();
        const curMonth = now.getMonth(), curYear = now.getFullYear();

        this.transactions.forEach(txn => {
            if (txn.txn_type !== 'Debited') return;
            const d = new Date(txn.date);
            if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
                const c = (txn.category || 'Shopping').toLowerCase();
                if (c.includes('food') || c.includes('restaurant')) categories['Food'] += txn.amount;
                else if (c.includes('travel') || c.includes('transport') || c.includes('fuel')) categories['Travel'] += txn.amount;
                else if (c.includes('subscription') || c.includes('netflix')) categories['Subscriptions'] += txn.amount;
                else if (c.includes('emi') || c.includes('loan')) categories['EMI'] += txn.amount;
                else if (c.includes('medical') || c.includes('health')) categories['Medical'] += txn.amount;
                else categories['Shopping'] += txn.amount;
            }
        });
        return categories;
    }

    renderExpenseDistributionChart() {
        const ctx = document.getElementById('expenseDistributionChart');
        if (!ctx) return;
        if (this.expenseDistributionChart instanceof Chart)  this.expenseDistributionChart.destroy();

        const expenseData = this.calculateMonthlyExpenseDistribution();
        const data = Object.values(expenseData);
        if (data.reduce((a, b) => a + b, 0) === 0) return; // Prevent empty chart render

        this.expenseDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(expenseData),
                datasets: [{ data: data, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'], borderColor: '#fff', borderWidth: 3, hoverOffset: 15 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'right', labels: { padding: 20, boxWidth: 15 } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                return ` ${context.label}: ${FinBuddyUtils.formatCurrency(context.parsed)} (${((context.parsed/total)*100).toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderExpenseTable() {
        const tbody = document.getElementById('expenseTableBody');
        if (!tbody) return;

        const data = this.calculateMonthlyExpenseDistribution();
        const total = Object.values(data).reduce((a, b) => a + b, 0);

        if (total === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">No expenses this month.</td></tr>`;
            return;
        }

        const icons = { 'Food': 'fa-utensils text-danger', 'Travel': 'fa-plane text-info', 'Shopping': 'fa-shopping-bag text-warning', 'Subscriptions': 'fa-play-circle text-success', 'EMI': 'fa-home text-primary', 'Medical': 'fa-heartbeat text-secondary' };
        
        tbody.innerHTML = Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => `
            <tr>
                <td><i class="fas ${icons[cat] || 'fa-tag'} me-2"></i><strong>${cat}</strong></td>
                <td class="text-end fw-bold text-danger">${FinBuddyUtils.formatCurrency(amt)}</td>
                <td class="text-end"><span class="badge bg-light text-dark">${((amt/total)*100).toFixed(1)}%</span></td>
            </tr>
        `).join('');
    }
}

// Global initialization
const dashboard = new FinBuddyDashboard();
document.addEventListener('DOMContentLoaded', () => dashboard.loadDashboard());
