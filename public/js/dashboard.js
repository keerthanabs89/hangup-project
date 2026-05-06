// Modern Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initializeDashboard();
});

function initializeDashboard() {
  // Navigation handling
  setupNavigation();

  // Load user data
  loadUserData();

  // Load dashboard content
  loadDashboardContent();

  // Setup search functionality
  setupSearch();

  // Setup theme toggle
  setupThemeToggle();

  // Setup mobile menu
  setupMobileMenu();

  // Setup form handling
  setupForms();
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();

      const section = this.getAttribute('data-section');

      // Update active states
      document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(nav => {
        nav.classList.remove('active');
      });
      this.classList.add('active');

      // Show corresponding section
      showSection(section);

      // Close mobile menu if open
      closeMobileMenu();
    });
  });
}

function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // Show selected section
  const targetSection = document.getElementById(sectionName + '-section');
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Load section-specific content
  switch(sectionName) {
    case 'dashboard':
      loadDashboardContent();
      break;
    case 'orders':
      loadOrdersContent();
      break;
    case 'requests':
      // Form is already there
      break;
    case 'wishlist':
      loadWishlistContent();
      break;
    case 'profile':
      loadProfileContent();
      break;
    case 'settings':
      loadSettingsContent();
      break;
  }
}

function loadUserData() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userNameElement = document.getElementById('userName');
  const profileNameElement = document.getElementById('profileName');
  const profileEmailElement = document.getElementById('profileEmail');

  if (userNameElement && user.name) {
    userNameElement.textContent = user.name;
  }

  if (profileNameElement && user.name) {
    profileNameElement.textContent = user.name;
  }

  if (profileEmailElement && user.email) {
    profileEmailElement.textContent = user.email;
  }
}

async function loadDashboardContent() {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/requests/my', {
      headers: { Authorization: token }
    });

    const requests = await response.json();

    // Update stats
    updateDashboardStats(requests);

    // Load recent activity
    loadRecentActivity(requests);

  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function updateDashboardStats(requests) {
  const stats = {
    total: requests.length,
    curated: requests.filter(r => r.status === 'Curated').length,
    paid: requests.filter(r => r.status === 'Paid').length,
    shipped: requests.filter(r => r.status === 'Shipped').length,
    delivered: requests.filter(r => r.status === 'Delivered').length
  };

  Object.keys(stats).forEach(key => {
    const element = document.getElementById(`cust${key.charAt(0).toUpperCase() + key.slice(1)}Count`);
    if (element) {
      element.textContent = stats[key];
    }
  });
}

function loadRecentActivity(requests) {
  const activityList = document.getElementById('recentActivity');
  if (!activityList) return;

  // Get last 5 activities
  const recentRequests = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const activities = recentRequests.map(request => {
    const status = getStatusInfo(request.status);
    const timeAgo = getTimeAgo(new Date(request.createdAt));

    return `
      <div class="activity-item">
        <div class="activity-icon" style="background: ${status.color}">
          <i class="${status.icon}"></i>
        </div>
        <div class="activity-content">
          <h4>${request.style}</h4>
          <p>${status.text}</p>
        </div>
        <div class="activity-time">${timeAgo}</div>
      </div>
    `;
  }).join('');

  activityList.innerHTML = activities || '<p class="empty-state">No recent activity</p>';
}

function getStatusInfo(status) {
  const statusMap = {
    'Pending': { text: 'Request submitted', icon: 'fas fa-clock', color: '#f59e0b' },
    'Accepted': { text: 'Request accepted', icon: 'fas fa-check', color: '#3b82f6' },
    'Curated': { text: 'Item curated', icon: 'fas fa-magic', color: '#8b5cf6' },
    'Paid': { text: 'Payment completed', icon: 'fas fa-credit-card', color: '#10b981' },
    'Shipped': { text: 'Order shipped', icon: 'fas fa-truck', color: '#06b6d4' },
    'Delivered': { text: 'Order delivered', icon: 'fas fa-box-open', color: '#10b981' },
    'Rejected': { text: 'Request rejected', icon: 'fas fa-times', color: '#ef4444' }
  };

  return statusMap[status] || { text: status, icon: 'fas fa-question', color: '#6b7280' };
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

async function loadOrdersContent() {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch('/api/requests/my', {
      headers: { Authorization: token }
    });

    const requests = await response.json();
    const ordersGrid = document.getElementById('ordersGrid');

    if (requests.length === 0) {
      ordersGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-shopping-bag"></i>
          <h3>No orders yet</h3>
          <p>Your fashion requests will appear here once processed.</p>
        </div>
      `;
      return;
    }

    const ordersHTML = requests.map(request => {
      const statusClass = `status-${request.status.toLowerCase()}`;
      const image = request.image ? `/uploads/${request.image}` : null;

      return `
        <div class="order-card" onclick="showOrderDetails('${request._id}')">
          <div class="order-header">
            <div class="order-image">
              ${image ? `<img src="${image}" alt="Order" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius);">` : '<i class="fas fa-tshirt"></i>'}
            </div>
            <div class="order-info">
              <h3>${request.style}</h3>
              <p>Size ${request.size} • ${request.category}</p>
            </div>
          </div>
          <div class="order-status ${statusClass}">${request.status}</div>
          <div class="order-footer">
            <div class="order-price">₹${request.curatedPrice || request.budget}</div>
            <div class="order-actions">
              ${request.status === 'Curated' && request.paymentStatus === 'Unpaid' ? `<button onclick="event.stopPropagation(); goToCheckout('${request._id}')">Pay Now</button>` : ''}
              ${request.status === 'Delivered' ? `<button onclick="event.stopPropagation(); deleteOrder('${request._id}')">Delete</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    ordersGrid.innerHTML = ordersHTML;

  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function loadWishlistContent() {
  const wishlistGrid = document.getElementById('wishlistGrid');
  // For now, show empty state
  wishlistGrid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-heart"></i>
      <h3>Your wishlist is empty</h3>
      <p>Save items you love for later</p>
    </div>
  `;
}

async function loadProfileContent() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  try {
    const response = await fetch('/api/requests/my', {
      headers: { Authorization: token }
    });

    const requests = await response.json();

    // Update profile stats
    const stats = {
      requests: requests.length,
      spent: requests
        .filter(r => r.status === 'Paid' || r.status === 'Shipped' || r.status === 'Delivered')
        .reduce((sum, r) => sum + (r.curatedPrice || 0), 0),
      delivered: requests.filter(r => r.status === 'Delivered').length
    };

    document.getElementById('profileRequests').textContent = stats.requests;
    document.getElementById('profileSpent').textContent = `₹${stats.spent}`;
    document.getElementById('profileDelivered').textContent = stats.delivered;

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function loadSettingsContent() {
  // Load saved settings
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const notifications = localStorage.getItem('notifications') !== 'false';
  const emailUpdates = localStorage.getItem('emailUpdates') !== 'false';

  document.getElementById('darkModeToggle').checked = darkMode;
  document.getElementById('notificationsToggle').checked = notifications;
  document.getElementById('emailToggle').checked = emailUpdates;
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    filterOrders(query);
  });
}

function filterOrders(query) {
  const orderCards = document.querySelectorAll('.order-card');

  orderCards.forEach(card => {
    const title = card.querySelector('h3').textContent.toLowerCase();
    const category = card.querySelector('p').textContent.toLowerCase();

    if (title.includes(query) || category.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeIcon');
  const darkModeToggle = document.getElementById('darkModeToggle');

  if (!themeToggle || !darkModeToggle) return;

  // Load saved theme
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.classList.add('dark-mode');
    themeToggle.className = 'fas fa-sun';
  }

  themeToggle.addEventListener('click', toggleTheme);
  darkModeToggle.addEventListener('change', function() {
    toggleTheme();
    this.checked = document.body.classList.contains('dark-mode');
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');

  localStorage.setItem('darkMode', isDark);
  document.getElementById('themeIcon').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function setupMobileMenu() {
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (!mobileToggle || !sidebar) return;

  mobileToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', function(e) {
    if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

function closeMobileMenu() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }
}

function setupForms() {
  const requestForm = document.getElementById('requestForm');
  if (!requestForm) return;

  requestForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('style', document.getElementById('style').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('size', document.getElementById('size').value);
    formData.append('budget', document.getElementById('budget').value);

    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/requests/create', {
        method: 'POST',
        headers: { Authorization: token },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        alert('Request submitted successfully!');
        requestForm.reset();
        loadDashboardContent(); // Refresh dashboard
      } else {
        alert(result.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request');
    }
  });
}

function showNewRequest() {
  // Switch to requests section
  showSection('requests');
}

function showOrderDetails(orderId) {
  // For now, just show an alert. Later we can implement a modal
  alert('Order details modal coming soon! Order ID: ' + orderId);
}

// Settings event listeners
document.addEventListener('DOMContentLoaded', function() {
  const notificationsToggle = document.getElementById('notificationsToggle');
  const emailToggle = document.getElementById('emailToggle');

  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', function() {
      localStorage.setItem('notifications', this.checked);
    });
  }

  if (emailToggle) {
    emailToggle.addEventListener('change', function() {
      localStorage.setItem('emailUpdates', this.checked);
    });
  }
});