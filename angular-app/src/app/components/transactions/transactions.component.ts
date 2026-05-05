import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Transaction } from '../../models/transaction.model';

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

  newTxn: Transaction = {
    amount: 0,
    type: 'expense',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

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

  toggleForm(): void {
    this.showForm = !this.showForm;
  }

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

  applyFilter(): void {
    if (this.filterType === 'all') {
      this.filteredTransactions = [...this.transactions];
    } else {
      this.filteredTransactions = this.transactions.filter(t => t.type === this.filterType);
    }
  }

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
