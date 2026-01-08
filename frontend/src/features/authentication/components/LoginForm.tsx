import React, { useState } from 'react';
import { Stack, Input, Button } from '@chakra-ui/react';

import {
  validateSignIn,
  determineLoginType,
  type AuthSignInData
} from '../authValidation';
import {PasswordInput} from "../../../components/ui/password-input.tsx";
import {toaster} from "../../../components/ui/toaster.tsx";
import {Field} from "../../../components/ui/field.tsx";
import {useAuth} from "../../../context/useAuth.ts";
import {useNavigate} from "react-router";

export const LoginForm = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  // centralized state for cleaner updates
  const [formData, setFormData] = useState<AuthSignInData>({
    identifier: '',
    password: '',
    type: 'username' // Default, will update dynamically
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSignIn(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const loginType = determineLoginType(formData.identifier);

    try {
      await login({
        identifier: formData.identifier,
        password: formData.password,
        type: loginType
      });

      toaster.create({ title: "Welcome back!", type: "success" });
      navigate("/");

    } catch (err: any) {
      toaster.create({
        title: "Login Failed",
        description: err.message || "Invalid credentials",
        type: "error",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">

        <Field
          label="Email or Username"
          invalid={!!errors.email || !!errors.username}
          errorText={errors.email || errors.username}
          required
        >
          <Input
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="user@example.com"
          />
        </Field>

        {/* Password Field */}
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