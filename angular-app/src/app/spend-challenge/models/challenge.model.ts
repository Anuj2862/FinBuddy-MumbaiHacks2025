export interface Transaction {
  id?: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
}

export interface ChallengeState {
  daily_budget: number;
  streak_days: number;
  last_active_date: string;
}
