/*
 * app.js
 * Main application logic for the Cost Management App.
 * Handles UI interactions, chart rendering, and calls to db.js.
 */

"use strict";

/* ─── Constants ─────────────────────────────────────────────── */

/* Available expense categories */
const CATEGORIES = ["Food", "Education", "Health", "Transport", "Entertainment", "Shopping", "Other"];

/* Chart.js color palette for categories */
const CHART_COLORS = [
  "#6C63FF", "#FF6584", "#43D9AD", "#FFBE0B",
  "#FB5607", "#3A86FF", "#8338EC",
];

/* ─── DB Initialization ──────────────────────────────────────── */

/* Open the costs database once on load */
const costsDB = db.openCostsDB("costsdb", 1);

/* ─── Utility Helpers ───────────────────────────────────────── */

/*
 * Pads a number to two digits (e.g. 5 => "05").
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

/*
 * Formats a cost item date object to a readable string.
 * @param {Object} date - { day, month, year }
 * @returns {string}
 */
function formatDate(date) {
  return `${pad(date.day)}/${pad(date.month)}/${date.year}`;
}

/*
 * Returns the short month name for a given month number (1-12).
 * @param {number} m
 * @returns {string}
 */
function monthName(m) {
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return names[m - 1] || "";
}

/*
 * Shows a section by id and hides all others.
 * @param {string} id - section element id
 */
function showSection(id) {
  document.querySelectorAll(".section").forEach(function (s) {
    s.classList.remove("active");
  });
  document.getElementById(id).classList.add("active");

  /* Update nav active state */
  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.section === id);
  });
}

/*
 * Displays a transient toast notification.
 * @param {string} message
 * @param {string} type - "success" | "error"
 */
function showToast(message, type) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast show " + (type || "success");
  setTimeout(function () {
    toast.className = "toast";
  }, 3000);
}

/* ─── Populate Dropdowns ────────────────────────────────────── */

/*
 * Fills category <select> elements with the CATEGORIES list.
 */
function populateCategories() {
  const selects = document.querySelectorAll(".category-select");
  selects.forEach(function (sel) {
    CATEGORIES.forEach(function (cat) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
  });
}

/*
 * Fills year <select> elements with a range of years.
 */
function populateYears() {
  const currentYear = new Date().getFullYear();
  const selects = document.querySelectorAll(".year-select");
  selects.forEach(function (sel) {
    for (let y = currentYear; y >= currentYear - 10; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

/*
 * Fills month <select> elements with month names.
 */
function populateMonths() {
  const currentMonth = new Date().getMonth() + 1;
  const selects = document.querySelectorAll(".month-select");
  selects.forEach(function (sel) {
    for (let m = 1; m <= 12; m++) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = monthName(m);
      if (m === currentMonth) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

/* ─── Add Cost Form ──────────────────────────────────────────── */

/*
 * Handles submission of the Add Cost form.
 */
function handleAddCost() {
  const sumInput = document.getElementById("cost-sum");
  const currencyInput = document.getElementById("cost-currency");
  const categoryInput = document.getElementById("cost-category");
  const descInput = document.getElementById("cost-desc");

  const sum = parseFloat(sumInput.value);

  if (isNaN(sum) || sum <= 0) {
    showToast("Please enter a valid positive amount.", "error");
    return;
  }
  if (!descInput.value.trim()) {
    showToast("Description cannot be empty.", "error");
    return;
  }

  try {
    costsDB.addCost({
      sum: sum,
      currency: currencyInput.value,
      category: categoryInput.value,
      description: descInput.value.trim(),
    });

    /* Reset form fields */
    sumInput.value = "";
    descInput.value = "";

    showToast("Cost item added successfully! ✓", "success");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

/* ─── Monthly Report ─────────────────────────────────────────── */

/* Holds a reference to the current pie chart instance */
let pieChartInstance = null;

/*
 * Generates and renders the monthly report for the selected year/month.
 */
function handleMonthlyReport() {
  const year = parseInt(document.getElementById("report-year").value, 10);
  const month = parseInt(document.getElementById("report-month").value, 10);

  const report = costsDB.getReport(year, month);

  /* Render the costs table */
  renderReportTable(report);

  /* Render the pie chart */
  renderPieChart(report);
}

/*
 * Renders the report results table.
 * @param {Object} report - Report object from getReport()
 */
function renderReportTable(report) {
  const container = document.getElementById("report-results");

  if (report.costs.length === 0) {
    container.innerHTML = `<p class="empty-msg">No costs found for ${monthName(report.month)} ${report.year}.</p>`;
    return;
  }

  let rows = report.costs
    .map(function (item) {
      return `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td><span class="cat-badge">${item.category}</span></td>
        <td>${item.description}</td>
        <td class="amount">$${item.sum.toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  container.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Date</th><th>Category</th><th>Description</th><th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total</strong></td>
          <td class="amount total-amount"><strong>$${report.total.sum.toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>`;
}

/*
 * Renders a pie chart grouping costs by category.
 * @param {Object} report - Report object from getReport()
 */
function renderPieChart(report) {
  const canvas = document.getElementById("pie-chart");
  const wrapper = document.getElementById("pie-wrapper");

  if (report.costs.length === 0) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "block";

  /* Aggregate totals per category */
  const totals = {};
  report.costs.forEach(function (item) {
    totals[item.category] = (totals[item.category] || 0) + item.sum;
  });

  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = labels.map(function (_, i) {
    return CHART_COLORS[i % CHART_COLORS.length];
  });

  /* Destroy previous chart instance to avoid duplicates */
  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  pieChartInstance = new Chart(canvas, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderColor: "#1a1a2e",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: "#e0e0ff", font: { size: 13 } },
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

/* ─── Yearly Bar Chart ───────────────────────────────────────── */

/* Holds a reference to the current bar chart instance */
let barChartInstance = null;

/*
 * Generates and renders the yearly bar chart.
 */
function handleYearlyChart() {
  const year = parseInt(document.getElementById("bar-year").value, 10);

  /* Fetch totals for each of the 12 months */
  const monthlyTotals = [];
  for (let m = 1; m <= 12; m++) {
    const report = costsDB.getReport(year, m);
    monthlyTotals.push(report.total.sum);
  }

  renderBarChart(year, monthlyTotals);
}

/*
 * Renders a bar chart showing monthly totals for a given year.
 * @param {number} year
 * @param {Array}  monthlyTotals - 12-element array of sums
 */
function renderBarChart(year, monthlyTotals) {
  const canvas = document.getElementById("bar-chart");
  const labels = [];
  for (let m = 1; m <= 12; m++) {
    labels.push(monthName(m));
  }

  /* Destroy previous chart instance */
  if (barChartInstance) {
    barChartInstance.destroy();
  }

  barChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Total Costs ${year} (USD)`,
          data: monthlyTotals,
          backgroundColor: CHART_COLORS,
          borderColor: "#1a1a2e",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: { color: "#e0e0ff" },
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#e0e0ff",
            callback: function (v) {
              return "$" + v;
            },
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#e0e0ff", font: { size: 13 } },
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ` $${ctx.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

/* ─── Navigation ─────────────────────────────────────────────── */

/*
 * Binds click events to all nav buttons.
 */
function initNav() {
  document.querySelectorAll(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showSection(btn.dataset.section);
    });
  });
}

/* ─── Boot ───────────────────────────────────────────────────── */

/*
 * Initialises the application once the DOM is ready.
 */
document.addEventListener("DOMContentLoaded", function () {
  populateCategories();
  populateYears();
  populateMonths();
  initNav();

  /* Default section */
  showSection("section-add");

  /* Add Cost button */
  document.getElementById("btn-add-cost").addEventListener("click", handleAddCost);

  /* Monthly Report button */
  document.getElementById("btn-report").addEventListener("click", handleMonthlyReport);

  /* Yearly Bar Chart button */
  document.getElementById("btn-bar").addEventListener("click", handleYearlyChart);
});
