# FinBuddy - Team Distribution

This document outlines the specific contributions, roles, and codebase areas managed by each of the four team members for the FinBuddy full-stack project.

---

## 👥 Team Member Roles & Codebase Ownership

### 1. Member 1: UI/UX, HTML, CSS & Vanilla JS
**Role:** Lead UI/UX Designer  
**Responsibilities:** Designed the core visual layout, structured HTML templates, styled the application using custom CSS and Bootstrap, and handled generic JavaScript DOM interactions. Ensured a cohesive and responsive aesthetic across both the React and Angular frontends.

**Key Folders & Files:**
* `client/index.html`
* `angular-app/src/styles.css`
* `angular-app/src/app/**/*.html` (e.g., `transactions.component.html`, `spend-arena.component.html`)
* `angular-app/src/app/**/*.css` (e.g., `spend-challenge.component.css`, `spend-arena.component.css`)

---

### 2. Member 2: React Frontend (Core Dashboard)
**Role:** React Developer  
**Responsibilities:** Developed the primary client-side application using Vite and React. Handled the main analytics dashboard, global state management, frontend routing, and the integration of `Chart.js` for dynamic financial visualizations.

**Key Folders & Files:**
* `client/` (Entire React root directory)
* `client/src/components/` (UI Components, e.g., `Analytics.tsx`)
* `client/src/main.tsx` (React application entry point)
* `client/vite.config.ts` & `client/package.json`

---

### 3. Member 3: Backend & AI Integration (Node.js)
**Role:** Backend & AI Engineer  
**Responsibilities:** Built the core Node.js/Express server. Engineered the REST APIs, managed database connections (Mongoose/SQLite), handled file uploads (`multer`), PDF generation (`pdfkit`), and integrated Google Generative AI for financial insights.

**Key Folders & Files:**
* `server/` (Entire Backend root directory)
* `server/src/index.js` (Express server entry point and API routes)
* `server/.env` (Environment variables and API keys)
* `server/package.json` (Backend dependencies)

---

### 4. Member 4: Angular Frontend (Spend Arena)
**Role:** Angular Developer  
**Responsibilities:** Developed the specialized, gamified features of the application using Angular. Built the Spend Arena, Spend Challenges, and structured the Angular services. Integrated `ng-apexcharts` for detailed transaction visual tracking.

**Key Folders & Files:**
* `angular-app/` (Entire Angular root directory)
* `angular-app/src/app/spend-arena/` (`spend-arena.component.ts`, `spend-arena.service.ts`)
* `angular-app/src/app/spend-challenge/` (Challenge logic)
* `angular-app/src/app/components/transactions/` (Transaction history components)
* `angular-app/src/app/app.config.ts` (Angular configuration)

---

*Built for MumbaiHacks 2025*
