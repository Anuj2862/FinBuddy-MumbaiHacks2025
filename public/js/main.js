/**
 * FinBuddy AI - Main Landing Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Smooth Scroll for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });

    // Login Logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const password = document.getElementById('password').value;
            
            if (name && password) {
                console.log('Authenticating...', name);
                fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        // Pass auth data via URL since localhost:5000 and localhost:3000 have separate local storage
                        window.location.href = `http://localhost:3000?userId=${data.userId}&name=${encodeURIComponent(data.name)}`;
                    } else {
                        alert('Login failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => alert('Network error. Is the server running?'));
            } else {
                alert('Please enter both name and password');
            }
        });
    }

    // Registration Logic
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const password = document.getElementById('reg-password').value;
            const businessType = document.getElementById('reg-type').value;
            
            if (name && password) {
                console.log('Registering...', name);
                fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password, businessType })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Registration successful! Please login.');
                        window.location.href = 'login.html';
                    } else {
                        alert('Registration failed: ' + (data.error || 'Unknown error'));
                    }
                })
                .catch(err => alert('Network error. Is the server running?'));
            } else {
                alert('Please fill out all fields');
            }
        });
    }
});
