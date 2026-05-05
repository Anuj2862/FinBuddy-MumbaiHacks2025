import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Summary, Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  summary: Summary | null = null;
  recentTransactions: Transaction[] = [];
  loading = true;
  error = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    // In a real app we'd use forkJoin, but keeping it simple for Unit 5
    this.apiService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.loadRecentTransactions();
      },
      error: (err) => {
        this.error = 'Failed to load summary data';
        this.loading = false;
      }
    });
  }

  loadRecentTransactions(): void {
    this.apiService.getTransactions().subscribe({
      next: (data) => {
        // Just take the last 5 for the dashboard
        this.recentTransactions = data.slice(0, 5);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load transactions';
        this.loading = false;
      }
    });
  }
}
