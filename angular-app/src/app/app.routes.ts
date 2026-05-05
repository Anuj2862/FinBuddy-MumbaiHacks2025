import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { SpendChallengeComponent } from './spend-challenge/spend-challenge.component';
import { SpendArenaComponent } from './spend-arena/spend-arena.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'transactions', component: TransactionsComponent },
  { path: 'challenge', component: SpendChallengeComponent },
  { path: 'arena', component: SpendArenaComponent }
];
