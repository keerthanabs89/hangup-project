// ============================================
// AUTHENTICATION - Secure Password Handling
// ============================================

const API_BASE = '/api/auth';

// Initialize listeners
window.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const passwordInput = document.getElementById('signupPassword');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', updatePasswordStrength);
  }
});

// ============================================
// PASSWORD STRENGTH CHECKER
// ============================================

function updatePasswordStrength() {
  const password = document.getElementById('signupPassword').value;
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };

  // Update requirement indicators only when the fields exist.
  updateRequirement('req-length', requirements.length);
  updateRequirement('req-uppercase', requirements.uppercase);
  updateRequirement('req-lowercase', requirements.lowercase);
  updateRequirement('req-number', requirements.number);
  updateRequirement('req-special', requirements.special);

  const metRequirements = Object.values(requirements).filter(r => r).length;
  const strengthContainer = document.getElementById('passwordStrength');
  if (strengthContainer) {
    strengthContainer.innerHTML = '';

    let strength = 'weak';
    if (metRequirements >= 4) strength = 'strong';
    else if (metRequirements >= 3) strength = 'medium';

    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'strength-bar';
      if (i < metRequirements) {
        bar.classList.add(strength);
      }
      strengthContainer.appendChild(bar);
    }
  }

  for (let i = 0; i < 5; i++) {
    const bar = document.createElement('div');
    bar.className = 'strength-bar';
    if (i < metRequirements) {
      bar.classList.add(strength);
    }
    strengthContainer.appendChild(bar);
  }
}

function updateRequirement(id, met) {
  const element = document.getElementById(id);
  if (met) {
    element.classList.add('met');
  } else {
    element.classList.remove('met');
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validatePassword(password) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };

  return Object.values(checks).every(check => check === true);
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showMessage(elementId, message, type) {
  const messageElement = document.getElementById(elementId);
  messageElement.textContent = message;
  messageElement.className = `message show ${type}`;
  setTimeout(() => {
    messageElement.classList.remove('show');
  }, 5000);
}

// ============================================
// LOGIN HANDLER
// ============================================

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = e.target.querySelector('button');

  // Validation
  if (!validateEmail(email)) {
    showMessage('loginMessage', '❌ Please enter a valid email', 'error');
    return;
  }

  if (!password) {
    showMessage('loginMessage', '❌ Password cannot be empty', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage('loginMessage', `❌ ${data.message || 'Login failed'}`, 'error');
      return;
    }

    // Store token securely (httpOnly cookie would be better)
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showMessage('loginMessage', '✅ Login successful! Redirecting...', 'success');

    // Redirect based on role
    setTimeout(() => {
      const role = data.user.role;
      if (role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else if (role === 'store') {
        window.location.href = '/store-dashboard';
      } else {
        window.location.href = '/customer-dashboard';
      }
    }, 1500);
  } catch (error) {
    console.error('Login error:', error);
    showMessage('loginMessage', '❌ Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login Securely';
  }
}

// ============================================
// SIGNUP HANDLER
// ============================================

async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  const role = document.getElementById('signupRole').value;
  const btn = e.target.querySelector('button');

  // Validation
  if (!name || name.length < 3) {
    showMessage('signupMessage', '❌ Name must be at least 3 characters', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showMessage('signupMessage', '❌ Please enter a valid email', 'error');
    return;
  }

  if (!validatePassword(password)) {
    showMessage('signupMessage', '❌ Password does not meet requirements', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showMessage('signupMessage', '❌ Passwords do not match', 'error');
    return;
  }

  if (!role) {
    showMessage('signupMessage', '❌ Please select a role', 'error');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage('signupMessage', `❌ ${data.message || 'Signup failed'}`, 'error');
      return;
    }

    showMessage('signupMessage', '✅ Account created! Redirecting to login...', 'success');

    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  } catch (error) {
    console.error('Signup error:', error);
    showMessage('signupMessage', '❌ Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

// ============================================
// LOGOUT HANDLER
// ============================================

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

// ============================================
// GET STORED USER INFO
// ============================================

function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function getToken() {
  return localStorage.getItem('token');
}

// ============================================
// PROTECTED ROUTE CHECK
// ============================================

function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return false;
  }
  return true;
}
