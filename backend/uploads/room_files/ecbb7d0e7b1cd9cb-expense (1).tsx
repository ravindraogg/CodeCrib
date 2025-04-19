import { useState, useEffect, ChangeEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Expense.css";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import LoadingCoin from "./LoadingCoin";
import FullScreenLoading from "./FullScreenLoading";
const base = import.meta.env.VITE_BASE_URL;

interface Expense {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  userEmail?: string;
  expenseType: string;
}

interface ExpenseCategory {
  [key: string]: string[];
}

const ExpenseTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [temporaryExpenses, setTemporaryExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [showExistingExpenses, setShowExistingExpenses] = useState<boolean>(true);
  const [showPreviousExpenseCard, setShowPreviousExpenseCard] = useState<boolean>(true);
  const [freshStart, setFreshStart] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Normalize expenseType to match server enum
  const expenseTypeRaw = location.pathname
    .split("/")
    .filter(Boolean)[1]
    .replace(/-/g, " ")
    .toLowerCase();

  const expenseTypeMap: { [key: string]: string } = {
    "business expense tracker": "business expense tracker",
    "personal expense tracker": "personal expense tracker",
    "daily expense tracker": "daily expense tracker",
    "full expense tracker": "full expense tracker",
    "other expenses": "other expenses",
  };

  const expenseType = expenseTypeMap[expenseTypeRaw] || "other expenses";

  const capitalizedExpenseType = expenseType
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const expenseCategories: ExpenseCategory = {
    business: [
      "Office Supplies",
      "Office Furniture",
      "Office Equipment",
      "Printing & Stationery",
      "Office Snacks",
      "Office Maintenance",
      "Office Decoration",
      "Office Security",
      "Software Subscriptions",
      "Hardware",
      "IT Services",
      "Cloud Services",
      "Cybersecurity",
      "Tech Support",
      "Website Expenses",
      "Mobile Apps",
      "Advertising",
      "Digital Marketing",
      "Print Marketing",
      "Social Media Marketing",
      "Event Marketing",
      "Trade Shows",
      "PR Expenses",
      "Sales Materials",
      "Legal Services",
      "Accounting Services",
      "Consulting Fees",
      "Professional Training",
      "Recruitment",
      "Background Checks",
      "Payroll Services",
      "HR Services",
      "Business Travel",
      "Client Meetings",
      "Conference Expenses",
      "Vehicle Expenses",
      "Fuel",
      "Parking",
      "Travel Insurance",
      "Accommodation",
      "Electricity",
      "Water",
      "Internet",
      "Phone Services",
      "Cleaning Services",
      "Waste Management",
      "Security Services",
      "Insurance",
      "Bank Charges",
      "Transaction Fees",
      "Loan Payments",
      "Credit Card Fees",
      "Investment Expenses",
      "Tax Payments",
      "Financial Advisory",
      "Currency Exchange",
      "Research & Development",
      "Patents & Trademarks",
      "Employee Benefits",
      "Team Building",
      "Office Rent",
      "Business Insurance",
      "Business Licenses",
      "Membership Fees",
      "Subscriptions",
      "Equipment Rental",
      "Maintenance & Repairs",
      "Business Meals",
      "Client Entertainment",
      "Office Utilities",
      "Shipping & Postage",
    ],
    personal: [
      "Groceries",
      "Restaurants",
      "Fast Food",
      "Coffee Shops",
      "Food Delivery",
      "Specialty Foods",
      "Alcohol & Bars",
      "Snacks",
      "Rent/Mortgage",
      "Property Tax",
      "Home Insurance",
      "Home Maintenance",
      "Home Improvement",
      "Furniture",
      "Home Decor",
      "Cleaning Supplies",
      "Public Transport",
      "Car Payment",
      "Car Insurance",
      "Fuel",
      "Car Maintenance",
      "Parking",
      "Ride Sharing",
      "Bicycle Expenses",
      "Health Insurance",
      "Doctor Visits",
      "Medications",
      "Dental Care",
      "Vision Care",
      "Gym Membership",
      "Sports Equipment",
      "Wellness Products",
      "Movies",
      "Games",
      "Books",
      "Music",
      "Streaming Services",
      "Concerts",
      "Sports Events",
      "Hobbies",
      "Clothing",
      "Electronics",
      "Personal Care",
      "Home Goods",
      "Gifts",
      "Apps & Software",
      "Online Subscriptions",
      "Beauty Products",
      "Tuition",
      "Books & Supplies",
      "Online Courses",
      "Training Programs",
      "Professional Development",
      "Language Learning",
      "Educational Apps",
      "School Activities",
      "Pet Care",
      "Child Care",
      "Family Activities",
      "Vacation & Travel",
      "Emergency Fund",
      "Savings",
      "Investments",
      "Charitable Donations",
      "Personal Loans",
      "Credit Card Payments",
      "Bank Fees",
      "Tax Preparation",
      "Life Insurance",
      "Identity Protection",
      "Legal Services",
      "Personal Gifts",
    ],
    daily: [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Coffee/Tea",
      "Snacks",
      "Beverages",
      "Street Food",
      "Restaurant Meals",
      "Bus Fare",
      "Train Fare",
      "Taxi",
      "Fuel",
      "Parking",
      "Bike Sharing",
      "Car Sharing",
      "Metro Pass",
      "Toiletries",
      "Hygiene Products",
      "Cosmetics",
      "Hair Care",
      "Skin Care",
      "Personal Grooming",
      "Health Supplies",
      "Medications",
      "Office Lunch",
      "Work Supplies",
      "Printing",
      "Coffee Breaks",
      "Meeting Expenses",
      "Work Transport",
      "Work Snacks",
      "Office Equipment",
      "Daily News",
      "Magazine",
      "Quick Games",
      "Music Services",
      "Video Content",
      "Social Activities",
      "Quick Hobbies",
      "Entertainment Apps",
      "Convenience Store",
      "Quick Shopping",
      "Daily Necessities",
      "Small Purchases",
      "Daily Subscriptions",
      "Quick Services",
      "Impulse Buys",
      "Daily Deals",
      "Tips",
      "Small Gifts",
      "Daily Services",
      "Quick Repairs",
      "Vending Machines",
      "ATM Fees",
      "Small Donations",
      "Daily Subscriptions",
      "Daily Parking",
      "Toll Charges",
      "Quick Snacks",
      "Water Refills",
      "Phone Credits",
      "Quick Prints",
      "Small Tools",
      "Daily Maintenance",
      "Quick Repairs",
      "Daily Supplies",
      "Small Electronics",
      "Quick Services",
    ],
    full: [
      "Housing & Utilities",
      "Transportation",
      "Food & Dining",
      "Health & Medical",
      "Personal Care",
      "Entertainment",
      "Shopping",
      "Education & Training",
      "Business Services",
      "Professional Fees",
      "Insurance",
      "Investments",
      "Debt Payments",
      "Charitable Giving",
      "Travel & Vacation",
      "Family Expenses",
      "Pet Care",
      "Hobbies & Recreation",
      "Gifts & Donations",
      "Emergency Fund",
      "Savings Goals",
      "Retirement Planning",
      "Tax Payments",
      "Legal Services",
      "Financial Services",
      "Vehicle Expenses",
      "Home Improvement",
      "Technology",
      "Subscriptions",
      "Membership Fees",
      "Professional Development",
      "Office Expenses",
      "Marketing & Advertising",
      "Equipment & Supplies",
      "Maintenance & Repairs",
      "Miscellaneous Expenses",
      "Bank Charges",
      "Credit Card Fees",
      "Loan Payments",
      "Investment Properties",
    ],
  };

  const getFilteredSuggestions = (): string[] => {
    const currentCategories =
      expenseCategories[expenseTypeRaw.split(" ")[0]] || expenseCategories.full;
    if (!categorySearch) return currentCategories;

    return currentCategories.filter((cat) =>
      cat.toLowerCase().includes(categorySearch.toLowerCase())
    );
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setCategorySearch(selectedCategory);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedUsername) setUsername(storedUsername);
    if (storedEmail) setUserEmail(storedEmail);

    setExpenses([]);
    setTemporaryExpenses([]);
    setFreshStart(false);
    fetchExpenses();
  }, [expenseType]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${base}/api/expenses/${encodeURIComponent(expenseType)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.success) {
        const formattedExpenses = response.data.expenses.map((expense: any) => ({
          _id: expense._id,
          amount: expense.amount,
          category: expense.category,
          description: expense.description,
          date: expense.date,
          userEmail: expense.userEmail,
          expenseType: expense.expenseType,
        }));
        setExpenses(formattedExpenses);
        setShowPreviousExpenseCard(formattedExpenses.length > 0);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async () => {
    if (!amount || !category || !description || !date) {
      alert("Please fill all fields");
      return;
    }

    if (isNaN(parseFloat(amount))) {
      alert("Please enter a valid amount");
      return;
    }

    setSaveStatus("saving");
    const newExpense = {
      amount: parseFloat(amount),
      category,
      description,
      date,
      userEmail,
      expenseType,
    };

    if (freshStart) {
      setTemporaryExpenses([
        ...temporaryExpenses,
        { ...newExpense, _id: Date.now().toString() },
      ]);
      setAmount("");
      setCategory("");
      setDescription("");
      setDate("");
      setCategorySearch("");
      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("");
      }, 2000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${base}/api/expenses`,
        {
          expenses: [newExpense],
          username,
          userEmail,
          expenseType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        await fetchExpenses();
        setAmount("");
        setCategory("");
        setDescription("");
        setDate("");
        setCategorySearch("");
        setSaveStatus("saved");

        setTimeout(() => {
          setSaveStatus("");
        }, 2000);

        setShowPreviousExpenseCard(false);
        setShowExistingExpenses(true);
      }
    } catch (err: any) {
      console.error("Expense addition failed:", err.response?.data || err);
      setSaveStatus("error");
      alert(
        err.response?.data?.error || "Failed to add expense. Please try again."
      );

      setTimeout(() => {
        setSaveStatus("");
      }, 2000);
    }
  };

  const getTotalExpense = () => {
    if (freshStart) {
      return temporaryExpenses.reduce((total, expense) => total + expense.amount, 0);
    }
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const handleDelete = async (expenseId: string) => {
    if (!expenseId) {
      console.error("Invalid expense ID");
      return;
    }

    if (freshStart) {
      setTemporaryExpenses(temporaryExpenses.filter((expense) => expense._id !== expenseId));
      return;
    }

    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${base}/api/expenses/${expenseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setExpenses(expenses.filter((expense) => expense._id !== expenseId));
        alert("Expense deleted successfully!");
      } else {
        throw new Error(response.data.message || "Failed to delete expense");
      }
    } catch (err: any) {
      console.error("Failed to delete expense:", err.response?.data || err);
      alert(
        err.response?.data?.message || "Failed to delete expense. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const submitForAnalysis = async (expenseType: string) => {
    try {
      const token = localStorage.getItem("token");
      const expensesToAnalyze = freshStart ? temporaryExpenses : expenses;
      // Format expenseType to match Dashboard and AnalysisPage (hyphenated, lowercase)
      const formattedExpenseType = expenseType.toLowerCase().replace(/\s+/g, "-");

      await axios.post(
        `${base}/api/expenses/analyze`,
        {
          username,
          userEmail,
          expenseType: formattedExpenseType,
          expenses: expensesToAnalyze.map((expense) => ({
            ...expense,
            userEmail,
            expenseType: formattedExpenseType,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      navigate(`/analysis/${formattedExpenseType}`);
    } catch (error) {
      console.error("Error submitting data:", error);
      alert("Failed to submit expenses for analysis. Please try again.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getFilteredExpenses = () => {
    const currentExpenses = freshStart ? temporaryExpenses : expenses;

    return currentExpenses
      .filter((expense) => {
        if (filterCategory && expense.category !== filterCategory) {
          return false;
        }

        if (searchText) {
          const searchLower = searchText.toLowerCase();
          return (
            expense.description.toLowerCase().includes(searchLower) ||
            expense.category.toLowerCase().includes(searchLower)
          );
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case "date-desc":
            return new Date(b.date).getTime() - new Date(b.date).getTime();
          case "amount-asc":
            return a.amount - b.amount;
          case "amount-desc":
            return b.amount - a.amount;
          default:
            return 0;
        }
      });
  };

  const getUniqueCategories = () => {
    const currentExpenses = freshStart ? temporaryExpenses : expenses;
    const categories = new Set<string>();
    currentExpenses.forEach((expense) => categories.add(expense.category));
    return Array.from(categories);
  };

  const filteredExpenses = getFilteredExpenses();

  const calculateDaysBetween = (startDate: Date, endDate: Date) => {
    const differenceInTime = endDate.getTime() - startDate.getTime();
    const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
    return differenceInDays + 1;
  };

  const getExpenseSummary = () => {
    const currentExpenses = freshStart ? temporaryExpenses : expenses;
    if (currentExpenses.length === 0) return {};

    const totalAmount = currentExpenses.reduce((total, expense) => total + expense.amount, 0);

    const categoryCount: Record<string, number> = {};
    currentExpenses.forEach((expense) => {
      categoryCount[expense.category] = (categoryCount[expense.category] || 0) + 1;
    });

    let mostFrequentCategory = "";
    let maxCount = 0;
    for (const category in categoryCount) {
      if (categoryCount[category] > maxCount) {
        maxCount = categoryCount[category];
        mostFrequentCategory = category;
      }
    }

    const dates = currentExpenses.map((expense) => new Date(expense.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const totalDays = calculateDaysBetween(minDate, maxDate);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    return {
      count: currentExpenses.length,
      totalAmount,
      mostFrequentCategory,
      dateRange: `${formatDate(minDate)} - ${formatDate(maxDate)} (${totalDays} days)`,
      totalDays,
    };
  };

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses to export");
      return;
    }

    const headers = ["Date", "Category", "Description", "Amount"];
    const csvContent = [
      headers.join(","),
      ...filteredExpenses.map((expense) =>
        [
          expense.date,
          `"${expense.category}"`,
          `"${expense.description}"`,
          expense.amount,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${expenseType}-expenses.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartFresh = () => {
    setShowPreviousExpenseCard(false);
    setShowExistingExpenses(false);
    setFreshStart(true);
    setTemporaryExpenses([]);
  };

  const summary = getExpenseSummary();

  return (
    <div className="expense-container">
      <motion.nav
        className="navbar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div className="navbar-left" style={{ display: "flex", alignItems: "center" }}>
          <motion.h1
            className="title"
            whileHover={{ scale: 1.05 }}
            style={{ textTransform: "capitalize", display: "flex", alignItems: "center" }}
          >
            {capitalizedExpenseType} Expenses
          </motion.h1>
        </motion.div>

        <motion.div className="username-container" whileHover={{ scale: 1.05 }}>
          <span className="username">Welcome, {username}</span>
        </motion.div>

        <motion.button
          className="back-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            window.history.back();
            setExpenses([]);
          }}
        >
          ← Go Back
        </motion.button>
      </motion.nav>

      {loading ? (
        <div className="loading-state" style={{ padding: "30px", textAlign: "center" }}>
          <LoadingCoin size="medium" text="Loading your expenses..." />
        </div>
      ) : (
        showPreviousExpenseCard &&
        expenses.length > 0 && (
          <motion.div
            className="previous-expenses-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              borderRadius: "16px",
              padding: "30px",
              color: "white",
              margin: "20px auto",
              maxWidth: "800px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>
              Your Existing {capitalizedExpenseType} Expenses
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", opacity: 0.8 }}>Total Expenses</h3>
                <p style={{ fontSize: "24px", fontWeight: "bold" }}>{summary.count}</p>
              </div>
              <div>
                <h3 style={{ fontSize: "16px", opacity: 0.8 }}>Total Amount</h3>
                <p style={{ fontSize: "24px", fontWeight: "bold" }}>
                  {formatCurrency(summary.totalAmount ?? 0)}
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: "16px", opacity: 0.8 }}>Top Category</h3>
                <p style={{ fontSize: "20px", fontWeight: "bold" }}>
                  {summary.mostFrequentCategory}
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: "16px", opacity: 0.8 }}>Time Period</h3>
                <p style={{ fontSize: "16px", fontWeight: "bold" }}>{summary.totalDays} days</p>
              </div>
            </div>
            <div
              style={{
                marginTop: "30px",
                display: "flex",
                gap: "15px",
                justifyContent: "center",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowPreviousExpenseCard(false);
                  setShowExistingExpenses(true);
                  setFreshStart(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Continue with Existing Expenses
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartFresh}
                style={{
                  background: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  color: "#4f46e5",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Start Fresh with New Expenses
              </motion.button>
            </div>
          </motion.div>
        )
      )}

      {!showPreviousExpenseCard && (
        <div className="expense-content">
          <motion.div
            className="expense-form"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 style={{ textTransform: "capitalize" }}>
              {freshStart
                ? "Add New " + capitalizedExpenseType + " Expense"
                : "Add " + capitalizedExpenseType + " Expense"}
              {freshStart && (
                <span
                  style={{
                    fontSize: "14px",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    marginLeft: "10px",
                    verticalAlign: "middle",
                  }}
                >
                  Fresh Start
                </span>
              )}
            </h2>

            <label className="input-label">Amount (₹)</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="form-input"
            />

            <label className="input-label">Category</label>
            <div className="category-search-container">
              <motion.input
                whileFocus={{ scale: 1.02 }}
                type="text"
                placeholder="Search or select category"
                value={categorySearch}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setCategorySearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="form-input"
              />

              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    className="category-suggestions"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {getFilteredSuggestions().map((suggestion, index) => (
                      <motion.div
                        key={`suggestion-${index}`}
                        className="suggestion-item"
                        onClick={() => handleCategorySelect(suggestion)}
                        whileHover={{ backgroundColor: "#f0f0f0" }}
                      >
                        {suggestion}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <label className="input-label">Description</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="text"
              placeholder="Enter a brief description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
            />

            <label className="input-label">Date</label>
            <motion.input
              whileFocus={{ scale: 1.02 }}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addExpense}
              className="add-expense-button"
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved Successfully!"
                : saveStatus === "error"
                ? "Error Saving"
                : "Add Expense"}
            </motion.button>
          </motion.div>

          {(showExistingExpenses || freshStart) && (
            <motion.div
              className="expense-list"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 style={{ textTransform: "capitalize" }}>
                {freshStart
                  ? "New " + capitalizedExpenseType + " Expenses"
                  : capitalizedExpenseType + " Expense List"}
              </h2>

              {filteredExpenses.length > 0 && (
                <motion.div
                  className="filter-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    margin: "20px 0",
                    padding: "20px",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <h3 style={{ marginBottom: "12px", fontSize: "16px", fontWeight: 600 }}>
                    Filter & Sort
                  </h3>
                  <div className="filter-options">
                    <select
                      onChange={(e) => setSortOrder(e.target.value)}
                      value={sortOrder}
                      className="form-input"
                      style={{ flex: 1 }}
                    >
                      <option value="">Sort By</option>
                      <option value="date-asc">Date (Oldest First)</option>
                      <option value="date-desc">Date (Newest First)</option>
                      <option value="amount-asc">Amount (Low to High)</option>
                      <option value="amount-desc">Amount (High to Low)</option>
                    </select>

                    <select
                      onChange={(e) => setFilterCategory(e.target.value)}
                      value={filterCategory}
                      className="form-input"
                      style={{ flex: 1 }}
                    >
                      <option value="">All Categories</option>
                      {getUniqueCategories().map((cat, index) => (
                        <option key={`category-${index}`} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </motion.div>
              )}

              {loading ? (
                <div className="loading-state" style={{ padding: "30px", textAlign: "center" }}>
                  <LoadingCoin size="medium" text="Loading your expenses..." />
                </div>
              ) : filteredExpenses.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense, index) => (
                        <motion.tr
                          key={`expense-${expense._id}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <td>{expense.date}</td>
                          <td>{expense.category}</td>
                          <td>{expense.description}</td>
                          <td>{formatCurrency(expense.amount)}</td>
                          <td>
                            <motion.button
                              className="delete-button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(expense._id)}
                            >
                              Delete
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No expenses found. Add your first expense to get started!</p>
                </div>
              )}

              <motion.div className="total-expense" whileHover={{ scale: 1.02 }}>
                <h3 style={{ textTransform: "capitalize" }}>
                  Total {capitalizedExpenseType} Expenses: {formatCurrency(getTotalExpense())}
                </h3>
              </motion.div>

              <motion.div className="action-buttons" style={{ marginTop: "30px" }}>
                <motion.button
                  className="export-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportToCSV}
                  disabled={filteredExpenses.length === 0}
                >
                  Export to CSV
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {(!showPreviousExpenseCard && expenses.length > 0) && (
        <motion.div
          className="action-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <NavLink to={`/analysis/${expenseType.toLowerCase().replace(/\s+/g, "-")}`}>
            <motion.button
              className="analysis-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => submitForAnalysis(expenseType)}
              disabled={expenses.length === 0}
            >
              Analyze Expenses
            </motion.button>
          </NavLink>
        </motion.div>
      )}

      {(!showPreviousExpenseCard && showExistingExpenses && expenses.length > 0) && (
        <motion.div
          style={{ textAlign: "center", margin: "20px 0" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <motion.button
            style={{
              background: "transparent",
              border: "1px solid #4f46e5",
              color: "#4f46e5",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(79, 70, 229, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setExpenses([]);
              setShowExistingExpenses(false);
            }}
          >
            Start Fresh (Hide Existing Expenses)
          </motion.button>
        </motion.div>
      )}

      {(!showPreviousExpenseCard && !showExistingExpenses && expenses.length > 0) && (
        <motion.div
          style={{ textAlign: "center", margin: "20px 0" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <motion.button
            style={{
              background: "transparent",
              border: "1px solid #4f46e5",
              color: "#4f46e5",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(79, 70, 229, 0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              fetchExpenses();
              setShowExistingExpenses(true);
            }}
          >
            Show Existing Expenses
          </motion.button>
        </motion.div>
      )}

      {!showPreviousExpenseCard && (
        <motion.div
          className="chat-expense-option"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            margin: "30px auto",
            padding: "20px",
            maxWidth: "800px",
            backgroundColor: "#f8fafc",
            borderRadius: "12px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
          }}
        >
          <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>
            Want to add expenses by chat?
          </h3>
          <p style={{ marginBottom: "20px", color: "#6b7280" }}>
            Describe your expenses in natural language, and our AI will extract the details for you.
          </p>
          <NavLink to={`/chat`} style={{ textDecoration: "none" }}>
            <motion.button
              style={{
                background: "linear-gradient(135deg, #4361ee, #00d4ff)",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>Try AI Chat Input</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </NavLink>
        </motion.div>
      )}

      <FullScreenLoading
        message="Deleting expense..."
        coinSize="medium"
        isLoading={deleting}
      />
    </div>
  );
};

export default ExpenseTracker;
