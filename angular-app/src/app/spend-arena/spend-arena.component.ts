// ─── Angular Core Imports ───
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// ReactiveFormsModule: Provides form controls like FormGroup, FormBuilder
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
// Angular Animations: For the "drop-in" effect when new items appear
import { trigger, transition, style, animate } from '@angular/animations';

// ─── Custom Imports ───
import { SpendArenaService } from './spend-arena.service';
import { SpendEntry } from './models/spend.model';
// Subject & takeUntil: Used to prevent memory leaks by unsubscribing on destroy
import { Subject, takeUntil } from 'rxjs';
// Custom 3D Pie Chart component
import { Pie3DComponent, Pie3DSlice } from './pie3d.component';

// ─── Component Decorator ───
@Component({
  selector: 'app-spend-arena',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Pie3DComponent],
  templateUrl: './spend-arena.component.html',
  styleUrls: ['./spend-arena.component.css'],

  // ─── Angular Animation Definition ───
  // 'dropIn': When a new bucket item enters the DOM, it slides down with a bounce
  animations: [
    trigger('dropIn', [
      transition(':enter', [
        // Start state: invisible, small, and 50px above
        style({ transform: 'translateY(-50px) scale(0.8)', opacity: 0 }),
        // End state: animate to normal position over 600ms with a bounce curve
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ])
    ])
  ]
})
export class SpendArenaComponent implements OnInit, OnDestroy {

  // ─── Navigation ───
  // Redirects user back to the React Dashboard
  goToDashboard(): void {
    window.location.href = 'http://localhost:3000';
  }

  // ─── Reactive Form ───
  // Angular Reactive Forms provide programmatic control over form inputs
  spendForm: FormGroup;

  // ─── State Variables ───
  spends: SpendEntry[] = [];     // Array of today's transactions (the "Bucket")
  dailyGoal  = 1000;             // Default spending goal in ₹
  totalSpent = 0;                // Sum of all spends today
  progress   = 0;                // Progress bar percentage (0-100)
  streak     = 0;                // Number of consecutive days under budget

  // ─── Dynamic CSS Classes ───
  // These change the color of the progress bar based on spending level
  colorClass  = 'safe';          // Text color class: safe (green), warning (orange), danger (red)
  colorBgClass = 'safe-bg';      // Background color class for the progress bar fill

  // ─── Floating Animation State ───
  // When user adds an expense, a "+₹Amount" text floats up and fades out
  floaters: { id: number; amount: number }[] = [];
  private floaterId = 0;

  // ─── Analytics State ───
  highestCategory = 'N/A';       // Which category has the most spending (e.g., "Food")
  peakDay  = 'N/A';              // Which day of the week has most activity
  peakHour = 'N/A';              // Which hour has the most transactions
  percentage = 0;                // Comparison vs yesterday (e.g., +20%)
  heatmapData: { level: string }[] = [];  // 60 cells for the activity heatmap
  personality = 'Neutral Spender';         // Dynamic label based on spending behavior
  aiAdvice: string = '';         // AI-generated financial advice text
  isConsulting: boolean = false; // Loading state for AI consultation

  // ─── 3D Pie Chart Data ───
  // Each slice has a label, value, and color for the category split chart
  pie3dSlices: Pie3DSlice[] = [
    { label: 'Food',      value: 0, color: '#FF6B6B' },
    { label: 'Transport', value: 0, color: '#F0A500' },
    { label: 'Shopping',  value: 0, color: '#7B7BF5' },
    { label: 'Other',     value: 0, color: '#4B7BF5' },
  ];

  // ─── Memory Leak Prevention ───
  // This Subject is used with takeUntil() to automatically unsubscribe
  // from Observables when the component is destroyed
  private destroy$ = new Subject<void>();

  // ─── Constructor: Dependency Injection ───
  // FormBuilder: Helper to create form controls
  // SpendArenaService: Manages the state (transactions, goals, streaks)
  constructor(
    private fb: FormBuilder,
    private arenaService: SpendArenaService
  ) {
    // Create the Reactive Form with validation rules
    this.spendForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],  // Must be >= 1
      category: ['Food']                                          // Default category
    });
  }

  // ─── Lifecycle Hook: ngOnInit ───
  // Subscribes to the service's state stream (BehaviorSubject)
  // Every time the state changes, this callback runs and updates the UI
  ngOnInit(): void {
    this.arenaService.state$
      .pipe(takeUntil(this.destroy$))   // Auto-unsubscribe when component dies
      .subscribe(state => {
        this.dailyGoal = state.dailyGoal;
        this.spends = state.spends;
        this.streak = state.streak_days;
        this.updateStats();              // Recalculate progress bar
        this.updateChart();              // Refresh pie chart
        this.calculateAnalytics();       // Recalculate insights
        this.consultAI();                // Auto-trigger AI advice
      });
  }

  // ─── Lifecycle Hook: ngOnDestroy ───
  // Called when user navigates away — prevents memory leaks
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Add Expense Handler ───
  // Called when user clicks "Drop in Bucket"
  addSpend(): void {
    if (this.spendForm.valid) {
      const formValue = this.spendForm.value;
      
      // Create a floating "+₹Amount" animation element
      const currentFloaterId = ++this.floaterId;
      this.floaters.push({ id: currentFloaterId, amount: formValue.amount });
      
      // Remove the floater after 1 second (animation duration)
      setTimeout(() => {
        this.floaters = this.floaters.filter(f => f.id !== currentFloaterId);
      }, 1000);

      // Add the spend to the service (which updates the BehaviorSubject)
      this.arenaService.addSpend(formValue.amount, formValue.category);
      // Reset the form but keep the selected category
      this.spendForm.reset({ category: formValue.category });
      
      // Auto-refresh AI advice after adding a new expense
      if (this.aiAdvice) this.consultAI();
    }
  }

  // ─── AI Financial Consultant ───
  // Provides instant local advice + tries to fetch smarter advice from backend
  consultAI(): void {
    // Step 1: Generate LOCAL advice instantly (no server needed)
    const split = this.arenaService.getCategorySplit();
    const total = this.totalSpent;
    const topCat = this.highestCategory;

    let localAdvice = "";
    if (total === 0) {
      localAdvice = "Your bucket is empty! Start adding expenses to get personalized AI coaching.";
    } else if (total > this.dailyGoal) {
      localAdvice = `Goal Exceeded! You've spent ₹${total.toFixed(0)}, which is ₹${(total - this.dailyGoal).toFixed(0)} over your limit. Focus on essentials only for the rest of the day.`;
    } else if (topCat !== 'N/A' && split[topCat] > total * 0.5) {
      localAdvice = `Concentrated Spend: Over 50% of your budget is going to ${topCat}. Consider if this is a fixed or variable cost you can optimize.`;
    } else {
      localAdvice = "Balanced Spending: Your current bucket follows a healthy distribution. You're on track to keep your streak!";
    }

    // Show local advice immediately so the UI is never empty
    if (!this.aiAdvice) this.aiAdvice = localAdvice;

    // Step 2: Try to get "smarter" advice from the Node.js backend
    this.isConsulting = true;
    this.arenaService.getAIAdvice('5').subscribe({
      next: (res) => {
        if (res && res.advice) this.aiAdvice = res.advice;  // Replace with server advice
        this.isConsulting = false;
      },
      error: () => {
        // If server fails, keep the local advice — user never sees an error
        this.isConsulting = false;
      }
    });
  }

  // ─── Category Icon Helper ───
  // Returns the Font Awesome icon class based on the category name
  getIcon(category: string): string {
    switch (category) {
      case 'Food': return 'fas fa-utensils';
      case 'Transport': return 'fas fa-bus';
      case 'Shopping': return 'fas fa-shopping-cart';
      default: return 'fas fa-box';
    }
  }

  // ─── Progress Bar & Color Logic ───
  // Calculates how much of the daily goal is spent and assigns color codes
  private updateStats(): void {
    this.totalSpent = this.arenaService.getTotalSpent();
    
    // Calculate progress percentage (capped at 100%)
    if (this.dailyGoal > 0) {
      this.progress = Math.min((this.totalSpent / this.dailyGoal) * 100, 100);
    } else {
      this.progress = 0;
    }

    // Assign color based on progress level
    if (this.progress < 70) {
      this.colorClass = 'safe';          // Green: Under 70%
      this.colorBgClass = 'safe-bg';
    } else if (this.progress <= 100) {
      this.colorClass = 'warning';       // Orange: 70-100%
      this.colorBgClass = 'warning-bg';
    } else {
      this.colorClass = 'danger';        // Red: Over 100%
      this.colorBgClass = 'danger-bg';
    }
  }

  // ─── Analytics Calculator ───
  // Runs all the insight calculations whenever data changes
  private calculateAnalytics(): void {
    this.getHighestCategory(this.spends);
    this.getPeakDay(this.spends);
    this.getPeakHour(this.spends);
    this.getPersonality(this.spends);
    this.calculateComparison(this.totalSpent, 500);  // Mock: yesterday was ₹500
    this.generateHeatmap(this.spends);
  }

  // ─── Find the Category with Most Spending ───
  getHighestCategory(transactions: SpendEntry[]): void {
    if (!transactions || transactions.length === 0) {
      this.highestCategory = 'N/A';
      return;
    }
    // Sum amounts by category, then find the highest
    const counts: { [key: string]: number } = {};
    transactions.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    this.highestCategory = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  // ─── Find Peak Spending Day ───
  getPeakDay(transactions: SpendEntry[]): void {
    if (transactions.length > 0) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      this.peakDay = today;
    } else {
      this.peakDay = 'N/A';
    }
  }

  // ─── Find Peak Spending Hour ───
  getPeakHour(transactions: SpendEntry[]): void {
    if (!transactions || transactions.length === 0) {
      this.peakHour = 'N/A';
      return;
    }
    // Count transactions per hour, then find the busiest hour
    const hours: { [key: string]: number } = {};
    transactions.forEach(t => {
      const hr = new Date(t.timestamp).getHours();
      hours[hr] = (hours[hr] || 0) + 1;
    });
    const peak = Object.keys(hours).reduce((a, b) => hours[a] > hours[b] ? a : b);
    this.peakHour = `${peak}:00`;
  }

  // ─── Yesterday Comparison ───
  // Calculates percentage change between today and yesterday's spending
  calculateComparison(today: number, yesterday: number): void {
    if (yesterday === 0) {
      this.percentage = today > 0 ? 100 : 0;
      return;
    }
    this.percentage = ((today - yesterday) / yesterday) * 100;
  }

  // ─── 30-Day Heatmap Generator ───
  // Creates 60 cells of activity data (like GitHub's contribution graph)
  generateHeatmap(transactions: SpendEntry[]): void {
    this.heatmapData = Array.from({ length: 60 }, (_, i) => {
      if (i === 59) {
        // Last cell = TODAY (uses real data)
        if (this.progress > 80) return { level: 'high' };
        if (this.progress > 40) return { level: 'medium' };
        if (this.progress > 0) return { level: 'low' };
        return { level: '' };
      }
      // Other cells = Random past data for demo
      const rand = Math.random();
      let level = '';
      if (rand > 0.8) level = 'high';
      else if (rand > 0.4) level = 'medium';
      else if (rand > 0.1) level = 'low';
      return { level };
    });
  }

  // ─── Personality Engine ───
  // Assigns a fun label based on how much the user has spent
  getPersonality(transactions: SpendEntry[]): void {
    if (this.progress > 90) this.personality = 'Big Spender';
    else if (this.progress > 50) this.personality = 'Balanced Buyer';
    else if (transactions.length > 0) this.personality = 'Smart Saver';
    else this.personality = 'Ghost Spender';
  }

  // ─── Pie Chart Updater ───
  // Refreshes the 3D pie chart with the latest category split data
  private updateChart(): void {
    const split = this.arenaService.getCategorySplit();
    this.pie3dSlices = [
      { label: 'Food',      value: split['Food']      || 0, color: '#FF6B6B' },
      { label: 'Transport', value: split['Transport'] || 0, color: '#F0A500' },
      { label: 'Shopping',  value: split['Shopping']  || 0, color: '#7B7BF5' },
      { label: 'Other',     value: split['Other']     || 0, color: '#4B7BF5' },
    ];
    // Create a new array reference to force Angular's change detection
    this.pie3dSlices = [...this.pie3dSlices];
  }
}
