/**
 * Validation utility functions for form fields
 */

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  return null;
};

/**
 * Validates that a field is not empty
 * @param {string} value - The value to check
 * @param {string} fieldName - The name of the field for the error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validates that two password fields match
 * @param {string} password - The password
 * @param {string} confirmPassword - The confirmation password
 * @returns {string|null} Error message or null if passwords match
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

/**
 * Validates a number is within a range
 * @param {number} value - The number to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value (inclusive)
 * @param {number} options.max - Maximum value (inclusive)
 * @param {string} fieldName - The name of the field for the error message
 * @returns {string|null} Error message or null if valid
 */
export const validateNumberRange = (value, { min, max }, fieldName) => {
  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return null;
};

/**
 * Validates a date is not in the future
 * @param {Date|string} date - The date to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateNotFutureDate = (date) => {
  if (!date) return null;
  
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (inputDate > today) {
    return 'Date cannot be in the future';
  }
  
  return null;
};

/**
 * Validates a phone number (basic validation)
 * @param {string} phone - The phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePhone = (phone) => {
  if (!phone) return null;
  
  // Basic phone validation - allows for international formats
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  
  return null;
};

/**
 * Creates a validation function for a form
 * @param {Object} validators - Object mapping field names to validation functions
 * @returns {Function} A validation function that can be used with useForm
 */
export const createValidator = (validators) => {
  return (values) => {
    const errors = {};
    
    Object.entries(validators).forEach(([field, validator]) => {
      if (typeof validator === 'function') {
        const error = validator(values[field], values);
        if (error) {
          errors[field] = error;
        }
      }
    });
    
    return errors;
  };
};
