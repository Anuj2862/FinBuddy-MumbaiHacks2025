// ─── Angular Core Imports ───
// Component: The decorator that marks a class as an Angular component
// OnInit: A lifecycle hook interface — runs code when the component first loads
import { Component, OnInit } from '@angular/core';
// CommonModule: Provides *ngIf, *ngFor, pipes (date, currency) for the template
import { CommonModule } from '@angular/common';
// ApiService: Our custom service that makes HTTP calls to the Node.js backend
import { ApiService } from '../../services/api.service';
// TypeScript interfaces — define the shape/structure of our data
import { Summary, Transaction } from '../../models/transaction.model';

// ─── Component Decorator ───
// This metadata tells Angular how to build and display this component
@Component({
  selector: 'app-dashboard',       // HTML tag name: <app-dashboard>
  standalone: true,                // Standalone component (no NgModule needed — Angular 17+)
  imports: [CommonModule],         // Modules this component depends on
  templateUrl: './dashboard.component.html',  // The HTML file for this component
  styleUrl: './dashboard.component.css'        // The CSS file for this component
})
export class DashboardComponent implements OnInit {

  // ─── State Variables ───
  // These hold the data that the HTML template displays
  summary: Summary | null = null;          // Financial summary (income, expense, balance)
  recentTransactions: Transaction[] = [];  // Array of recent transactions for the table
  loading = true;                          // Controls the "Loading..." spinner visibility
  error = '';                              // Stores error messages if API fails

  // ─── Dependency Injection (DI) ───
  // Angular automatically creates and injects the ApiService instance here
  // This is a core Angular pattern — we don't manually create the service
  constructor(private apiService: ApiService) {}

  // ─── Lifecycle Hook: ngOnInit ───
  // Called ONCE when the component first loads (after the constructor)
  // This is where we fetch data from the backend
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // ─── Fetch Summary Data from Backend ───
  // Makes an HTTP GET request to /api/summary via the ApiService
  loadDashboardData(): void {
    this.loading = true;
    
    // .subscribe() listens for the server's response (Observable pattern)
    // next: runs when data arrives successfully
    // error: runs if the request fails (e.g., server is down)
    this.apiService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;                // Store the summary data
        this.loadRecentTransactions();      // Chain: now fetch transactions
      },
      error: (err) => {
        this.error = 'Failed to load summary data';
        this.loading = false;
      }
    });
  }

  // ─── Fetch Recent Transactions from Backend ───
  // Makes an HTTP GET request to /api/transactions
  loadRecentTransactions(): void {
    this.apiService.getTransactions().subscribe({
      next: (data) => {
        this.recentTransactions = data.slice(0, 5);  // Only show last 5
        this.loading = false;                         // Hide the spinner
      },
      error: (err) => {
        this.error = 'Failed to load transactions';
        this.loading = false;
      }
    });
  }
}
