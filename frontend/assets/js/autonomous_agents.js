/**
 * Autonomous Agents Dashboard - Frontend Integration
 * Displays real-time status of 8 autonomous AI agents
 */

class AutonomousAgentsDashboard {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/agents';
        this.refreshInterval = 30000; // 30 seconds
        this.intervalId = null;
    }

    /**
     * Initialize the agents dashboard
     */
    async init() {
        await this.loadAgentStatus();
        await this.loadNotifications();
        this.startAutoRefresh();
        this.setupEventListeners();
        console.log('🤖 Autonomous Agents Dashboard initialized');
    }

    /**
     * Load agent status from API
     */
    async loadAgentStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            const data = await response.json();

            if (data.success) {
                this.renderAgentStatus(data.data);
            }
        } catch (error) {
            console.error('Error loading agent status:', error);
        }
    }

    /**
     * Load notifications from API
     */
    async loadNotifications() {
        try {
            const response = await fetch(`${this.apiBase}/notifications?unread_only=true&limit=10`);
            const data = await response.json();

            if (data.success) {
                this.renderNotifications(data.notifications);
                this.updateNotificationBadge(data.count);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    /**
     * Render agent status panel
     */
    renderAgentStatus(statusData) {
        const container = document.getElementById('agentStatusPanel');
        if (!container) return;

        const { agents, total_alerts } = statusData;

        const agentIcons = {
            budget_guardian: 'fa-shield-alt',
            compliance_monitor: 'fa-clipboard-check',
            anomaly_detective: 'fa-search',
            savings_optimizer: 'fa-piggy-bank',
            goal_tracker: 'fa-bullseye',
            habit_coach: 'fa-running',
            market_intelligence: 'fa-chart-line',
            emergency_responder: 'fa-exclamation-triangle'
        };

        const agentNames = {
            budget_guardian: 'Budget Guardian',
            compliance_monitor: 'Compliance Monitor',
            anomaly_detective: 'Anomaly Detective',
            savings_optimizer: 'Savings Optimizer',
            goal_tracker: 'Goal Tracker',
            habit_coach: 'Habit Coach',
            market_intelligence: 'Market Intelligence',
            emergency_responder: 'Emergency Responder'
        };

        let html = `
            <div class="card border-0 shadow-sm mb-4 autonomous-agent-card">
                <div class="card-header bg-gradient-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-robot me-2"></i>
                        Autonomous AI Agents
                        ${total_alerts > 0 ? `<span class="badge bg-danger ms-2">${total_alerts} alerts</span>` : ''}
                    </h5>
                    <small>Your 24/7 Financial Guardians</small>
                </div>
                <div class="card-body">
                    <div class="row g-3">
        `;

        for (const [agentKey, agentData] of Object.entries(agents)) {
            const alertCount = agentData.alerts.length;
            const statusClass = alertCount > 0 ? 'status-alert' : 'status-active';
            const icon = agentIcons[agentKey] || 'fa-robot';
            const name = agentNames[agentKey] || agentKey;

            html += `
                <div class="col-md-6 col-lg-3">
                    <div class="agent-item ${statusClass}">
                        <div class="agent-icon">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="agent-info">
                            <div class="agent-name">${name}</div>
                            <div class="agent-status">
                                ${alertCount > 0 
                                    ? `<span class="text-danger">${alertCount} alert${alertCount > 1 ? 's' : ''}</span>`
                                    : '<span class="text-success">Monitoring</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Render notifications
     */
    renderNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-3">No new notifications</p>';
            return;
        }

        const urgencyColors = {
            critical: 'danger',
            high: 'warning',
            medium: 'info',
            low: 'success'
        };

        const urgencyIcons = {
            critical: 'fa-exclamation-circle',
            high: 'fa-exclamation-triangle',
            medium: 'fa-lightbulb',
            low: 'fa-check-circle'
        };

        let html = '';
        notifications.forEach(notif => {
            const color = urgencyColors[notif.urgency] || 'secondary';
            const icon = urgencyIcons[notif.urgency] || 'fa-bell';

            html += `
                <div class="notification-item border-start border-${color} border-3 mb-2 p-3 bg-light rounded">
                    <div class="d-flex align-items-start">
                        <i class="fas ${icon} text-${color} me-3 mt-1"></i>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${notif.title}</h6>
                            <p class="mb-2 small">${notif.message}</p>
                            ${notif.action_buttons && notif.action_buttons.length > 0 ? `
                                <div class="btn-group btn-group-sm">
                                    ${notif.action_buttons.map(btn => `
                                        <button class="btn btn-outline-${color}" onclick="agentsDashboard.handleAction('${notif.id}', '${btn.action}')">
                                            ${btn.label}
                                        </button>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        <button class="btn btn-sm btn-link text-muted" onclick="agentsDashboard.dismissNotification('${notif.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Update notification badge
     */
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    /**
     * Handle notification action
     */
    async handleAction(notificationId, action) {
        console.log(`Action: ${action} for notification: ${notificationId}`);
        
        // Mark as read
        await this.markAsRead(notificationId);
        
        // Handle specific actions
        switch (action) {
            case 'accept_budget_plan':
                alert('Budget plan accepted! Spending limits updated.');
                break;
            case 'adjust_budget':
                alert('Opening budget adjustment panel...');
                break;
            case 'view_gst_details':
                alert('Opening GST compliance details...');
                break;
            case 'auto_save':
                alert('Auto-save activated! Savings allocated.');
                break;
            default:
                console.log('Unknown action:', action);
        }
        
        // Reload notifications
        await this.loadNotifications();
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            await fetch(`${this.apiBase}/notifications/${notificationId}/read`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    /**
     * Dismiss notification
     */
    async dismissNotification(notificationId) {
        try {
            await fetch(`${this.apiBase}/notifications/${notificationId}/dismiss`, {
                method: 'POST'
            });
            await this.loadNotifications();
        } catch (error) {
            console.error('Error dismissing notification:', error);
        }
    }

    /**
     * Trigger demo scenarios
     */
    async triggerDemo(demoType) {
        try {
            const response = await fetch(`${this.apiBase}/demo/${demoType}`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                console.log(`Demo triggered: ${demoType}`);
                // Reload notifications to show new alert
                setTimeout(() => this.loadNotifications(), 500);
            }
        } catch (error) {
            console.error('Error triggering demo:', error);
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.intervalId = setInterval(() => {
            this.loadAgentStatus();
            this.loadNotifications();
        }, this.refreshInterval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Demo buttons
        const budgetDemoBtn = document.getElementById('demoBudgetAlert');
        if (budgetDemoBtn) {
            budgetDemoBtn.addEventListener('click', () => this.triggerDemo('budget-alert'));
        }

        const gstDemoBtn = document.getElementById('demoGstWarning');
        if (gstDemoBtn) {
            gstDemoBtn.addEventListener('click', () => this.triggerDemo('gst-warning'));
        }

        const savingsDemoBtn = document.getElementById('demoSavingsOpportunity');
        if (savingsDemoBtn) {
            savingsDemoBtn.addEventListener('click', () => this.triggerDemo('savings-opportunity'));
        }
    }
}

// Initialize dashboard when DOM is ready
let agentsDashboard;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        agentsDashboard = new AutonomousAgentsDashboard();
        agentsDashboard.init();
    });
} else {
    agentsDashboard = new AutonomousAgentsDashboard();
    agentsDashboard.init();
}
