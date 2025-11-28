/**
 * Accounts Manager
 * Fetches and renders user accounts (Bank, Wallet, Cash)
 */

class AccountsManager {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/accounts';
        this.container = document.getElementById('accountsContainer');
    }

    async loadAccounts() {
        if (!this.container) return;

        try {
            const response = await fetch(this.apiBase);
            if (!response.ok) throw new Error('Failed to fetch accounts');

            const accounts = await response.json();
            this.renderAccounts(accounts);
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.container.innerHTML = '<p class="text-muted small">Could not load accounts.</p>';
        }
    }

    renderAccounts(accounts) {
        if (!accounts || accounts.length === 0) {
            this.container.innerHTML = '<p class="text-muted small">No accounts found.</p>';
            return;
        }

        let html = '';
        accounts.forEach(acc => {
            html += `
                <div class="col-md-4 mb-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body d-flex align-items-center">
                            <div class="rounded-circle bg-${acc.color || 'primary'} bg-opacity-10 p-3 me-3">
                                <i class="fas ${acc.icon || 'fa-wallet'} text-${acc.color || 'primary'} fa-lg"></i>
                            </div>
                            <div>
                                <h6 class="mb-0 fw-bold">${acc.name}</h6>
                                <small class="text-muted text-uppercase" style="font-size: 0.7rem;">${acc.type}</small>
                                <h5 class="mb-0 mt-1">₹${acc.balance.toLocaleString('en-IN')}</h5>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.container.innerHTML = html;
    }
}

// Initialize
const accountsManager = new AccountsManager();
document.addEventListener('DOMContentLoaded', () => {
    accountsManager.loadAccounts();
});
