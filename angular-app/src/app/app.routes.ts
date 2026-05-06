import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { SpendArenaComponent } from './spend-arena/spend-arena.component';

export const routes: Routes = [
  { path: '', redirectTo: '/arena', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: 'arena', component: SpendArenaComponent }
];
