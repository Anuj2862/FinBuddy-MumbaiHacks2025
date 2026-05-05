import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';

import { SpendArenaService } from './spend-arena.service';
import { SpendEntry } from './models/spend.model';
import { Subject, takeUntil } from 'rxjs';
import { Pie3DComponent, Pie3DSlice } from './pie3d.component';

@Component({
  selector: 'app-spend-arena',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Pie3DComponent],
  templateUrl: './spend-arena.component.html',
  styleUrls: ['./spend-arena.component.css'],
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

  goToDashboard(): void {
    window.location.href = 'http://localhost:3000';
  }

  spendForm: FormGroup;
  spends: SpendEntry[] = [];

  dailyGoal  = 1000;
  totalSpent = 0;
  progress   = 0;
  streak     = 0;

  colorClass  = 'safe';
  colorBgClass = 'safe-bg';

  floaters: { id: number; amount: number }[] = [];
  private floaterId = 0;

  highestCategory = 'N/A';
  peakDay  = 'N/A';
  peakHour = 'N/A';
  percentage = 0;
  heatmapData: { level: string }[] = [];
  personality = 'Neutral Spender';

  // 3D Pie slices
  pie3dSlices: Pie3DSlice[] = [
    { label: 'Food',      value: 0, color: '#FF6B6B' },
    { label: 'Transport', value: 0, color: '#F0A500' },
    { label: 'Shopping',  value: 0, color: '#7B7BF5' },
    { label: 'Other',     value: 0, color: '#4B7BF5' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private arenaService: SpendArenaService
  ) {
    this.spendForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      category: ['Food']
    });
  }

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
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
    }
  }

  getIcon(category: string): string {
    switch (category) {
      case 'Food': return 'fas fa-utensils';
      case 'Transport': return 'fas fa-bus';
      case 'Shopping': return 'fas fa-shopping-cart';
      default: return 'fas fa-box';
    }
  }

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

  private calculateAnalytics(): void {
    this.getHighestCategory(this.spends);
    this.getPeakDay(this.spends);
    this.getPeakHour(this.spends);
    this.getPersonality(this.spends);
    
    // Mock yesterday for comparison (e.g. 500 spent yesterday)
    this.calculateComparison(this.totalSpent, 500); 
    
    this.generateHeatmap(this.spends);
  }

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

  getPeakDay(transactions: SpendEntry[]): void {
    // Since these are all today, peak day is always today if there are transactions.
    // We'll just display today's weekday name.
    if (transactions.length > 0) {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      this.peakDay = today;
    } else {
      this.peakDay = 'N/A';
    }
  }

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

  calculateComparison(today: number, yesterday: number): void {
    if (yesterday === 0) {
      this.percentage = today > 0 ? 100 : 0;
      return;
    }
    this.percentage = ((today - yesterday) / yesterday) * 100;
  }

  generateHeatmap(transactions: SpendEntry[]): void {
    // Generate 60 cells of heatmap data. Last cell is today.
    this.heatmapData = Array.from({ length: 60 }, (_, i) => {
      if (i === 59) {
        // Today's real intensity
        if (this.progress > 80) return { level: 'high' };
        if (this.progress > 40) return { level: 'medium' };
        if (this.progress > 0) return { level: 'low' };
        return { level: '' }; // Empty
      }
      // Random past data
      const rand = Math.random();
      let level = '';
      if (rand > 0.8) level = 'high';
      else if (rand > 0.4) level = 'medium';
      else if (rand > 0.1) level = 'low';
      return { level };
    });
  }

  getPersonality(transactions: SpendEntry[]): void {
    if (this.progress > 90) this.personality = 'Big Spender';
    else if (this.progress > 50) this.personality = 'Balanced Buyer';
    else if (transactions.length > 0) this.personality = 'Smart Saver';
    else this.personality = 'Ghost Spender';
  }

  private updateChart(): void {
    const split = this.arenaService.getCategorySplit();
    this.pie3dSlices = [
      { label: 'Food',      value: split['Food']      || 0, color: '#FF6B6B' },
      { label: 'Transport', value: split['Transport'] || 0, color: '#F0A500' },
      { label: 'Shopping',  value: split['Shopping']  || 0, color: '#7B7BF5' },
      { label: 'Other',     value: split['Other']     || 0, color: '#4B7BF5' },
    ];
    // Force change detection by creating a new array reference
    this.pie3dSlices = [...this.pie3dSlices];
  }
}
