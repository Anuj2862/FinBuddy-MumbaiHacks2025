export interface SpendEntry {
  id: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Shopping' | 'Other';
  timestamp: string;
}

export interface ArenaState {
  dailyGoal: number;
  spends: SpendEntry[];
  date: string; // The date string (YYYY-MM-DD) representing the day these spends belong to
  streak_days: number;
}
