// Angular Core Imports
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

// Custom Imports
import { SpendArenaService } from './spend-arena.service';
import { SpendEntry } from './models/spend.model';
import { Subject, takeUntil } from 'rxjs';
import { Pie3DComponent, Pie3DSlice } from './pie3d.component';

// Component Decorator — metadata that tells Angular how to build this component
@Component({
  selector: 'app-spend-arena',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Pie3DComponent],
  templateUrl: './spend-arena.component.html',
  styleUrls: ['./spend-arena.component.css'],

  // Animation: new bucket items slide down with a bounce effect
  animations: [
    trigger('dropIn', [
      transition(':enter', [
        style({ transform: 'translateY(-50px) scale(0.8)', opacity: 0 }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ])
    ])
  ]
})
export class SpendArenaComponent implements OnInit, OnDestroy {

  // Redirects user back to the React Dashboard
  goToDashboard(): void {
    window.location.href = 'http://localhost:3000';
  }

  // Reactive Form for the expense input
  spendForm: FormGroup;

  // State Variables
  spends: SpendEntry[] = [];
  dailyGoal  = 1000;
  totalSpent = 0;
  progress   = 0;
  streak     = 0;

  // Dynamic CSS classes for progress bar color (safe/warning/danger)
  colorClass  = 'safe';
  colorBgClass = 'safe-bg';

  // Floating "+₹Amount" animation elements
  floaters: { id: number; amount: number }[] = [];
  private floaterId = 0;

  // Analytics state
  highestCategory = 'N/A';
  peakDay  = 'N/A';
  peakHour = 'N/A';
  percentage = 0;
  heatmapData: { level: string }[] = [];
  personality = 'Neutral Spender';
  aiAdvice: string = '';
  isConsulting: boolean = false;

  // 3D Pie Chart slices — each has a label, value, and color
  pie3dSlices: Pie3DSlice[] = [
    { label: 'Food',      value: 0, color: '#FF6B6B' },
    { label: 'Transport', value: 0, color: '#F0A500' },
    { label: 'Shopping',  value: 0, color: '#7B7BF5' },
    { label: 'Other',     value: 0, color: '#4B7BF5' },
  ];

  // Subject used with takeUntil() to auto-unsubscribe and prevent memory leaks
  private destroy$ = new Subject<void>();

  // Constructor — Angular injects FormBuilder and SpendArenaService automatically (Dependency Injection)
  constructor(
    private fb: FormBuilder,
    private arenaService: SpendArenaService
  ) {
    // Create Reactive Form with validation rules
    this.spendForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      category: ['Food']
    });
  }

  // ngOnInit — subscribes to the service's BehaviorSubject state stream
  ngOnInit(): void {
    this.arenaService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.dailyGoal = state.dailyGoal;
        this.spends = state.spends;
        this.streak = state.streak_days;
        this.updateStats();
        this.updateChart();
        this.calculateAnalytics();
        this.consultAI();
      });
  }

  // ngOnDestroy — called when component is removed, prevents memory leaks
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Called when user clicks "Drop in Bucket" — adds expense and triggers floating animation
  addSpend(): void {
    if (this.spendForm.valid) {
      const formValue = this.spendForm.value;
      
      const currentFloaterId = ++this.floaterId;
      this.floaters.push({ id: currentFloaterId, amount: formValue.amount });
      
      setTimeout(() => {
        this.floaters = this.floaters.filter(f => f.id !== currentFloaterId);
      }, 1000);

      this.arenaService.addSpend(formValue.amount, formValue.category);
      this.spendForm.reset({ category: formValue.category });
      
      if (this.aiAdvice) this.consultAI();
    }
  }

  // AI Consultant — generates local advice instantly, then upgrades with backend response
  consultAI(): void {
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

    if (!this.aiAdvice) this.aiAdvice = localAdvice;

    // Try to fetch smarter advice from the Node.js backend API
    this.isConsulting = true;
    this.arenaService.getAIAdvice('5').subscribe({
      next: (res) => {
        if (res && res.advice) this.aiAdvice = res.advice;
        this.isConsulting = false;
      },
      error: () => {
        this.isConsulting = false;
      }
    });
  }

  // Returns Font Awesome icon class based on category name
  getIcon(category: string): string {
    switch (category) {
      case 'Food': return 'fas fa-utensils';
      case 'Transport': return 'fas fa-bus';
      case 'Shopping': return 'fas fa-shopping-cart';
      default: return 'fas fa-box';
    }
  }

  // Calculates progress bar percentage and assigns color (green/orange/red)
  private updateStats(): void {
    this.totalSpent = this.arenaService.getTotalSpent();
    
    if (this.dailyGoal > 0) {
      this.progress = Math.min((this.totalSpent / this.dailyGoal) * 100, 100);
    } else {
      this.progress = 0;
    }

    if (this.progress < 70) {
      this.colorClass = 'safe';
      this.colorBgClass = 'safe-bg';
    } else if (this.progress <= 100) {
      this.colorClass = 'warning';
      this.colorBgClass = 'warning-bg';
    } else {
      this.colorClass = 'danger';
      this.colorBgClass = 'danger-bg';
    }
  }

  // Runs all analytics calculations whenever data changes
  private calculateAnalytics(): void {
    this.getHighestCategory(this.spends);
    this.getPeakDay(this.spends);
    this.getPeakHour(this.spends);
    this.getPersonality(this.spends);
    this.calculateComparison(this.totalSpent, 500);
    this.generateHeatmap(this.spends);
  }

  // Finds the category with the highest total spending
  getHighestCategory(transactions: SpendEntry[]): void {
    if (!transactions || transactions.length === 0) {
      this.highestCategory = 'N/A';
      return;
    }
    const counts: { [key: string]: number } = {};
    transactions.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + t.amount;
    });
    this.highestCategory = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  // Returns today's weekday name as the peak spending day
  getPeakDay(transactions: SpendEntry[]): void {
    if (transactions.length > 0) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      this.peakDay = today;
    } else {
      this.peakDay = 'N/A';
    }
  }

  // Finds the hour with the most transactions
  getPeakHour(transactions: SpendEntry[]): void {
    if (!transactions || transactions.length === 0) {
      this.peakHour = 'N/A';
      return;
    }
    const hours: { [key: string]: number } = {};
    transactions.forEach(t => {
      const hr = new Date(t.timestamp).getHours();
      hours[hr] = (hours[hr] || 0) + 1;
    });
    const peak = Object.keys(hours).reduce((a, b) => hours[a] > hours[b] ? a : b);
    this.peakHour = `${peak}:00`;
  }

  // Calculates percentage change between today and yesterday's spending
  calculateComparison(today: number, yesterday: number): void {
    if (yesterday === 0) {
      this.percentage = today > 0 ? 100 : 0;
      return;
    }
    this.percentage = ((today - yesterday) / yesterday) * 100;
  }

  // Generates 60 heatmap cells — last cell uses real data, rest is random demo data
  generateHeatmap(transactions: SpendEntry[]): void {
    this.heatmapData = Array.from({ length: 60 }, (_, i) => {
      if (i === 59) {
        if (this.progress > 80) return { level: 'high' };
        if (this.progress > 40) return { level: 'medium' };
        if (this.progress > 0) return { level: 'low' };
        return { level: '' };
      }
      const rand = Math.random();
      let level = '';
      if (rand > 0.8) level = 'high';
      else if (rand > 0.4) level = 'medium';
      else if (rand > 0.1) level = 'low';
      return { level };
    });
  }

  // Assigns a personality label based on spending progress
  getPersonality(transactions: SpendEntry[]): void {
    if (this.progress > 90) this.personality = 'Big Spender';
    else if (this.progress > 50) this.personality = 'Balanced Buyer';
    else if (transactions.length > 0) this.personality = 'Smart Saver';
    else this.personality = 'Ghost Spender';
  }

  // Refreshes the 3D pie chart with latest category split data
  private updateChart(): void {
    const split = this.arenaService.getCategorySplit();
    this.pie3dSlices = [
      { label: 'Food',      value: split['Food']      || 0, color: '#FF6B6B' },
      { label: 'Transport', value: split['Transport'] || 0, color: '#F0A500' },
      { label: 'Shopping',  value: split['Shopping']  || 0, color: '#7B7BF5' },
      { label: 'Other',     value: split['Other']     || 0, color: '#4B7BF5' },
    ];
    this.pie3dSlices = [...this.pie3dSlices];
  }
}
