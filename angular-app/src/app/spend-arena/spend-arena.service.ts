import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ArenaState, SpendEntry } from './models/spend.model';

@Injectable({
  providedIn: 'root'
})
export class SpendArenaService {
  private readonly STORAGE_KEY = 'spend_arena_state';
  private readonly API_URL = 'http://localhost:5001/api';
  private stateSubject = new BehaviorSubject<ArenaState>(this.getInitialState());
  
  public state$: Observable<ArenaState> = this.stateSubject.asObservable();
  private userId = '5'; // Corrected ID for Sharma for Demo

  constructor(private http: HttpClient) {
    this.checkAndResetDaily();
  }

  private getInitialState(): ArenaState {
    const defaultState: ArenaState = {
      dailyGoal: 1000, // Default goal
      spends: [],
      date: new Date().toISOString().split('T')[0],
      streak_days: 0
    };
    
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date && parsed.spends && parsed.spends.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing Arena State from localStorage', e);
      }
    }

    // Default Seed Data for Demo
    const todayStr = new Date().toISOString().split('T')[0];
    const seedSpends: SpendEntry[] = [
      { id: 's1', amount: 320, category: 'Shopping', timestamp: new Date().toISOString() },
      { id: 's2', amount: 150, category: 'Food', timestamp: new Date().toISOString() },
      { id: 's3', amount: 80,  category: 'Transport', timestamp: new Date().toISOString() },
      { id: 's4', amount: 50,  category: 'Other', timestamp: new Date().toISOString() }
    ];

    const seededState: ArenaState = {
      dailyGoal: 1000,
      spends: seedSpends,
      date: todayStr,
      streak_days: 5
    };
    
    // Save the seeded state so it persists
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(seededState));
    return seededState;
  }

  private saveState(state: ArenaState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    this.stateSubject.next(state);
  }

  private checkAndResetDaily(): void {
    const currentState = this.stateSubject.value;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (currentState.date !== todayStr) {
      // Check if they were under budget yesterday
      const lastDate = new Date(currentState.date);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      let newStreak = currentState.streak_days;
      
      if (diffDays === 1) {
         // Consecutive day
         const totalYesterday = currentState.spends.reduce((acc, s) => acc + s.amount, 0);
         if (totalYesterday <= currentState.dailyGoal) {
            newStreak++;
         } else {
            newStreak = 0; // Exceeded goal
         }
      } else {
         newStreak = 0; // Missed a day
      }

      // Reset spends for the new day
      const newState: ArenaState = {
        ...currentState,
        spends: [],
        date: todayStr,
        streak_days: newStreak
      };
      this.saveState(newState);
    }
  }

  public addSpend(amount: number, category: 'Food' | 'Transport' | 'Shopping' | 'Other'): void {
    const currentState = this.stateSubject.value;
    const newSpend: SpendEntry = {
      id: Date.now().toString(),
      amount,
      category,
      timestamp: new Date().toISOString()
    };

    const newTotal = currentState.spends.reduce((acc, s) => acc + s.amount, 0) + amount;
    let currentStreak = currentState.streak_days;
    
    // Immediate streak reset if they break the budget today
    if (newTotal > currentState.dailyGoal && currentStreak > 0) {
      currentStreak = 0;
    }

    const newState: ArenaState = {
      ...currentState,
      spends: [newSpend, ...currentState.spends], // Newest first
      streak_days: currentStreak
    };
    this.saveState(newState);

    // PERSIST TO SQL DB
    this.http.post(`${this.API_URL}/transactions`, {
      userId: this.userId,
      amount: amount,
      type: 'expense',
      category: category,
      description: 'Spend Arena Drop',
      date: new Date()
    }).subscribe({
      next: (res) => console.log('[Arena] Persisted to SQL:', res),
      error: (err) => console.error('[Arena] DB Sync Failed:', err)
    });
  }

  public updateDailyGoal(goal: number): void {
    const currentState = this.stateSubject.value;
    this.saveState({ ...currentState, dailyGoal: goal });
  }

  public getTotalSpent(): number {
    return this.stateSubject.value.spends.reduce((acc, spend) => acc + spend.amount, 0);
  }

  public getCategorySplit(): { [key: string]: number } {
    const spends = this.stateSubject.value.spends;
    const split: { [key: string]: number } = {
      'Food': 0,
      'Transport': 0,
      'Shopping': 0,
      'Other': 0
    };

    spends.forEach(s => {
      split[s.category] += s.amount;
    });

    return split;
  }
}
