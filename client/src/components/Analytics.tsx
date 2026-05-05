import React, { useState, useEffect, useRef } from 'react';
import $ from 'jquery';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Feature 14: Multi-Language Dictionary
const labels = {
  en: {
    finOverview: "Financial Overview", addTxn: "Add Transaction", quickAdd: "Quick Add Transaction",
    save: "Save", update: "Update", income: "Income", expense: "Expense", balance: "Net Balance", savings: "Savings Rate",
    cashFlow: "7-Day Cash Flow", topSpending: "Top Spending Categories", recent: "Recent Transactions",
    noTxn: "No data available 📊\nAdd your first transaction!", amount: "Amount", category: "Category", desc: "Description",
    date: "Date", type: "Type", actions: "Actions", edit: "Edit", delete: "Delete", pin: "Pin",
    undo: "Transaction deleted", undoBtn: "UNDO", budgetWarning: "Budget 80% used", budgetDanger: "Budget exceeded",
    todaySpent: "Today", spent: "spent", mostSpent: "You spend most on", highestDay: "Highest spending day",
    serverError: "Cannot connect to server", recentCats: "Recent Categories"
  },
  hi: {
    finOverview: "वित्तीय अवलोकन", addTxn: "लेन-देन जोड़ें", quickAdd: "त्वरित लेन-देन जोड़ें",
    save: "सहेजें", update: "अद्यतन", income: "आय", expense: "खर्च", balance: "शुद्ध शेष", savings: "बचत दर",
    cashFlow: "7-दिवसीय नकदी प्रवाह", topSpending: "शीर्ष खर्च श्रेणियां", recent: "हाल के लेन-देन",
    noTxn: "कोई डेटा उपलब्ध नहीं 📊\nअपना पहला लेन-देन जोड़ें!", amount: "राशि", category: "श्रेणी", desc: "विवरण",
    date: "तारीख", type: "प्रकार", actions: "कार्रवाइयां", edit: "संपादित करें", delete: "हटाएं", pin: "पिन करें",
    undo: "लेन-देन हटा दिया गया", undoBtn: "वापस लाएं", budgetWarning: "बजट 80% उपयोग किया गया", budgetDanger: "बजट पार हो गया",
    todaySpent: "आज", spent: "खर्च किए गए", mostSpent: "आप सबसे अधिक खर्च करते हैं", highestDay: "सबसे ज्यादा खर्च वाला दिन",
    serverError: "सर्वर से कनेक्ट नहीं हो सकता", recentCats: "हाल की श्रेणियां"
  }
};

const keywordMap: Record<string, string> = {
  uber: "Transport", ola: "Transport", petrol: "Transport",
  zomato: "Food", swiggy: "Food", restaurant: "Food", grocery: "Food",
  amazon: "Shopping", flipkart: "Shopping", clothes: "Shopping",
  rent: "Housing", electricity: "Utilities", wifi: "Utilities"
};

// Feature 8: Live Value Count Animation
const AnimatedNumber = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    // ensure step is at least 1, handle 0 value gracefully
    if (value === 0) {
      setCount(0);
      return;
    }
    const step = value / (duration / 16);

    const counter = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(counter);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(counter);
  }, [value]);

  return <span>{count}</span>;
};

export function Analytics({ lang = 'en' }: { lang?: 'en' | 'hi' }) {
  const t = labels[lang];
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getInitialTxn = () => {
    const draft = localStorage.getItem('finbuddy_txn_draft');
    if (draft) return JSON.parse(draft);
    return {
      amount: '', type: localStorage.getItem('last_type') || 'expense',
      category: localStorage.getItem('last_category') || '', description: '',
      date: new Date().toISOString().split('T')[0]
    };
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTxn, setNewTxn] = useState(getInitialTxn());
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [deletedTxn, setDeletedTxn] = useState<any | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recentCats, setRecentCats] = useState<string[]>(JSON.parse(localStorage.getItem('recent_categories') || '[]'));

  useEffect(() => {
    if (!isEditing) localStorage.setItem('finbuddy_txn_draft', JSON.stringify(newTxn));
  }, [newTxn, isEditing]);

  useEffect(() => {
    if (newTxn.description) {
      const descLower = newTxn.description.toLowerCase();
      for (const [key, category] of Object.entries(keywordMap)) {
        if (descLower.includes(key)) {
          setNewTxn(prev => ({ ...prev, category }));
          break;
        }
      }
    }
  }, [newTxn.description]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
      const headers = { 'Authorization': `Bearer ${userId}` };

      const summaryRes = await fetch('http://localhost:5001/api/summary', { headers });
      if (!summaryRes.ok) throw new Error('Failed to fetch summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
      if (summaryData.dailyTrend) setDailyTrend(summaryData.dailyTrend);

      const txnRes = await fetch('http://localhost:5001/api/transactions', { headers });
      if (!txnRes.ok) throw new Error('Failed to fetch transactions');
      const txnData = await txnRes.json();
      setTransactions(txnData);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(t.serverError);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // jQuery & Bootstrap Concept Initializations
    $(document).ready(function() {
      // 1. Initialize Bootstrap Tooltips
      const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.map(function (tooltipTriggerEl) {
        // @ts-ignore
        return new window.bootstrap.Tooltip(tooltipTriggerEl);
      });

      // 2. jQuery Search Feature for Transactions
      $('#txnSearch').on('keyup', function() {
        var value = String($(this).val()).toLowerCase();
        $("#txnTableBody tr").filter(function() {
          $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
          return true;
        });
      });

      // 3. jQuery Hover Animation for Cards
      $('.glass-card').on('mouseenter', function() {
        $(this).css('transform', 'translateY(-5px)');
      }).on('mouseleave', function() {
        $(this).css('transform', 'translateY(0)');
      });
    });
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
      const url = isEditing ? `http://localhost:5001/api/transactions/${isEditing}` : 'http://localhost:5001/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
        body: JSON.stringify({ ...newTxn, userId, amount: Number(newTxn.amount) })
      });

      localStorage.setItem('last_type', newTxn.type);
      localStorage.setItem('last_category', newTxn.category);

      if (newTxn.category) {
        const updatedCats = [newTxn.category, ...recentCats.filter(c => c !== newTxn.category)].slice(0, 3);
        setRecentCats(updatedCats);
        localStorage.setItem('recent_categories', JSON.stringify(updatedCats));
      }

      setShowAddForm(false);
      setIsEditing(null);
      localStorage.removeItem('finbuddy_txn_draft');
      setNewTxn(getInitialTxn());
      fetchDashboardData();
      
      // Feature: Bootstrap Toast using jQuery
      // @ts-ignore
      $('.toast').toast('show');
    } catch (error) {
      setError(t.serverError);
    }
  };

  const handleQuickAdd = async (amount: number, category: string, desc: string) => {
    const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
    await fetch('http://localhost:5001/api/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
      body: JSON.stringify({ amount, type: 'expense', category, description: desc, date: new Date(), userId })
    });
    fetchDashboardData();
  };

  const handleEdit = (txn: any) => {
    setNewTxn({
      amount: txn.amount, type: txn.type, category: txn.category, description: txn.description || '',
      date: new Date(txn.date || txn.createdAt).toISOString().split('T')[0]
    });
    setIsEditing(txn._id);
    setShowAddForm(true);
  };

  const handleTogglePin = async (txn: any) => {
    const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
    await fetch(`http://localhost:5001/api/transactions/${txn._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
      body: JSON.stringify({ isPinned: !txn.isPinned })
    });
    fetchDashboardData();
  };

  const handleDeleteInitiate = async (txn: any) => {
    setDeletedTxn(txn);
    setTransactions(prev => prev.filter(t => t._id !== txn._id));

    const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
    try {
      await fetch(`http://localhost:5001/api/transactions/${txn._id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${userId}` }
      });
      fetchDashboardData(); // Update summary and list from server
    } catch (err) {
      console.error("Delete error:", err);
      setError(t.serverError);
    }

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedTxn(null);
    }, 5000);
  };

  const handleUndo = async () => {
    if (!deletedTxn) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    
    const userId = localStorage.getItem('finbuddy_user_id') || 'guest';
    try {
      // Restore by re-adding the transaction
      await fetch('http://localhost:5001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userId}` },
        body: JSON.stringify({ 
          ...deletedTxn, 
          userId,
          amount: Number(deletedTxn.amount)
        })
      });
      setDeletedTxn(null);
      fetchDashboardData();
    } catch (err) {
      console.error("Undo error:", err);
      setError(t.serverError);
    }
  };

  if (loading) return <div className="p-5 text-center" style={{color:'#1A2340'}}><div className="spinner-border" style={{color:'#E8735A'}} role="status"></div></div>;

  const chartData = {
    labels: dailyTrend.map(d => d.date),
    datasets: [
      { label: t.income, data: dailyTrend.map(d => d.income), borderColor: '#3A9E5F', backgroundColor: 'rgba(58, 158, 95, 0.12)', fill: true, tension: 0.4 },
      { label: t.expense, data: dailyTrend.map(d => d.expense), borderColor: '#E8735A', backgroundColor: 'rgba(232, 115, 90, 0.12)', fill: true, tension: 0.4 }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1200,
      easing: 'easeOutQuart' as const
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#1A2340', font: { family: 'Outfit', weight: '600' } } },
    },
    scales: {
      y: { ticks: { color: '#4B5E7D' }, grid: { color: 'rgba(45,53,97,0.1)' } },
      x: { ticks: { color: '#4B5E7D' }, grid: { color: 'rgba(45,53,97,0.1)' } },
    },
  };

  const monthlyBudget = 50000;
  const expenseRatio = summary?.totalExpense / monthlyBudget;
  let budgetUI = null;
  if (expenseRatio >= 1) budgetUI = <div className="danger mt-2">🚨 {t.budgetDanger}</div>;
  else if (expenseRatio >= 0.8) budgetUI = <div className="warning mt-2">⚠ {t.budgetWarning}</div>;

  const todayStr = new Date().toLocaleDateString();
  const todayExpense = transactions.filter(txn => new Date(txn.date || txn.createdAt).toLocaleDateString() === todayStr && txn.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);

  const maxCategory = summary?.topCategories?.[0]?.name || 'N/A';
  let highestDay = 'N/A';
  let maxDaySpend = 0;
  dailyTrend.forEach(d => { if (d.expense > maxDaySpend) { maxDaySpend = d.expense; highestDay = d.date; } });

  const savingsWidth = Math.min(100, Math.max(0, summary?.savingsPercentage || 0));

  return (
    <div className="analytics-container p-3 p-md-4">
      {/* Feature 3: Floating Action Button */}
      <button className="fab" onClick={() => setShowAddForm(true)} title="Add Transaction">
        <i className="fas fa-plus"></i>
      </button>

      {/* Bootstrap Toast Notification */}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
        <div className="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div className="d-flex">
            <div className="toast-body">
              <i className="fas fa-check-circle me-2"></i>
              Transaction Saved Successfully!
            </div>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>

      {error && <div className="error mb-4">⚠ {error}</div>}

      {deletedTxn && (
        <div className="toast-undo">
          <span>{t.undo}</span>
          <button className="btn btn-sm btn-outline-warning fw-bold" onClick={handleUndo}>{t.undoBtn}</button>
        </div>
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 section">
        <div>
          <h3 className="fw-bold mb-0" style={{color:"#1A2340"}}>{t.finOverview}</h3>
          <div className="summary mt-1">{t.todaySpent}: ₹<AnimatedNumber value={todayExpense} /> {t.spent}</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button className="quick-btn" onClick={() => handleQuickAdd(50, 'Food', 'Snacks')}>₹50</button>
          <button className="quick-btn" onClick={() => handleQuickAdd(100, 'Transport', 'Commute')}>₹100</button>
          <button className="quick-btn" onClick={() => handleQuickAdd(500, 'Shopping', 'Supplies')}>₹500</button>
        </div>
      </div>

      {showAddForm && (
        <div className="glass-card p-4 mb-4" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-gradient-primary fw-bold mb-0">{isEditing ? t.update : t.quickAdd}</h5>
            <button className="btn btn-sm btn-glass" style={{color:'#2D3A5E'}} onClick={() => setShowAddForm(false)}><i className="fas fa-times"></i></button>
          </div>

          {recentCats.length > 0 && (
            <div className="mb-3">
              <span className="text-muted small me-2">{t.recentCats}:</span>
              {recentCats.map(cat => (
                <button key={cat} type="button" className="category-chip" onClick={() => setNewTxn(p => ({ ...p, category: cat }))}>{cat}</button>
              ))}
            </div>
          )}

          <form onSubmit={handleAddOrUpdate} className="row g-3">
            <div className="col-md-2">
              <input type="date" className="form-input" value={newTxn.date} onChange={e => setNewTxn({ ...newTxn, date: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <input type="number" className="form-input" placeholder={t.amount} value={newTxn.amount} onChange={e => setNewTxn({ ...newTxn, amount: e.target.value })} required />
            </div>
            <div className="col-md-2">
              <select className="form-input" value={newTxn.type} onChange={e => setNewTxn({ ...newTxn, type: e.target.value })}>
                <option value="expense">{t.expense}</option>
                <option value="income">{t.income}</option>
              </select>
            </div>
            <div className="col-md-3">
              <input type="text" className="form-input" placeholder={t.desc} value={newTxn.description} onChange={e => setNewTxn({ ...newTxn, description: e.target.value })} required />
              <span className="suggestion">Category will auto-suggest based on keywords (e.g. uber, zomato)</span>
            </div>
            <div className="col-md-2">
              <select className="form-input" value={newTxn.category} onChange={e => setNewTxn({ ...newTxn, category: e.target.value })} required>
                <option value="" disabled>Select Category</option>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Shopping">Shopping</option>
                <option value="Housing">Housing</option>
                <option value="Utilities">Utilities</option>
                <option value="Salary">Salary</option>
                <option value="Inventory">Inventory</option>
                <option value="General">General</option>
              </select>
            </div>
            <div className="col-md-1">
              <button type="submit" className="btn btn-glow-primary w-100 h-100 px-0">{isEditing ? <i className="fas fa-save"></i> : <i className="fas fa-check"></i>}</button>
            </div>
          </form>
        </div>
      )}

      {summary && !summary.error && (
        <>
          <div className="row mb-4 g-3 g-md-4">
            <div className="col-6 col-md-3">
              <div 
                className="glass-card income-card p-4 h-100" 
                data-bs-toggle="tooltip" 
                data-bs-placement="top"
                title={`Total earnings this period: ₹${summary.totalIncome}`}
              >
                <div className="card-icon text-success"><i className="fas fa-wallet"></i></div>
                <div className="text-muted mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{t.income}</div>
                <h3 className="text-gradient-success fw-bold mb-0">₹<AnimatedNumber value={summary.totalIncome || 0} /></h3>
                <div className="inner-progress"><div className="inner-progress-fill" style={{ width: summary.totalIncome > 0 ? '100%' : '0%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div></div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="glass-card expense-card p-4 h-100" title={`Total spent this period: ₹${summary.totalExpense}`}>
                <div className="card-icon text-danger"><i className="fas fa-receipt"></i></div>
                <div className="text-muted mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{t.expense}</div>
                <h3 className="text-gradient-danger fw-bold mb-0">₹<AnimatedNumber value={summary.totalExpense || 0} /></h3>
                {budgetUI}
                <div className="inner-progress"><div className="inner-progress-fill" style={{ width: `${Math.min(100, (expenseRatio || 0) * 100)}%`, background: 'linear-gradient(90deg, #fb7185, #e11d48)' }}></div></div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="glass-card p-4 h-100" title="Your net balance left over">
                <div className="card-icon text-primary"><i className="fas fa-scale-balanced"></i></div>
                <div className="text-muted mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{t.balance}</div>
                <h3 className="text-gradient-primary fw-bold mb-0">₹<AnimatedNumber value={summary.balance || 0} /></h3>
                <div className="inner-progress"><div className="inner-progress-fill" style={{ width: '50%' }}></div></div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="glass-card p-4 h-100" title={`${summary.savingsPercentage}% of your income was saved`}>
                <div className="card-icon text-warning"><i className="fas fa-piggy-bank"></i></div>
                <div className="text-muted mb-2 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>{t.savings}</div>
                <h3 className="text-gradient-warning fw-bold mb-0"><AnimatedNumber value={summary.savingsPercentage || 0} />%</h3>
                <div className="inner-progress"><div className="inner-progress-fill" style={{ width: `${savingsWidth}%`, background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}></div></div>
              </div>
            </div>
          </div>

          <div className="row mb-4 section">
            <div className="col-12">
              <div className="glass-card p-4">
                <div className="d-flex justify-content-between">
                  <h5 className="mb-4 fw-bold" style={{color:'#1A2340'}}>{t.cashFlow}</h5>
                  <div className="text-end d-none d-md-block">
                    <div className="suggestion mb-1">💡 {t.mostSpent} <strong style={{color:'#1A2340'}} className="text-capitalize">{maxCategory}</strong></div>
                    <div className="suggestion">📈 {t.highestDay}: <strong style={{color:'#1A2340'}}>{highestDay}</strong></div>
                  </div>
                </div>
                <div style={{ height: '300px' }}><Line data={chartData} options={chartOptions} /></div>
              </div>
            </div>
          </div>

          <div className="row g-4 section">
            <div className="col-md-4">
              <div className="glass-card p-4 h-100">
                <h5 className="fw-bold mb-4" style={{color:'#1A2340'}}>{t.topSpending}</h5>
                {summary.topCategories && summary.topCategories.length > 0 ? (
                  summary.topCategories.map((cat: any, idx: number) => (
                    <div key={idx} className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-capitalize fw-semibold" style={{color:'#1A2340'}}>{cat.name}</span>
                        <span style={{color:'#2D3A5E'}}>₹{cat.amount} <small className="text-muted">({cat.percentage}%)</small></span>
                      </div>
                      <div className="progress-glass"><div className="progress-bar-glow h-100" style={{ width: `${cat.percentage}%` }}></div></div>
                    </div>
                  ))
                ) : (<div className="empty" style={{ whiteSpace: 'pre-line' }}>{t.noTxn}</div>)}
              </div>
            </div>

            <div className="col-md-8">
              <div className="glass-card p-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold mb-0" style={{color:'#1A2340'}}>{t.recent}</h5>
                  <div className="input-group input-group-sm w-50">
                    <span className="input-group-text bg-transparent border-end-0"><i className="fas fa-search text-muted"></i></span>
                    <input type="text" id="txnSearch" className="form-control border-start-0 ps-0" placeholder="Search..." />
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-glass table-borderless mb-0 align-middle">
                    <thead><tr><th>{t.date}</th><th>{t.desc}</th><th>{t.type}</th><th className="text-end">{t.amount}</th><th className="text-end">{t.actions}</th></tr></thead>
                    <tbody id="txnTableBody">
                      {transactions.length > 0 ? (
                        transactions.map((txn: any) => (
                          <tr key={txn._id} className={txn.isPinned ? 'pinned' : ''}>
                            <td>
                              <div className="fw-medium">{new Date(txn.date || txn.createdAt || Date.now()).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { month: 'short', day: 'numeric' })}</div>
                              <small className="text-muted">{new Date(txn.date || txn.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                            </td>
                            <td>
                              <div className="text-capitalize fw-medium" style={{color:'#1A2340'}}>{txn.category || 'General'}</div>
                              <small className="text-muted">{txn.description || 'No description'}</small>
                            </td>
                            <td><span className={txn.type === 'income' ? 'badge-glass-success rounded-pill' : 'badge-glass-danger rounded-pill'}>{t[txn.type as 'income' | 'expense']}</span></td>
                            <td className="text-end fw-bold" style={{ color: txn.type === 'income' ? '#34d399' : '#fb7185' }}>{txn.type === 'income' ? '+' : '-'}₹{txn.amount}</td>
                            <td className="text-end">
                              <button className={`pin-btn me-2 ${txn.isPinned ? '' : 'unpinned'}`} onClick={() => handleTogglePin(txn)} title={t.pin}><i className="fas fa-star"></i></button>
                              <button className="edit-btn me-2" onClick={() => handleEdit(txn)} title={t.edit}><i className="fas fa-edit"></i></button>
                              <button className="edit-btn text-danger" onClick={() => handleDeleteInitiate(txn)} title={t.delete}><i className="fas fa-trash"></i></button>
                            </td>
                          </tr>
                        ))
                      ) : (<tr><td colSpan={5} className="empty" style={{ whiteSpace: 'pre-line' }}>{t.noTxn}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

