import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Transaction } from '../../models/transaction.model';

// Transactions page — CRUD operations for managing financial records
@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css'
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  
  loading = true;
  submitting = false;
  showForm = false;
  
  filterType: string = 'all';

  // Default values for the "New Transaction" form (uses ngModel two-way binding)
  newTxn: Transaction = {
    amount: 0,
    type: 'expense',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  };

  constructor(private apiService: ApiService) {}

  // Fetches all transactions from backend on component load
  ngOnInit(): void {
    this.loadTransactions();
  }

  // Makes HTTP GET to /api/transactions
  loadTransactions(): void {
    this.loading = true;
    this.apiService.getTransactions().subscribe({
      next: (data) => {
        this.transactions = data;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading transactions', err);
        this.loading = false;
      }
    });
  }

  // Toggles the "Add Transaction" form visibility
  toggleForm(): void {
    this.showForm = !this.showForm;
  }

  // Submits new transaction to backend via HTTP POST
  onSubmit(): void {
    this.submitting = true;
    this.apiService.addTransaction(this.newTxn).subscribe({
      next: (addedTxn) => {
        this.transactions.unshift(addedTxn);
        this.applyFilter();
        this.resetForm();
        this.submitting = false;
        this.showForm = false;
      },
      error: (err) => {
        console.error('Error adding transaction', err);
        this.submitting = false;
      }
    });
  }

  // Deletes a transaction via HTTP DELETE after user confirms
  onDelete(id: string | undefined): void {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.apiService.deleteTransaction(id).subscribe({
        next: () => {
          this.transactions = this.transactions.filter(t => t._id !== id);
          this.applyFilter();
        },
        error: (err) => {
          console.error('Error deleting transaction', err);
        }
      });
    }
  }

  // Filters transaction list by type (all / income / expense)
  applyFilter(): void {
    if (this.filterType === 'all') {
      this.filteredTransactions = [...this.transactions];
    } else {
      this.filteredTransactions = this.transactions.filter(t => t.type === this.filterType);
    }
  }

  // Resets the form fields to default values
  resetForm(): void {
    this.newTxn = {
      amount: 0,
      type: 'expense',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    };
  }
}
