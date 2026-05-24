/*
 * db.js
 * Cost Management Database Library
 * Wraps localStorage for cost item storage and retrieval.
 * Exposes a global `db` object with openCostsDB and getReport methods.
 */

(function (global) {
  "use strict";

  /* Key used to store all cost items in localStorage */
  const STORAGE_KEY = "costsdb_items";

  /*
   * CostsDB constructor
   * Represents an open database instance.
   * @param {string} name    - The database name
   * @param {number} version - The database version
   */
  function CostsDB(name, version) {
    this.name = name;
    this.version = version;
  }

  /*
   * Reads all cost items from localStorage.
   * @returns {Array} Array of cost item objects
   */
  function readAllCosts() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      /* If parsing fails, return empty array */
      return [];
    }
  }

  /*
   * Writes an array of cost items to localStorage.
   * @param {Array} items - Array of cost item objects
   */
  function writeAllCosts(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  /*
   * addCost
   * Adds a new cost item to the database.
   * @param {Object} cost - Object with sum, currency, category, description
   * @returns {Object} The newly added cost item including its date
   */
  CostsDB.prototype.addCost = function (cost) {
    /* Validate required fields */
    if (
      cost === null ||
      typeof cost !== "object" ||
      typeof cost.sum !== "number" ||
      typeof cost.currency !== "string" ||
      typeof cost.category !== "string" ||
      typeof cost.description !== "string"
    ) {
      throw new Error(
        "addCost requires an object with sum (number), currency, category, and description (strings)."
      );
    }

    const now = new Date();

    /* Build the cost item with a date stamp */
    const newItem = {
      sum: cost.sum,
      currency: cost.currency,
      category: cost.category,
      description: cost.description,
      date: {
        day: now.getDate(),
        month: now.getMonth() + 1, // getMonth is zero-based
        year: now.getFullYear(),
      },
    };

    const allCosts = readAllCosts();
    allCosts.push(newItem);
    writeAllCosts(allCosts);

    return newItem;
  };

  /*
   * getReport (instance method)
   * Returns a detailed report for a specific year and month.
   * @param {number} year  - The full year (e.g. 2025)
   * @param {number} month - The month number 1–12
   * @returns {Object} Report object with year, month, costs array, and total
   */
  CostsDB.prototype.getReport = function (year, month) {
    const allCosts = readAllCosts();

    /* Filter costs matching the requested year and month */
    const filtered = allCosts.filter(function (item) {
      return item.date.year === year && item.date.month === month;
    });

    /* Calculate total sum (USD only for simplicity; currency taken from first item or default) */
    let totalSum = 0;
    filtered.forEach(function (item) {
      totalSum += item.sum;
    });

    return {
      year: year,
      month: month,
      costs: filtered,
      total: {
        currency: "USD",
        sum: totalSum,
      },
    };
  };

  /*
   * db (global object)
   * The public API exposed on the global object.
   */
  const db = {
    /*
     * openCostsDB
     * Opens (or creates) a cost database instance.
     * @param {string} name    - The database name
     * @param {number} version - The database version
     * @returns {CostsDB} A CostsDB instance
     */
    openCostsDB: function (name, version) {
      if (typeof name !== "string" || typeof version !== "number") {
        throw new Error("openCostsDB requires a string name and a number version.");
      }
      return new CostsDB(name, version);
    },

    /*
     * getReport (static / global-level)
     * Returns a report for ALL stored costs, optionally filtered by currency.
     * Matches the test sample: db.getReport("USD")
     * @param {string} currency - Currency filter (e.g. "USD")
     * @returns {Object} Report with costs array and total
     */
    getReport: function (currency) {
      const allCosts = readAllCosts();

      /* Filter by currency if provided */
      const filtered =
        typeof currency === "string"
          ? allCosts.filter(function (item) {
              return item.currency === currency;
            })
          : allCosts;

      let totalSum = 0;
      filtered.forEach(function (item) {
        totalSum += item.sum;
      });

      return {
        costs: filtered,
        total: {
          currency: currency || "USD",
          sum: totalSum,
        },
      };
    },
  };

  /* Attach db to the global object (window in browsers) */
  global.db = db;
})(typeof window !== "undefined" ? window : global);
