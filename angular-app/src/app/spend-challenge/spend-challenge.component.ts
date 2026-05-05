import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SpendChallengeService } from './spend-challenge.service';
import { ChallengeState } from './models/challenge.model';
import { Subject, takeUntil, catchError, of } from 'rxjs';

@Component({
  selector: 'app-spend-challenge',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './spend-challenge.component.html',
  styleUrls: ['./spend-challenge.component.css']
})
export class SpendChallengeComponent implements OnInit, OnDestroy {
  budgetForm: FormGroup;
  
  // State variables
  budgetGoal: number = 0;
  spentAmount: number = 0;
  progress: number = 0;
  streak: number = 0;
  badges: string[] = [];
  feedbackMessage: string = '';
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private challengeService: SpendChallengeService
  ) {
    this.budgetForm = this.fb.group({
      budget: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.initChallenge();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initChallenge(): void {
    // 1. Get and process state
    let state = this.challengeService.getState();
    state = this.challengeService.checkAndResetState(state);
    
    this.budgetGoal = state.daily_budget;
    this.streak = state.streak_days;
    
    // Default budget if none exists
    if (this.budgetGoal === 0) {
      this.budgetGoal = 500; // Default 500
      state.daily_budget = this.budgetGoal;
      this.challengeService.saveState(state);
    }
    
    this.budgetForm.patchValue({ budget: this.budgetGoal });
    
    // 2. Fetch today's transactions
    this.fetchTransactionsAndCalculate(state);
    
    // 3. Setup badges based on current streak
    this.calculateBadges();
  }

  setBudget(): void {
    if (this.budgetForm.valid) {
      const newBudget = this.budgetForm.value.budget;
      this.budgetGoal = newBudget;
      
      const state = this.challengeService.getState();
      state.daily_budget = this.budgetGoal;
      this.challengeService.saveState(state);
      
      // Recalculate progress and feedback with new budget
      this.calculateProgress();
      this.budgetForm.markAsPristine();
    }
  }

  private fetchTransactionsAndCalculate(state: ChallengeState): void {
    this.challengeService.getTodaySpent()
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error fetching transactions:', err);
          return of(0); // return 0 on error
        })
      )
      .subscribe(spent => {
        this.spentAmount = spent;
        this.calculateProgress();
        this.updateStreakLogic(state);
      });
  }

  private calculateProgress(): void {
    if (this.budgetGoal > 0) {
      this.progress = Math.min((this.spentAmount / this.budgetGoal) * 100, 100);
    } else {
      this.progress = 0;
    }
    this.updateFeedback();
  }

  private updateFeedback(): void {
    if (this.progress < 50) {
      this.feedbackMessage = "Looking good! You're well within your daily goal.";
    } else if (this.progress <= 80) {
      this.feedbackMessage = "You're on track. Keep it up!";
    } else if (this.progress < 100) {
      this.feedbackMessage = "Budget almost used! Spend carefully today.";
    } else {
      this.feedbackMessage = "Budget exceeded! Try to save up tomorrow.";
    }
  }

  private calculateBadges(): void {
    this.badges = [];
    if (this.streak >= 3) this.badges.push('🥉 Beginner Saver');
    if (this.streak >= 5) this.badges.push('🥈 Consistent Saver');
    if (this.streak >= 7) this.badges.push('🥇 Master Saver');
    if (this.streak >= 14) this.badges.push('💎 Financial Guru');
  }

  private updateStreakLogic(state: ChallengeState): void {
    // In a real app, this might be evaluated at the end of the day or server-side.
    // For this client-only logic, we update the streak when we first load the page for a new day,
    // or keep it same if still the same day. 
    // However, if the user exceeds the budget TODAY, we might lose the streak.
    
    // For simplicity: streak increments are handled on daily reset (if yesterday was under budget)
    // Wait, the requirement says: "If under budget -> streak++, else -> reset streak"
    // To implement "live" tracking, if they exceed 100% *right now*, reset it.
    if (this.progress >= 100 && this.streak > 0) {
       this.streak = 0;
       state.streak_days = 0;
       this.challengeService.saveState(state);
       this.calculateBadges();
    }
  }
}
