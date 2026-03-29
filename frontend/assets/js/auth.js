/**
 * Authentication JavaScript for FinBuddy
 * Handles registration, login, and OTP verification
 */

let currentUserEmail = '';

// Show/Hide Modals
function showRegisterModal() {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerModal.show();
}

function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

function switchToLogin() {
    bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
    setTimeout(() => showLoginModal(), 300);
}

function switchToRegister() {
    bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    setTimeout(() => showRegisterModal(), 300);
}

// Registration Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('regEmail').value;
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            // Validate passwords match
            if (password !== confirmPassword) {
                showError('registerError', 'Passwords do not match');
                return;
            }

            // Validate password strength
            if (password.length < 8) {
                showError('registerError', 'Password must be at least 8 characters');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        username,
                        password,
                        confirm_password: confirmPassword
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Show success message
                    alert('Registration successful! Please login to continue.');
                    bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
                    registerForm.reset();
                    setTimeout(() => showLoginModal(), 300);
                } else {
                    showError('registerError', data.detail || 'Registration failed');
                }
            } catch (error) {
                showError('registerError', 'Network error. Please try again.');
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const btn = document.querySelector('#loginForm button[type="submit"]');
            const originalText = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Logging in...'; }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        password
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Login successful — save token and user data
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('token', data.access_token);
                    // Save under both keys for compatibility with chat.js and other modules
                    localStorage.setItem('user', JSON.stringify(data.data));
                    localStorage.setItem('user_data', JSON.stringify(data.data));

                    // Close modal
                    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                    if (loginModal) loginModal.hide();

                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                } else {
                    showError('loginError', data.detail || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('loginError', 'An error occurred during login');
            } finally {
                // Reset button state
                if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
            }
        });
    }
});

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');

    setTimeout(() => {
        errorElement.classList.add('d-none');
    }, 5000);
}

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    return isLoggedIn === 'true';
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('user_data');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    window.location.href = '/';
}
