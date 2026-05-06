import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { ArenaState, SpendEntry } from './models/spend.model';

// @Injectable with 'root' means this service is a Singleton — one shared instance across the app
@Injectable({
  providedIn: 'root'
})
export class SpendArenaService {
  private readonly STORAGE_KEY = 'spend_arena_state';
  private readonly API_URL = 'http://localhost:5001/api';

  // BehaviorSubject holds the current state and emits it to all subscribers
  private stateSubject = new BehaviorSubject<ArenaState>(this.getInitialState());
  
  // Public Observable that components subscribe to for real-time state updates
  public state$: Observable<ArenaState> = this.stateSubject.asObservable();
  private userId = '5'; // Hardcoded user ID for Sharma (demo account)

  // Constructor — resets daily data if needed and syncs with SQLite database
  constructor(private http: HttpClient) {
    this.checkAndResetDaily();
    this.syncWithDatabase();
  }

  // Loads state from localStorage, or creates seed data for demo
  private getInitialState(): ArenaState {
    const defaultState: ArenaState = {
      dailyGoal: 1000,
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

    // Default seed data so the demo is never empty
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
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(seededState));
    return seededState;
  }

  // Persists state to localStorage and notifies all subscribers
  private saveState(state: ArenaState): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    this.stateSubject.next(state);
  }

  // Checks if a new day has started — resets spends and updates streak
  private checkAndResetDaily(): void {
    const currentState = this.stateSubject.value;
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (currentState.date !== todayStr) {
      const lastDate = new Date(currentState.date);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      let newStreak = currentState.streak_days;
      
      if (diffDays === 1) {
         const totalYesterday = currentState.spends.reduce((acc, s) => acc + s.amount, 0);
         if (totalYesterday <= currentState.dailyGoal) {
            newStreak++;
         } else {
            newStreak = 0;
         }
      } else {
         newStreak = 0;
      }

      const newState: ArenaState = {
        ...currentState,
        spends: [],
        date: todayStr,
        streak_days: newStreak
      };
      this.saveState(newState);
    }
  }

  // Adds a new expense to state, persists to SQLite via HTTP POST, and resets streak if over budget
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
    
    if (newTotal > currentState.dailyGoal && currentStreak > 0) {
      currentStreak = 0;
    }

    const newState: ArenaState = {
      ...currentState,
      spends: [newSpend, ...currentState.spends],
      streak_days: currentStreak
    };
    this.saveState(newState);

    // Persist to SQL database so React Dashboard stays in sync
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

  // Updates the daily spending goal
  public updateDailyGoal(goal: number): void {
    const currentState = this.stateSubject.value;
    this.saveState({ ...currentState, dailyGoal: goal });
  }

  // Returns sum of all today's spending amounts
  public getTotalSpent(): number {
    return this.stateSubject.value.spends.reduce((acc, spend) => acc + spend.amount, 0);
  }

  // Returns spending totals grouped by category for the pie chart
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

  // Makes HTTP GET to /api/ai/consult for AI-generated spending advice
  public getAIAdvice(userId: string): Observable<{ advice: string }> {
    return this.http.get<{ advice: string }>(`${this.API_URL}/ai/consult?userId=${userId}`);
  }

  // Fetches today's transactions from SQLite and replaces local state for data consistency
  public syncWithDatabase(): void {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    this.http.get<any[]>(`${this.API_URL}/transactions?userId=${this.userId}`).subscribe({
      next: (txns) => {
        const todaySpends: SpendEntry[] = txns
          .filter(t => {
            const tDate = t.date || t.createdAt;
            return tDate && tDate.includes(todayStr) && t.type === 'expense';
          })
          .map(t => ({
            id: t.id.toString(),
            amount: t.amount,
            category: t.category as any,
            timestamp: t.date || t.createdAt
          }));
        
        const currentState = this.stateSubject.value;
        this.saveState({
          ...currentState,
          spends: todaySpends,
          date: todayStr
        });
        console.log(`[Arena] Sync complete. Found ${todaySpends.length} expenses for ${todayStr}`);
      },
      error: (err) => console.error('[Arena] DB Sync Failed:', err)
    });
  }
}
