/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * RegisterForm.tsx
 *
 * Renders the user registration interface.
 * Handles input capture, client-side validation, password strength visualization,
 * and the creation of new user accounts via an invite token.
 */

import React, { useState } from 'react';
import { Stack, Input, Button, Progress, Text, HStack } from '@chakra-ui/react';
import { type AuthSignUpData, validateSignUp } from "../authValidation.ts";
import { registerUser } from "../authApi.ts";
import { toaster } from "@/components/ui/toaster.tsx";
import { Field } from "@/components/ui/field.tsx";
import { PasswordInput } from "@/components/ui/password-input.tsx";
import { useForm } from "@/hooks/useForm.ts";
import { useNavigate } from "react-router";
import { getErrorMessage } from "@/utils/errorUtils.ts";

interface RegisterFormProps {
  token: string;
  email: string;
}

/**
 * Register Form Component
 * Contains logic for registering a new user via invite token.
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ token, email }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize form state with the props passed from the token validation
  const { formData, errors, handleChange, setErrors } = useForm<AuthSignUpData>({
    token: token,
    email: email,
    password: '',
    confirmPassword: ''
  });

  // Determine strength of supplied password:
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 6) score++;
    if (pass.length > 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return Math.min(score, 4); // Max score 4
  };

  const strengthScore = calculateStrength(formData.password);

  /**
   * Maps the numeric strength score to a UI color palette.
   */
  const getStrengthColor = (score: number) => {
    if (score <= 1) return "red";
    if (score === 2) return "orange";
    if (score === 3) return "yellow";
    return "green";
  };

  /**
   * Handles the form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate user inputs for errors
    const validationErrors = validateSignUp(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        token: formData.token,
        password: formData.password
      });

      // Redirect to home after successful registration
      toaster.create({ title: "Account activated!", type: "success" });
      navigate("/");

    } catch (error: unknown) {
      toaster.create({
        title: "Registration Failed",
        description: getErrorMessage(error, "Unable to register user"),
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">

        <Field
          label="Account Email"
          invalid={!!errors.email}
          errorText={errors.email}
        >
          <Input
            name="email"
            value={formData.email}
            readOnly
            disabled
            variant="subtle"
            placeholder="user@example.com"
            _disabled={{ opacity: 0.8, cursor: "not-allowed", color: "gray.600" }}
          />
        </Field>

        <Field
          label="New Password"
          invalid={!!errors.password}
          errorText={errors.password}
          required>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
        </Field>

        <Field
          label="Confirm Password"
          invalid={!!errors.confirmPassword}
          errorText={errors.confirmPassword}
          required>
          <PasswordInput
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
          />
        </Field>

        {/* Password Strength Meter */}
        {formData.password.length > 0 && (
          <Stack gap="1">
            <Progress.Root
              value={(strengthScore / 4) * 100}
              size="xs"
              colorPalette={getStrengthColor(strengthScore)}>
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <HStack justify="space-between">
              <Text textStyle="xs" color="gray.500">Strength</Text>
              <Text textStyle="xs" fontWeight="medium" color={`${getStrengthColor(strengthScore)}.500`}>
                {["Weak", "Fair", "Good", "Strong", "Excellent"][strengthScore]}
              </Text>
            </HStack>
          </Stack>
        )}

        <Button type="submit" loading={loading} colorPalette="blue" mt="4">
          Activate Account
        </Button>
      </Stack>
    </form>
  );
};