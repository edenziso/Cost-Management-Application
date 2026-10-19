# 💳 CostTrack – Cost Management Application

A responsive web app for logging personal expenses and turning them into clear monthly and yearly insights through interactive charts.

Built as the final project of an Advanced Frontend (OOP) course at Bar-Ilan University.

**Live demo:** https://cost-management-application.onrender.com
*(Hosted on Render's free tier. The first load may take up to a minute while the server wakes up.)*

---

## Features

- **Log expenses** with amount, currency (USD, ILS, EUR), category and description
- **7 expense categories:** Food, Health, Housing, Sport, Education, Transportation, Other
- **Monthly report:** pick a month and year to see a detailed expense table with a total, plus a pie chart of spending by category
- **Yearly overview:** a bar chart of spending across all 12 months to spot trends
- **Persistent data:** expenses are saved in the browser, so they stay after a refresh
- **Responsive design** that works on desktop and mobile

## Screenshots

<!-- Add 2–3 screenshots here, e.g.: -->
<!-- ![Add expense](screenshots/add-expense.png) -->
<!-- ![Monthly report](screenshots/monthly-report.png) -->
<!-- ![Yearly overview](screenshots/yearly-overview.png) -->

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | HTML5, CSS3 |
| Logic | Vanilla JavaScript (ES5/ES6, prototype-based OOP) |
| Charts | [Chart.js](https://www.chartjs.org/) |
| Storage | Browser `localStorage`, wrapped in a custom database library |
| Hosting | Render |

## Project Structure

```
├── index.html   # App layout: add expense, monthly report, yearly overview
├── style.css    # Styling and responsive layout
├── db.js        # Custom database library (openCostsDB, addCost, getReport)
└── app.js       # UI logic, event handling and Chart.js rendering
```

### The `db.js` library

`db.js` exposes a global `db` object that works like a small database API on top of `localStorage`:

```js
const costsDB = db.openCostsDB('costsdb', 1);

costsDB.addCost({
  sum: 45.5,
  currency: 'ILS',
  category: 'FOOD',
  description: 'Groceries'
});

const report = costsDB.getReport(2026, 10); // year, month
```

`addCost` validates its input and stores each item with its date, and `getReport` returns that month's items together with their total.

## Running Locally

No build step or installation is needed.

1. Clone the repository:
   ```bash
   git clone https://github.com/edenziso/Cost-Management-Application.git
   ```
2. Open `index.html` in your browser.

## Future Improvements

- Currency conversion, so totals combine USD, ILS and EUR expenses correctly
- Editing and deleting expenses
- Exporting reports to CSV or PDF

## Author

**Eden Ziso** – Product Manager | AI, Data & UX
[LinkedIn](https://www.linkedin.com/in/eden-ziso)
