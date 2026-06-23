/*
 * app.js
 * Main Application Logic for CostTrack
 * Handles DOM interactions, Chart.js integrations, and links UI to db.js.
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Open the database instance as required by the specification
  const costsDB = db.openCostsDB('costsdb', 1);

  // Application State to hold Chart instances
  let pieChartInstance = null;
  let barChartInstance = null;

  // Predefined Categories for the application
  const categories = ['FOOD', 'HEALTH', 'HOUSING', 'SPORT', 'EDUCATION', 'TRANSPORTATION', 'OTHER'];

  // Cache DOM Elements
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.section');
  
  // Form Inputs
  const costSumInput = document.getElementById('cost-sum');
  const costCurrencySelect = document.getElementById('cost-currency');
  const costCategorySelect = document.getElementById('cost-category');
  const costDescInput = document.getElementById('cost-desc');
  const btnAddCost = document.getElementById('btn-add-cost');

  // Report Selects and Buttons
  const reportMonthSelect = document.getElementById('report-month');
  const reportYearSelect = document.getElementById('report-year');
  const btnReport = document.getElementById('btn-report');
  const reportResultsDiv = document.getElementById('report-results');
  const pieWrapper = document.getElementById('pie-wrapper');

  // Yearly Overview Elements
  const barYearSelect = document.getElementById('bar-year');
  const btnBar = document.getElementById('btn-bar');

  // Toast Notification Element
  const toast = document.getElementById('toast');

  /* Initialize Form & Dropdowns */

  // Populate Categories Dropdown
  categories.forEach(function (category) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    costCategorySelect.appendChild(option);
  });

  // Populate Months (1-12)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthNames.forEach(function (name, index) {
    const option = document.createElement('option');
    option.value = index + 1; // 1-based month index
    option.textContent = name;
    reportMonthSelect.appendChild(option);
  });

  // Populate Year Dropdowns Dynamically (Current Year +/- 5 Years)
  const currentYear = new Date().getFullYear();
  const allYearSelects = document.querySelectorAll('.year-select');
  
  allYearSelects.forEach(function (selectElement) {
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y;
      if (y === currentYear) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    }
  });

  // Set default current month in report select
  reportMonthSelect.value = new Date().getMonth() + 1;

  /* Toast Notification Utility */

  function showToast(message, type) {
    toast.textContent = message;
    toast.className = 'toast show ' + (type === 'success' ? 'success' : 'error');
    
    setTimeout(function () {
      toast.className = 'toast';
    }, 3500);
  }

  /* Navigation Logic (SPA) */

  navButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      const targetSectionId = button.getAttribute('data-section');

      // Update active navigation button
      navButtons.forEach(function (btn) { btn.classList.remove('active'); });
      button.classList.add('active');

      // Update visible section
      sections.forEach(function (section) {
        if (section.id === targetSectionId) {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
    });
  });

  /* Add Cost */

  btnAddCost.addEventListener('click', function () {
    const sumValue = parseFloat(costSumInput.value);
    const currencyValue = costCurrencySelect.value;
    const categoryValue = costCategorySelect.value;
    const descValue = costDescInput.value.trim();

    // Validation
    if (isNaN(sumValue) || sumValue <= 0) {
      showToast('Please enter a valid numeric amount greater than 0.', 'error');
      return;
    }
    if (!descValue) {
      showToast('Please enter a short description for the expense.', 'error');
      return;
    }

    try {
      // Add item to database using the instance reference
      costsDB.addCost({
        sum: sumValue,
        currency: currencyValue,
        category: categoryValue,
        description: descValue
      });

      showToast('Expense added successfully!', 'success');

      // Clear input fields safely
      costSumInput.value = '';
      costDescInput.value = '';
    } catch (err) {
      showToast('Failed to save expense: ' + err, 'error');
    }
  });

  /* Section 2: Monthly Report Generation & Chart */

  btnReport.addEventListener('click', function () {
    const selectedMonth = parseInt(reportMonthSelect.value, 10);
    const selectedYear = parseInt(reportYearSelect.value, 10);

    // Fetch report data using the instance method
    const reportData = costsDB.getReport(selectedYear, selectedMonth);

    if (!reportData.costs || reportData.costs.length === 0) {
      reportResultsDiv.innerHTML = '<div class="empty-msg">No expenses found for this month.</div>';
      pieWrapper.style.display = 'none';
      if (pieChartInstance) {
        pieChartInstance.destroy();
        pieChartInstance = null;
      }
      return;
    }

    // Build Table View
    let tableHtml = '<table class="report-table"><thead><tr>';
    tableHtml += '<th>Day</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th>';
    tableHtml += '</tr></thead><tbody>';

    reportData.costs.forEach(function (item) {
      tableHtml += '<tr>';
      tableHtml += '<td>' + item.date.day + '</td>';
      tableHtml += '<td><span class="cat-badge">' + item.category + '</span></td>';
      tableHtml += '<td>' + item.description + '</td>';
      tableHtml += '<td class="amount">$' + item.sum.toFixed(2) + '</td>';
      tableHtml += '</tr>';
    });

    tableHtml += '</tbody><tfoot><tr>';
    tableHtml += '<td colspan="3" style="font-weight:600">Total Spent</td>';
    tableHtml += '<td class="amount total-amount">$' + reportData.total.sum.toFixed(2) + '</td>';
    tableHtml += '</tr></tfoot></table>';

    reportResultsDiv.innerHTML = tableHtml;

    // Aggregate Data for Category Pie Chart
    const categoryTotals = {};
    categories.forEach(function (cat) { categoryTotals[cat] = 0; });

    reportData.costs.forEach(function (item) {
      if (categoryTotals[item.category] !== undefined) {
        categoryTotals[item.category] += item.sum;
      } else {
        categoryTotals['OTHER'] += item.sum;
      }
    });

    // Filter out categories with 0 spending to keep the chart clean
    const activeLabels = [];
    const activeData = [];
    categories.forEach(function (cat) {
      if (categoryTotals[cat] > 0) {
        activeLabels.push(cat);
        activeData.push(categoryTotals[cat]);
      }
    });

    // Render/Update Chart.js Pie Chart
    pieWrapper.style.display = 'block';
    const ctxPie = document.getElementById('pie-chart').getContext('2d');

    if (pieChartInstance) {
      pieChartInstance.destroy();
    }

    pieChartInstance = new Chart(ctxPie, {
      type: 'pie',
      data: {
        labels: activeLabels,
        datasets: [{
          data: activeData,
          backgroundColor: ['#6C63FF', '#43D9AD', '#FF6584', '#FFB154', '#36A2EB', '#9966FF', '#C9CBCF'],
          borderWidth: 2,
          borderColor: '#14142b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#e8e8ff', font: { family: 'DM Sans' } }
          }
        }
      }
    });
  });

  /* Section 3: Yearly Overview Chart */

  btnBar.addEventListener('click', function () {
    const selectedYear = parseInt(barYearSelect.value, 10);
    const monthlySums = new Array(12).fill(0);

    // Loop through 1-12 to gather totals for each month from the instance
    for (let m = 1; m <= 12; m++) {
      const report = costsDB.getReport(selectedYear, m);
      monthlySums[m - 1] = report.total.sum;
    }

    // Render/Update Chart.js Bar Chart
    const ctxBar = document.getElementById('bar-chart').getContext('2d');

    if (barChartInstance) {
      barChartInstance.destroy();
    }

    barChartInstance = new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Monthly Total (USD)',
          data: monthlySums,
          backgroundColor: 'rgba(108, 99, 255, 0.65)',
          borderColor: '#6C63FF',
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e8e8ff', font: { family: 'DM Sans' } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8888bb' } },
          y: { grid: { color: 'rgba(108, 99, 255, 0.1)' }, ticks: { color: '#8888bb' } }
        }
      }
    });
  });
});
