// ==============================
// AUTH - SIGNUP
// ==============================
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const role = document.getElementById("signupRole").value;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();
      const msg = document.getElementById("signupMessage");

      if (msg) {
        msg.innerText = data.message;
        msg.className = res.ok ? "success" : "error";
      }

      if (res.ok) {
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
      }
    } catch (err) {
      console.error("Signup Error:", err);
    }
  });
}

// ==============================
// AUTH - LOGIN
// ==============================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      const msg = document.getElementById("loginMessage");

      if (msg) {
        msg.innerText = data.message;
        msg.className = res.ok ? "success" : "error";
      }

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.user.role === "customer") {
          window.location.href = "/customer-dashboard";
        } else if (data.user.role === "store") {
          window.location.href = "/store-dashboard";
        } else {
          window.location.href = "/admin-dashboard";
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
    }
  });
}

// ==============================
// CREATE REQUEST
// ==============================
const requestForm = document.getElementById("requestForm");

if (requestForm) {
  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const style = document.getElementById("style").value;
    const budget = document.getElementById("budget").value;
    const size = document.getElementById("size").value;
    const category = document.getElementById("category").value;
    const image = document.getElementById("image").files[0];

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("style", style);
    formData.append("budget", budget);
    formData.append("size", size);
    formData.append("category", category);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });

      const data = await res.json();
      const msg = document.getElementById("requestMessage");

      if (msg) {
        msg.innerText = data.message;
        msg.className = res.ok ? "success" : "error";
      }

      if (res.ok) {
        requestForm.reset();
      }
    } catch (err) {
      console.error("Create Request Error:", err);
    }
  });
}

// ==============================
// CUSTOMER DASHBOARD
// ==============================
async function loadMyRequests() {
  const token = localStorage.getItem("token");

  const pendingBox = document.getElementById("pendingRequests");
  const acceptedBox = document.getElementById("acceptedRequests");
  const curatedBox = document.getElementById("curatedRequests");
  const paidBox = document.getElementById("paidRequests");
  const shippedBox = document.getElementById("shippedRequests");
  const rejectedBox = document.getElementById("rejectedRequests");

  if (!pendingBox) return;

  try {
    const res = await fetch("/api/requests/my", {
      headers: { Authorization: token }
    });

    const data = await res.json();

    pendingBox.innerHTML = "";
    acceptedBox.innerHTML = "";
    curatedBox.innerHTML = "";
    paidBox.innerHTML = "";
    shippedBox.innerHTML = "";
    rejectedBox.innerHTML = "";

    const totalEl = document.getElementById("custTotalRequests");
    const curatedEl = document.getElementById("custCuratedCount");
    const paidEl = document.getElementById("custPaidCount");
    const shippedEl = document.getElementById("custShippedCount");

    if (totalEl) totalEl.innerText = data.length || 0;
    if (curatedEl) curatedEl.innerText = data.filter(r => r.status === "Curated").length;
    if (paidEl) paidEl.innerText = data.filter(r => r.status === "Paid").length;
    if (shippedEl) shippedEl.innerText = data.filter(r => r.status === "Shipped").length;

    data.forEach(req => {
      const card = `
        <div class="card request-card">
          <div class="badge-row">
            <span class="mini-badge">${req.category}</span>
            <span class="status ${req.status.toLowerCase()}">${req.status}</span>
          </div>

          ${req.image ? `<img src="/uploads/${req.image}" alt="Request Image" />` : ""}

          <p><strong>Style:</strong> ${req.style}</p>
          <p><strong>Budget:</strong> ₹${req.budget}</p>
          <p><strong>Size:</strong> ${req.size}</p>
          <p><strong>Accepted By:</strong> ${req.acceptedBy || "Waiting..."}</p>

          ${req.curatedImage ? `<h4>✨ Curated Outfit</h4><img src="/uploads/${req.curatedImage}" alt="Curated Outfit" />` : ""}
          ${req.storeMessage ? `<p><strong>Store Message:</strong> ${req.storeMessage}</p>` : ""}
          ${req.curatedPrice ? `<p><strong>Final Price:</strong> ₹${req.curatedPrice}</p>` : ""}
          ${req.paymentMethod ? `<p><strong>Payment Method:</strong> ${req.paymentMethod}</p>` : ""}
          ${req.paymentStatus ? `<p><strong>Payment Status:</strong> ${req.paymentStatus}</p>` : ""}
          ${req.deliveryMode ? `<p><strong>Delivery:</strong> ${req.deliveryMode}</p>` : ""}

          ${req.status === "Curated" && req.paymentStatus === "Unpaid"
            ? `<button onclick="goToCheckout('${req._id}')">💳 Pay Now</button>`
            : ""
          }
        </div>
      `;

      if (req.status === "Pending") pendingBox.innerHTML += card;
      else if (req.status === "Accepted") acceptedBox.innerHTML += card;
      else if (req.status === "Curated") curatedBox.innerHTML += card;
      else if (req.status === "Paid") paidBox.innerHTML += card;
      else if (req.status === "Shipped") shippedBox.innerHTML += card;
      else if (req.status === "Rejected") rejectedBox.innerHTML += card;
    });

    addEmptyMessage(pendingBox, "No pending requests");
    addEmptyMessage(acceptedBox, "No accepted requests");
    addEmptyMessage(curatedBox, "No curated requests");
    addEmptyMessage(paidBox, "No paid orders");
    addEmptyMessage(shippedBox, "No shipped orders");
    addEmptyMessage(rejectedBox, "No rejected requests");
  } catch (err) {
    console.error("Load My Requests Error:", err);
  }
}

// ==============================
// STORE DASHBOARD
// ==============================
async function loadStoreRequests() {
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const newBox = document.getElementById("newStoreRequests");
  const acceptedBox = document.getElementById("acceptedStoreRequests");
  const curatedBox = document.getElementById("curatedStoreRequests");
  const paidBox = document.getElementById("paidStoreRequests");
  const shippedBox = document.getElementById("shippedStoreRequests");
  const rejectedBox = document.getElementById("rejectedStoreRequests");

  if (!newBox) return;

  try {
    const res = await fetch("/api/requests/all", {
      headers: { Authorization: token }
    });

    const data = await res.json();

    newBox.innerHTML = "";
    acceptedBox.innerHTML = "";
    curatedBox.innerHTML = "";
    paidBox.innerHTML = "";
    shippedBox.innerHTML = "";
    rejectedBox.innerHTML = "";

    const myAccepted = data.filter(r => r.acceptedBy === currentUser?.name);
    const myPaid = data.filter(r => r.acceptedBy === currentUser?.name && r.status === "Paid");
    const totalEarnings = data
      .filter(r => r.acceptedBy === currentUser?.name && (r.status === "Paid" || r.status === "Shipped"))
      .reduce((sum, r) => sum + (r.storeEarning || 0), 0);

    document.getElementById("storeTotalOrders").innerText = myAccepted.length;
    document.getElementById("storeAcceptedCount").innerText =
      data.filter(r => r.acceptedBy === currentUser?.name && r.status === "Accepted").length;
    document.getElementById("storePaidCount").innerText = myPaid.length;
    document.getElementById("storeTotalEarnings").innerText = `₹${totalEarnings}`;

    data.forEach(req => {
      const card = `
        <div class="card request-card">
          <div class="badge-row">
            <span class="mini-badge">${req.category}</span>
            <span class="status ${req.status.toLowerCase()}">${req.status}</span>
          </div>

          <p><strong>Customer:</strong> ${req.customerName}</p>
          ${req.image ? `<img src="/uploads/${req.image}" alt="Customer Request" />` : ""}
          <p><strong>Style:</strong> ${req.style}</p>
          <p><strong>Budget:</strong> ₹${req.budget}</p>
          <p><strong>Size:</strong> ${req.size}</p>

          ${req.paymentMethod ? `<p><strong>Payment Method:</strong> ${req.paymentMethod}</p>` : ""}
          ${req.paymentStatus ? `<p><strong>Payment Status:</strong> ${req.paymentStatus}</p>` : ""}
          ${req.storeEarning ? `<p><strong>Your Earning:</strong> ₹${req.storeEarning}</p>` : ""}

          ${req.status === "Pending"
            ? `
              <button onclick="acceptRequest('${req._id}')">Accept</button>
              <button class="danger-btn" onclick="rejectRequest('${req._id}')">Reject</button>
            `
            : ""
          }

          ${req.status === "Accepted" && req.acceptedBy === currentUser?.name
            ? `
              <textarea id="msg-${req._id}" placeholder="Message for customer"></textarea>
              <input type="number" id="price-${req._id}" placeholder="Final Price" />
              <input type="file" id="img-${req._id}" />
              <button onclick="curate('${req._id}')">Upload Curated Item</button>
            `
            : ""
          }

          ${req.curatedImage ? `<h4>✨ Curated Item</h4><img src="/uploads/${req.curatedImage}" alt="Curated Item" />` : ""}
          ${req.storeMessage ? `<p><strong>Store Message:</strong> ${req.storeMessage}</p>` : ""}
          ${req.curatedPrice ? `<p><strong>Curated Price:</strong> ₹${req.curatedPrice}</p>` : ""}
          ${req.adminCommission ? `<p><strong>Admin Commission:</strong> ₹${req.adminCommission}</p>` : ""}

          ${req.status === "Paid" && req.acceptedBy === currentUser?.name
            ? `<button onclick="markShipped('${req._id}')">📦 Mark as Shipped</button>`
            : ""
          }
        </div>
      `;

      if (req.status === "Pending") newBox.innerHTML += card;
      else if (req.status === "Accepted" && req.acceptedBy === currentUser?.name) acceptedBox.innerHTML += card;
      else if (req.status === "Curated" && req.acceptedBy === currentUser?.name) curatedBox.innerHTML += card;
      else if (req.status === "Paid" && req.acceptedBy === currentUser?.name) paidBox.innerHTML += card;
      else if (req.status === "Shipped" && req.acceptedBy === currentUser?.name) shippedBox.innerHTML += card;
      else if (req.status === "Rejected") rejectedBox.innerHTML += card;
    });

    addEmptyMessage(newBox, "No new requests");
    addEmptyMessage(acceptedBox, "No accepted requests");
    addEmptyMessage(curatedBox, "No curated requests");
    addEmptyMessage(paidBox, "No paid orders");
    addEmptyMessage(shippedBox, "No shipped orders");
    addEmptyMessage(rejectedBox, "No rejected requests");
  } catch (err) {
    console.error("Load Store Requests Error:", err);
  }
}

// ==============================
// STORE ACTIONS
// ==============================
async function acceptRequest(id) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`/api/requests/accept/${id}`, {
      method: "PUT",
      headers: { Authorization: token }
    });

    const data = await res.json();
    alert(data.message);
    loadStoreRequests();
  } catch (err) {
    console.error("Accept Error:", err);
  }
}

async function rejectRequest(id) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`/api/requests/reject/${id}`, {
      method: "PUT",
      headers: { Authorization: token }
    });

    const data = await res.json();
    alert(data.message);
    loadStoreRequests();
  } catch (err) {
    console.error("Reject Error:", err);
  }
}

async function curate(id) {
  const token = localStorage.getItem("token");

  const msgInput = document.getElementById(`msg-${id}`);
  const priceInput = document.getElementById(`price-${id}`);
  const imgInput = document.getElementById(`img-${id}`);

  const msg = msgInput ? msgInput.value : "";
  const price = priceInput ? priceInput.value : "";
  const img = imgInput && imgInput.files ? imgInput.files[0] : null;

  if (!price) {
    alert("Please enter price");
    return;
  }

  const formData = new FormData();
  formData.append("storeMessage", msg);
  formData.append("curatedPrice", price);
  if (img) formData.append("curatedImage", img);

  try {
    const res = await fetch(`/api/requests/curate/${id}`, {
      method: "PUT",
      headers: { Authorization: token },
      body: formData
    });

    const data = await res.json();
    alert(data.message);
    loadStoreRequests();
  } catch (err) {
    console.error("Curate Error:", err);
  }
}

async function markShipped(id) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`/api/requests/ship/${id}`, {
      method: "PUT",
      headers: { Authorization: token }
    });

    const data = await res.json();
    alert(data.message);
    loadStoreRequests();
  } catch (err) {
    console.error("Mark Shipped Error:", err);
  }
}

// ==============================
// CHECKOUT
// ==============================
function goToCheckout(id) {
  localStorage.setItem("checkoutId", id);
  window.location.href = "/checkout";
}

function selectPayment(method, el) {
  const paymentInput = document.getElementById("paymentMethod");
  if (paymentInput) paymentInput.value = method;

  document.querySelectorAll(".payment-option").forEach(opt => {
    opt.classList.remove("active");
  });

  if (el) el.classList.add("active");
  toggleFields();
}

function toggleFields() {
  const paymentInput = document.getElementById("paymentMethod");
  const upiSection = document.getElementById("upiSection");
  const cardSection = document.getElementById("cardSection");

  if (!paymentInput || !upiSection || !cardSection) return;

  const method = paymentInput.value;

  upiSection.style.display =
    method === "PhonePe" || method === "Google Pay" || method === "Other UPI"
      ? "block"
      : "none";

  cardSection.style.display = method === "Card" ? "block" : "none";
}

const checkoutForm = document.getElementById("checkoutForm");

if (checkoutForm) {
  const id = localStorage.getItem("checkoutId");

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const method = document.getElementById("paymentMethod").value;
    const upiId = document.getElementById("upiId")?.value || "";
    const cardNumber = document.getElementById("cardNumber")?.value || "";
    const deliveryMode = document.getElementById("deliveryMode")?.value || "Standard";

    if (!method) {
      alert("Please select payment method");
      return;
    }

    const cardLast4 = cardNumber ? cardNumber.slice(-4) : "";

    try {
      const res = await fetch(`/api/requests/checkout/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token
        },
        body: JSON.stringify({
          paymentMethod: method,
          upiId,
          cardLast4,
          deliveryMode
        })
      });

      const data = await res.json();
      alert(data.message || "Payment Successful");
      window.location.href = "/customer-dashboard";
    } catch (err) {
      console.error("Checkout Error:", err);
    }
  });
}

// ==============================
// ADMIN DASHBOARD
// ==============================
async function loadAdminDashboard() {
  const usersBox = document.getElementById("allUsers");
  const requestsBox = document.getElementById("allRequests");

  if (!usersBox || !requestsBox) return;

  const token = localStorage.getItem("token");

  try {
    const usersRes = await fetch("/api/admin/users", {
      headers: { Authorization: token }
    });

    const requestsRes = await fetch("/api/requests/all", {
      headers: { Authorization: token }
    });

    const users = await usersRes.json();
    const requests = await requestsRes.json();

    usersBox.innerHTML = "";
    requestsBox.innerHTML = "";

    const totalProfit = requests.reduce((sum, r) => {
      if (r.status === "Paid" || r.status === "Shipped") {
        return sum + (r.adminCommission || 0);
      }
      return sum;
    }, 0);

    document.getElementById("totalUsers").innerText = users.length || 0;
    document.getElementById("totalRequests").innerText = requests.length || 0;
    document.getElementById("paidCount").innerText =
      requests.filter(r => r.status === "Paid" || r.status === "Shipped").length;
    document.getElementById("platformProfit").innerText = `₹${totalProfit}`;

    if (users.length === 0) {
      usersBox.innerHTML = `<div class="empty-box">No users found</div>`;
    } else {
      users.forEach(user => {
        usersBox.innerHTML += `
          <div class="admin-user-card">
            <h4>${user.name}</h4>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
          </div>
        `;
      });
    }

    if (requests.length === 0) {
      requestsBox.innerHTML = `<div class="empty-box">No requests found</div>`;
    } else {
      requests.forEach(req => {
        requestsBox.innerHTML += `
          <div class="card request-card">
            <div class="badge-row">
              <span class="mini-badge">${req.category}</span>
              <span class="status ${req.status.toLowerCase()}">${req.status}</span>
            </div>

            <p><strong>Customer:</strong> ${req.customerName}</p>
            ${req.image ? `<img src="/uploads/${req.image}" alt="Request Image" />` : ""}
            <p><strong>Style:</strong> ${req.style}</p>
            <p><strong>Budget:</strong> ₹${req.budget}</p>
            <p><strong>Size:</strong> ${req.size}</p>
            ${req.acceptedBy ? `<p><strong>Accepted By:</strong> ${req.acceptedBy}</p>` : ""}
            ${req.curatedPrice ? `<p><strong>Curated Price:</strong> ₹${req.curatedPrice}</p>` : ""}
            ${req.adminCommission ? `<p><strong>Admin Profit:</strong> ₹${req.adminCommission}</p>` : ""}
            ${req.storeEarning ? `<p><strong>Store Earning:</strong> ₹${req.storeEarning}</p>` : ""}
            ${req.paymentMethod ? `<p><strong>Payment:</strong> ${req.paymentMethod}</p>` : ""}
            ${req.paymentStatus ? `<p><strong>Payment Status:</strong> ${req.paymentStatus}</p>` : ""}
          </div>
        `;
      });
    }
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
  }
}

// ==============================
// HELPERS
// ==============================
function addEmptyMessage(container, text) {
  if (container && container.innerHTML.trim() === "") {
    container.innerHTML = `<div class="empty-box">${text}</div>`;
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

function toggleSection(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.classList.toggle("active");
}

// ==============================
// AUTO LOAD
// ==============================
window.onload = () => {
  if (document.getElementById("pendingRequests")) {
    loadMyRequests();
    document.getElementById("pendingRequests").classList.add("active");
    document.getElementById("acceptedRequests")?.classList.add("active");
  }

  if (document.getElementById("newStoreRequests")) {
    loadStoreRequests();
    document.getElementById("newStoreRequests").classList.add("active");
    document.getElementById("acceptedStoreRequests")?.classList.add("active");
  }

  if (document.getElementById("allUsers")) {
    loadAdminDashboard();
  }
};