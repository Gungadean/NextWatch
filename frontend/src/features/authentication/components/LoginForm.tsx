/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * LoginForm.tsx
 *
 * Renders the user login interface.
 * Handles input, client-side validation, and attempts to authenticate with useAuth hook.
 */

import React from 'react';
import { Stack, Input, Button } from '@chakra-ui/react';

import {
  validateSignIn,
  type AuthSignInData
} from '../authValidation';
import {PasswordInput} from "@/components/ui/password-input.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {Field} from "@/components/ui/field.tsx";
import {useAuth} from "@/hooks/useAuth.ts";
import {useNavigate} from "react-router";
import {useForm} from "@/hooks/useForm.ts";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Login Form Component.
 * The primary entry point for user authentication.
 */
export const LoginForm = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // Initialize form state.
  const {formData, errors, handleChange, setErrors} = useForm<AuthSignInData>({
    identifier: '',
    password: ''
  });

  /**
   * Handles the form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Perform client side validation
    const validationErrors = validateSignIn(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Attempt to authenticate with provider
      await login({
        identifier: formData.identifier,
        password: formData.password
      });

      // Show success and redirect to dashboard
      toaster.create({ title: "Welcome back!", type: "success" });
      navigate("/");

    } catch (error: unknown) {
      // Display any error from backend.
      toaster.create({
        title: "Login Failed",
        description: getErrorMessage(error, "Invalid credentials"),
        type: "error",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">

        {/* Identifier Field which accepts username/email. */}
        <Field
          label="Email or Username"
          invalid={!!errors.email || !!errors.username}
          errorText={errors.email || errors.username}
          required>
          <Input
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="user@example.com"
          />
        </Field>

        {/* Password Field: Includes show/hide toggle logic internally */}
        <Field
          label="Password"
          invalid={!!errors.password}
          errorText={errors.password}
          required
        >
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </Field>

        {/* Submit Button: Shows spinner when `isLoading` is true */}
        <Button
          type="submit"
          loading={isLoading}
          loadingText="Signing in..."
          colorPalette="blue"
          mt="4"
        >
          Sign In
        </Button>
      </Stack>
    </form>
  );
};