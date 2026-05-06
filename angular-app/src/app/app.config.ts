import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';

// App-level configuration — registers all the global providers (services) Angular needs
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),                    // Enables URL-based navigation between pages
    provideHttpClient(),                      // Enables HttpClient for API calls to Node.js backend
    provideAnimations(),                      // Enables @angular/animations for dropIn effects
    provideCharts(withDefaultRegisterables()) // Registers Chart.js for data visualization
  ]
};
