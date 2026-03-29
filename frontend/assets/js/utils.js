// frontend/assets/js/utils.js – ENHANCED VERSION WITH TOASTS, apiFetch & LANGUAGE SUPPORT

class FinBuddyUtils {

    // Currency formatter (optimized for Indian Rupees)
    static formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: amount % 1 === 0 ? 0 : 2
        }).format(amount);
    }

    // Universal date formatter (ISO, timestamps, backend dates)
    static formatDate(dateValue) {
        if (!dateValue) return "Invalid Date";
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return "Invalid Date";
            return date.toLocaleString("en-IN", {
                year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        } catch (err) {
            return "Invalid Date";
        }
    }

    // ─────────────────────────────────────────────────────────
    // TOAST NOTIFICATION SYSTEM (replaces alert() everywhere)
    // ─────────────────────────────────────────────────────────
    static showToast(message, type = "info", duration = 4500) {
        const icons  = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

        let container = document.getElementById("fb-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "fb-toast-container";
            Object.assign(container.style, {
                position: 'fixed', top: '20px', right: '20px', zIndex: '99999',
                display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', width: '90%'
            });
            document.body.appendChild(container);
        }

        const color = colors[type] || colors.info;
        const icon  = icons[type]  || icons.info;
        const toast = document.createElement("div");

        Object.assign(toast.style, {
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--card-bg, #fff)', color: 'var(--text-color, #1e293b)',
            border: `1px solid ${color}`, borderLeft: `5px solid ${color}`,
            borderRadius: '10px', padding: '14px 18px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            opacity: '0', transform: 'translateX(30px)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            fontFamily: 'Inter, sans-serif', fontSize: '14px', lineHeight: '1.4'
        });

        toast.innerHTML = `
            <i class="fas ${icon}" style="color:${color};font-size:18px;flex-shrink:0"></i>
            <span style="flex:1">${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:0;font-size:16px">✕</button>
        `;
        container.appendChild(toast);

        requestAnimationFrame(() => setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10));

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // Backwards-compatible alias
    static showNotification(message, type = "info") {
        FinBuddyUtils.showToast(message, type);
    }

    // ─────────────────────────────────────────────────────────
    // GLOBAL API FETCH — Auto handles 401 session expiry
    // ─────────────────────────────────────────────────────────
    static async apiFetch(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const response = await fetch(url, { ...options, headers, signal: controller.signal });
            clearTimeout(timeoutId);

            // Global 401 → session expiry
            if (response.status === 401) {
                FinBuddyUtils.showToast('Your session has expired. Please login again.', 'warning', 3000);
                setTimeout(() => {
                    ['token', 'user_data', 'user', 'isLoggedIn'].forEach(k => localStorage.removeItem(k));
                    window.location.href = '/';
                }, 1500);
                throw new Error('Session expired');
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Non-JSON response: ${text.substring(0, 200)}`);
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || `HTTP ${response.status}`);
            return data;

        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
            throw err;
        }
    }

    // Legacy wrapper
    static async apiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return FinBuddyUtils.apiFetch(url, {
            method: options.method || 'GET',
            headers: options.headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
    }

    // ─────────────────────────────────────────────────────────
    // THEME MANAGEMENT
    // ─────────────────────────────────────────────────────────
    static initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        return savedTheme;
    }

    static toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        return newTheme;
    }

    // ─────────────────────────────────────────────────────────
    // LANGUAGE SUPPORT (Hindi/English Toggle)
    // ─────────────────────────────────────────────────────────
    static translations = {
        'en': {
            'nav_home': 'Home',
            'nav_parser': 'Parser',
            'nav_chat': 'Chat',
            'nav_dashboard': 'Dashboard',
            'kpi_credit': 'Total Credit',
            'kpi_debit': 'Total Debit',
            'kpi_net': 'Net Balance',
            'recent_transactions': 'Recent Transactions',
            'expense_distribution': 'Monthly Expense Distribution',
            'spending_heatmap': 'Spending Heatmap',
            'monthly_budgets': 'Monthly Budgets'
        },
        'hi': {
            'nav_home': 'होम',
            'nav_parser': 'पार्सर',
            'nav_chat': 'चैट',
            'nav_dashboard': 'डैशबोर्ड',
            'kpi_credit': 'कुल जमा (Credit)',
            'kpi_debit': 'कुल खर्च (Debit)',
            'kpi_net': 'शुद्ध शेष (Net)',
            'recent_transactions': 'हाल के लेन-देन',
            'expense_distribution': 'मासिक खर्च वितरण',
            'spending_heatmap': 'खर्च हीटमैप',
            'monthly_budgets': 'मासिक बजट'
        }
    };

    static getLang() {
        return localStorage.getItem('lang') || 'en';
    }

    static toggleLanguage() {
        const current = FinBuddyUtils.getLang();
        const next = current === 'en' ? 'hi' : 'en';
        localStorage.setItem('lang', next);
        FinBuddyUtils.showToast(`Language switched to ${next === 'hi' ? 'Hindi' : 'English'}`, "success");
        FinBuddyUtils.translateDOM();
        
        // Return next to update UI button if needed
        return next;
    }

    static translateDOM() {
        const lang = FinBuddyUtils.getLang();
        const dict = FinBuddyUtils.translations[lang] || FinBuddyUtils.translations['en'];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) {
                // If it's an input/textarea with placeholder
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = dict[key];
                } else {
                    // For HTML elements with icons inside, we need to preserve the icon
                    const icon = el.querySelector('i');
                    if (icon) {
                        el.innerHTML = '';
                        el.appendChild(icon);
                        el.appendChild(document.createTextNode(' ' + dict[key]));
                    } else {
                        el.textContent = dict[key];
                    }
                }
            }
        });
    }
}

// Auto-translate on load
document.addEventListener('DOMContentLoaded', () => {
    FinBuddyUtils.translateDOM();
});
