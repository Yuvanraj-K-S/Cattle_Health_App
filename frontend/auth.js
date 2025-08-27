import { authAPI } from './src/services/api';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const loginFormEl = document.querySelector('.login-form');
    const registerFormEl = document.querySelector('.register-form');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingOverlay);

    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        window.location.href = 'index.html';
    }

    // Toggle between login and register forms
    showRegisterLink?.addEventListener('click', function(e) {
        e.preventDefault();
        loginFormEl.style.display = 'none';
        registerFormEl.style.display = 'block';
        clearFormErrors();
    });

    showLoginLink?.addEventListener('click', function(e) {
        e.preventDefault();
        registerFormEl.style.display = 'none';
        loginFormEl.style.display = 'block';
        clearFormErrors();
    });

    // Toggle password visibility
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling;
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            // Basic validation
            if (!email || !password) {
                showAlert('error', 'Please fill in all fields');
                return;
            }
            
            try {
                showLoading(true);
                const response = await authAPI.login({ email, password });
                
                // Store the token
                localStorage.setItem('token', response.token);
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            } catch (error) {
                showAlert('error', error.message || 'Login failed. Please try again.');
            } finally {
                showLoading(false);
            }
        });
    }

    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Basic validation
            const errors = [];
            if (!name) errors.push('Name is required');
            if (!email) errors.push('Email is required');
            if (!password) errors.push('Password is required');
            if (password !== confirmPassword) errors.push('Passwords do not match');
            if (password.length < 6) errors.push('Password must be at least 6 characters long');
            
            if (errors.length > 0) {
                showAlert('error', errors.join('<br>'));
                return;
            }
            
            try {
                showLoading(true);
                const response = await authAPI.register({ name, email, password });
                
                // Store the token
                localStorage.setItem('token', response.token);
                
                // Redirect to dashboard
                window.location.href = 'index.html';
            } catch (error) {
                showAlert('error', error.message || 'Registration failed. Please try again.');
            } finally {
                showLoading(false);
            }
        });
    }

    // Show loading overlay
    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // Show alert message
    function showAlert(type, message) {
        Swal.fire({
            icon: type,
            title: '',
            html: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
    }

    // Clear form errors
    function clearFormErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.remove());
    }
});
