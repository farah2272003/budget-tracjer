class Transaction {
  constructor(description, amount, type = "expense", category = "General") {
    this.id = Date.now();
    this.description = description;
    this.amount = Number(parseFloat(amount).toFixed(2)); 
    this.type = type;
    this.category = category || "General";
    this.dateISO = new Date().toISOString(); // for sorting
    this.date = new Date().toLocaleDateString(); // for display
  }
}

//  LOGIN PAGE 
if (document.getElementById("loginBtn")) {
  document.getElementById("loginBtn").addEventListener("click", () => {
    const uname = document.getElementById("username").value.trim();
    if (!uname) {
      document.getElementById("loginError").textContent = "Please enter a username.";
      return;
    }
    sessionStorage.setItem("username", uname);
    if (!localStorage.getItem(`budget_${uname}`)) {
      localStorage.setItem(`budget_${uname}`, JSON.stringify([]));
    }
    window.location.href = "dashboard.html";
  });
}

//  DASHBOARD
if (document.getElementById("logoutBtn")) {
  const username = sessionStorage.getItem("username");
  if (!username) window.location.href = "index.html";

  let transactions = JSON.parse(localStorage.getItem(`budget_${username}`)) || [];
  let editId = null;
  let sortDirection = { date: true, amount: true };

  const categorySelect = document.getElementById("filterCategory");
  document.getElementById("welcomeUser").textContent = `Welcome, ${username}`;

  //Clean Numbers on Load
  transactions = transactions.map(t => ({
    ...t,
    amount: Number(parseFloat(t.amount).toFixed(2))
  }));
  localStorage.setItem(`budget_${username}`, JSON.stringify(transactions));

  //  Load Categories
  function loadCategories() {
    categorySelect.innerHTML = `<option value="all">All Categories</option>`;
    const categories = [...new Set(transactions.map(t => t.category))];
    categories.forEach(cat => {
      categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
  }

  //  Render Summary 
  const renderSummary = () => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

    // Clean and round
    income = Number(income.toFixed(2));
    expense = Number(expense.toFixed(2));

    const balance = Number((income - expense).toFixed(2));
    const oweMoney = balance < 0 ? Math.abs(balance) : 0;

    // Update UI
    animateNumber(document.getElementById("balanceCard"), balance);
    animateNumber(document.getElementById("incomeCard"), income);
    animateNumber(document.getElementById("expenseCard"), expense);
    animateNumber(document.getElementById("oweCard"), oweMoney);

    // Warning if negative
    const warningContainer = document.getElementById("balanceWarning");
    if (balance < 0) {
      warningContainer.textContent = `⚠ Your balance is negative — you owe $${oweMoney.toFixed(2)}!`;
      warningContainer.style.display = "block";
    } else {
      warningContainer.style.display = "none";
    }

    renderChart();
  };

  //  Render Transactions
  const renderTransactions = (searchText = "", category = "all") => {
    const tbody = document.getElementById("transactionTableBody");
    tbody.innerHTML = "";

    transactions
      .filter(t => t.description.toLowerCase().includes(searchText.toLowerCase()))
      .filter(t => category === "all" || t.category === category)
      .forEach(t => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${t.date}</td>
          <td>${t.description}</td>
          <td class="${t.type}">$${t.amount.toFixed(2)}</td>
          <td><span class="badge ${t.type}">${t.type}</span></td>
          <td><span class="badge">${t.category}</span></td>
          <td>
            <button type="button" onclick="editTransaction(${t.id})">✏️</button>
            <button type="button" onclick="deleteTransaction(${t.id})">🗑️</button>
          </td>
        `;
        tbody.appendChild(row);
      });
  };

  // Add Transaction 
  document.getElementById("addTransaction").addEventListener("click", () => {
    const desc = document.getElementById("desc").value.trim();
    const amount = Number(parseFloat(document.getElementById("amount").value).toFixed(2));
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value.trim() || "General";

    if (!desc || isNaN(amount) || amount <= 0) {
      return alert("Please enter a valid positive amount.");
    }

    const t = new Transaction(desc, amount, type, category);
    transactions.push(t);
    localStorage.setItem(`budget_${username}`, JSON.stringify(transactions));

    renderSummary();
    renderTransactions();
    loadCategories();

    document.getElementById("desc").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("category").value = "";
  });

  //  Delete 
  window.deleteTransaction = (id) => {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(`budget_${username}`, JSON.stringify(transactions));
    renderSummary();
    renderTransactions();
    loadCategories();
  };

  //  Edit 
  window.editTransaction = (id) => {
    const t = transactions.find(tx => tx.id === id);
    editId = id;
    document.getElementById("editDesc").value = t.description;
    document.getElementById("editAmount").value = t.amount;
    document.getElementById("editType").value = t.type;
    document.getElementById("editCategory").value = t.category;
    document.getElementById("editModal").classList.remove("hidden");
  };

  document.getElementById("saveEdit").addEventListener("click", () => {
    const t = transactions.find(tx => tx.id === editId);
    t.description = document.getElementById("editDesc").value.trim();
    t.amount = Number(parseFloat(document.getElementById("editAmount").value).toFixed(2));
    t.type = document.getElementById("editType").value;
    t.category = document.getElementById("editCategory").value.trim() || "General";
    localStorage.setItem(`budget_${username}`, JSON.stringify(transactions));
    renderSummary();
    renderTransactions();
    loadCategories();
    document.getElementById("editModal").classList.add("hidden");
  });

  document.getElementById("closeEdit").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
  });

  //  Sorting 
  window.sortTable = (field) => {
    transactions.sort((a, b) => {
      if (field === "date") {
        const d1 = new Date(a.dateISO);
        const d2 = new Date(b.dateISO);
        return sortDirection.date ? d1 - d2 : d2 - d1;
      }
      if (field === "amount") {
        return sortDirection.amount
          ? a.amount - b.amount
          : b.amount - a.amount;
      }
    });
    sortDirection[field] = !sortDirection[field];
    renderTransactions(document.getElementById("search").value, categorySelect.value);
  };

  //  Filters 
  document.getElementById("search").addEventListener("input", e => {
    renderTransactions(e.target.value, categorySelect.value);
  });

  categorySelect.addEventListener("change", e => {
    renderTransactions(document.getElementById("search").value, e.target.value);
  });

  //  Theme Toggle 
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
  });
  if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark");

  //  Logout 
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });

  //  Chart 
  let chart;
  const renderChart = () => {
    const categories = {};
    transactions.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const ctx = document.getElementById("categoryChart").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: [
            "#a68b01ff", // Yellow
            "#fff369ff", // Blue
            "#C62828", // Red
            "#FF9800", // Orange
            "#2E7D32" // Green
          ]
        }]
      },
      options: {
        plugins: {
          datalabels: {
            color: "#fff",
            formatter: (value, ctx) => {
              const dataArr = ctx.chart.data.datasets[0].data;
              const sum = dataArr.reduce((a, b) => a + b, 0);
              if (sum === 0) return "0%";
              return ((value * 100) / sum).toFixed(1) + "%";
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  };

  //  Animated Numbers 
  const animateNumber = (el, value) => {
    let start = 0;
    const step = () => {
      start += (value - start) / 10;
      el.textContent = Math.round(start);
      if (Math.abs(value - start) > 0.01) requestAnimationFrame(step);
    };
    step();
  };

  //  Initial Render 
  renderSummary();
  renderTransactions();
  loadCategories();
}
