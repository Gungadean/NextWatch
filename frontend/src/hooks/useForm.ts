/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useForm.ts
 *
 * Defines hook for setting and clearing errors for forms.
 */

import React, { useState } from 'react';

/**
 * Hook to handle form states.
 */
export const useForm = <T extends Record<string, any>>(initialValues: T) => {
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Updates form data for fields and clears existing errors.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;

      const newErrors = { ...prev };
      let hasChanged = false;

      if (newErrors[name]) {
        delete newErrors[name];
        hasChanged = true;
      }

      // If instance of AuthSignUpData interface, remove confirmPassword errors when password updates.
      if (name === 'password' && newErrors["confirmPassword"]) {
        delete newErrors['confirmPassword'];
        hasChanged = true;
      }

      return hasChanged ? newErrors : prev;
    });
  };

  /**
   * Reset the form back to initial values and clear errors.
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