// ============================================
// PAYMENT PROCESSING - Secure & Validated
// ============================================

const API_BASE = '/api/requests';
let selectedPaymentMethod = null;

window.addEventListener('DOMContentLoaded', () => {
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckout);
  }
});

// ============================================
// SELECT PAYMENT METHOD
// ============================================

function selectPayment(method, element) {
  // Remove previous selection
  document.querySelectorAll('.payment-option').forEach(el => {
    el.classList.remove('selected');
  });

  // Add selection to current
  element.classList.add('selected');
  selectedPaymentMethod = method;
  document.getElementById('paymentMethod').value = method;

  // Show relevant input sections
  document.getElementById('upiSection').style.display = 'none';
  document.getElementById('cardSection').style.display = 'none';

  if (['PhonePe', 'Google Pay', 'Paytm'].includes(method)) {
    document.getElementById('upiSection').style.display = 'block';
  } else if (method === 'Card') {
    document.getElementById('cardSection').style.display = 'block';
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateUPI(upiId) {
  // Format: username@bankname
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
  return upiRegex.test(upiId);
}

function luhnCheck(cardNumber) {
  // Luhn algorithm for card validation
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length !== 16) return false;

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

function validateCard(cardNumber, expiry, cvv) {
  // Remove spaces
  cardNumber = cardNumber.replace(/\s/g, '');

  // Check card number
  if (!luhnCheck(cardNumber)) {
    return { valid: false, message: 'Invalid card number' };
  }

  // Check expiry format (MM/YY)
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return { valid: false, message: 'Expiry must be MM/YY' };
  }

  const [month, year] = expiry.split('/');
  if (month < 1 || month > 12) {
    return { valid: false, message: 'Invalid month' };
  }

  // Check if card is expired
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
    return { valid: false, message: 'Card has expired' };
  }

  // Check CVV
  if (!/^\d{3,4}$/.test(cvv)) {
    return { valid: false, message: 'Invalid CVV' };
  }

  return { valid: true };
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
// FORMAT CARD NUMBER INPUT
// ============================================

function formatCardNumber(value) {
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

// ============================================
// CHECKOUT HANDLER
// ============================================

async function handleCheckout(e) {
  e.preventDefault();

  if (!selectedPaymentMethod) {
    showMessage('checkoutMessage', '❌ Please select a payment method', 'error');
    return;
  }

  const deliveryMode = document.getElementById('deliveryMode').value;
  const btn = e.target.querySelector('button');
  let paymentData = {
    method: selectedPaymentMethod,
    deliveryMode: deliveryMode
  };

  // Validate payment method specific data
  try {
    if (['PhonePe', 'Google Pay', 'Paytm'].includes(selectedPaymentMethod)) {
      const upiId = document.getElementById('upiId').value;
      if (!upiId) {
        showMessage('checkoutMessage', '❌ Please enter your UPI ID', 'error');
        return;
      }
      if (!validateUPI(upiId)) {
        showMessage('checkoutMessage', '❌ Invalid UPI ID format (e.g., user@paytm)', 'error');
        return;
      }
      // Never send full UPI ID to server, only mask it
      paymentData.upiMask = upiId.split('@')[0].substring(0, 3) + '***@' + upiId.split('@')[1];
    } else if (selectedPaymentMethod === 'Card') {
      const cardNumber = document.getElementById('cardNumber').value;
      const expiry = document.getElementById('cardExpiry').value;
      const cvv = document.getElementById('cardCVV').value;

      const validation = validateCard(cardNumber, expiry, cvv);
      if (!validation.valid) {
        showMessage('checkoutMessage', `❌ ${validation.message}`, 'error');
        return;
      }

      // NEVER send full card number - only last 4 digits
      const last4 = cardNumber.slice(-4);
      paymentData.cardLast4 = last4;
      paymentData.cardNetwork = detectCardNetwork(cardNumber);
    } else if (selectedPaymentMethod === 'Cash on Delivery') {
      paymentData.cod = true;
    }

    btn.disabled = true;
    btn.textContent = 'Processing Payment...';

    // Get token for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      showMessage('checkoutMessage', '❌ Please login first', 'error');
      window.location.href = '/login';
      return;
    }

    const response = await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      showMessage('checkoutMessage', `❌ ${data.message || 'Payment failed'}`, 'error');
      return;
    }

    showMessage('checkoutMessage', '✅ Payment successful! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = '/customer-dashboard';
    }, 1500);
  } catch (error) {
    console.error('Checkout error:', error);
    showMessage('checkoutMessage', '❌ Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Complete Payment';
  }
}

// ============================================
// DETECT CARD NETWORK
// ============================================

function detectCardNetwork(cardNumber) {
  const firstDigit = cardNumber.charAt(0);
  if (firstDigit === '4') return 'Visa';
  if (firstDigit === '5') return 'Mastercard';
  if (cardNumber.substring(0, 2) === '35') return 'JCB';
  if (cardNumber.substring(0, 2) === '36') return 'Diners';
  return 'Unknown';
}

// ============================================
// SECURITY NOTES
// ============================================
// 1. ✅ Passwords are NEVER displayed in plaintext
// 2. ✅ Card numbers are NEVER sent in full (only last 4 digits)
// 3. ✅ UPI IDs are masked before sending
// 4. ✅ JWT tokens used for API authentication
// 5. ✅ HTTPS should be enforced in production
// 6. ✅ All sensitive data validated client-side
// 7. ✅ Server-side validation is REQUIRED (implement in backend)
