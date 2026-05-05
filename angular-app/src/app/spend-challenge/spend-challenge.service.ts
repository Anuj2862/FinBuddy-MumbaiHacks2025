import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Transaction, ChallengeState } from './models/challenge.model';

@Injectable({
  providedIn: 'root'
})
export class SpendChallengeService {
  private apiUrl = 'http://localhost:5001/api';
  private storageKey = 'spend_challenge_state';

  constructor(private http: HttpClient) {}

  // Fetch today's transactions and calculate the total spent
  getTodaySpent(): Observable<number> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`).pipe(
      map(transactions => {
        const todayStr = new Date().toISOString().split('T')[0];
        return transactions
          .filter(t => t.date.startsWith(todayStr))
          .reduce((sum, t) => sum + t.amount, 0);
      })
    );
  }

  // Get state from LocalStorage
  getState(): ChallengeState {
    const defaultState: ChallengeState = {
      daily_budget: 0,
      streak_days: 0,
      last_active_date: new Date().toISOString().split('T')[0]
    };
    
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultState;
  }

  // Save state to LocalStorage
  saveState(state: ChallengeState): void {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  // Check auto-reset logic based on Date
  checkAndResetState(currentState: ChallengeState): ChallengeState {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (currentState.last_active_date !== todayStr) {
      const isConsecutive = this.isConsecutiveDay(currentState.last_active_date, todayStr);
      
      // If not a consecutive day or they missed the goal, they might lose streak if not handled properly, 
      // but the requirement says: "If under budget -> streak++, else -> reset streak"
      // Since it's a new day, we just update the active date. 
      // Streak calculation is done at end of day or when transaction happens.
      // For simplicity, we just update the last_active_date here.
      if (!isConsecutive) {
         currentState.streak_days = 0;
      }
      
      currentState.last_active_date = todayStr;
      this.saveState(currentState);
    }
    return currentState;
  }
  
  private isConsecutiveDay(lastDate: string, currentDate: string): boolean {
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    const diffTime = Math.abs(current.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays === 1;
  }
}
