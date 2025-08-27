import { useState, useCallback } from 'react';

/**
 * Custom hook for handling form state and validation
 * @param {Object} initialValues - Initial form values
 * @param {Function} validate - Validation function that returns errors object
 * @param {Function} onSubmit - Submit handler function
 * @returns {Object} Form utilities and state
 */
const useForm = (initialValues = {}, validate, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target;
    
    // Handle different input types
    const inputValue = type === 'checkbox' ? checked :
                      type === 'file' ? files[0] : value;
    
    setValues(prev => ({
      ...prev,
      [name]: inputValue
    }));

    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }, [errors]);

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Run validation if validate function is provided
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        return { success: false, errors: validationErrors };
      }
    }
    
    // Call the onSubmit handler if provided
    if (onSubmit) {
      setIsSubmitting(true);
      setSubmitError(null);
      
      try {
        const result = await onSubmit(values);
        return { success: true, data: result };
      } catch (error) {
        console.error('Form submission error:', error);
        setSubmitError(error.message || 'An error occurred during submission');
        return { success: false, error };
      } finally {
        setIsSubmitting(false);
      }
    }
    
    return { success: true };
  };

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setSubmitError(null);
  }, [initialValues]);

  // Set field value programmatically
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Set field error programmatically
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    setValues,
    setErrors
  };
};

export default useForm;
