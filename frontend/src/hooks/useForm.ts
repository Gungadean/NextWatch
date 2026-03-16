/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useForm.ts
 *
 * A reusable hook for managing form state and validation errors.
 * It abstracts away the repetitive logic of updating state objects and clearing errors on user input.
 */

import React, { useState } from 'react';

/**
 * Custom hook to handle form states.
 */
export const useForm = <T extends object>(initialValues: T) => {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Updates form data for fields and intelligently clears existing errors.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value } as T));

    setErrors((prev) => {
      // Don't trigger a state update if there are no errors.
      if (Object.keys(prev).length === 0) return prev;

      const newErrors = { ...prev };
      let hasChanged = false;

      // Clear error for the specific field being typed in
      if (newErrors[name]) {
        delete newErrors[name];
        hasChanged = true;
      }

      // If editing 'password', also clear 'confirmPassword' errors
      // to prevent stale mismatch messages.
      if (name === 'password' && newErrors["confirmPassword"]) {
        delete newErrors['confirmPassword'];
        hasChanged = true;
      }

      return hasChanged ? newErrors : prev;
    });
  };

  /**
   * Resets the form back to initial values and clears all errors.
   */
  const resetForm = () => {
    setFormData(initialValues);
    setErrors({});
  };

  return {
    formData,
    errors,
    handleChange,
    setFormData,
    setErrors,
    resetForm
  };
};