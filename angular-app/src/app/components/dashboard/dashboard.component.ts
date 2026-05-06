// Angular Core Imports
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Summary, Transaction } from '../../models/transaction.model';

// Component Decorator — metadata that tells Angular how to build this component
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  // State variables that the HTML template displays
  summary: Summary | null = null;
  recentTransactions: Transaction[] = [];
  loading = true;
  error = '';

  // Dependency Injection — Angular auto-creates and injects ApiService
  constructor(private apiService: ApiService) {}

  // Lifecycle Hook — runs once when component loads, fetches data from backend
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Fetches financial summary from /api/summary via the ApiService
  loadDashboardData(): void {
    this.loading = true;
    
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

  // Fetches last 5 transactions from /api/transactions
  loadRecentTransactions(): void {
    this.apiService.getTransactions().subscribe({
      next: (data) => {
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
