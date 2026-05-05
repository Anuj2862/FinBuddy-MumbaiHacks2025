export interface Transaction {
  _id?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsPercentage: number;
}
