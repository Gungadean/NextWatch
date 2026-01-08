import React, { useState } from 'react';
import { Stack, Input, Button, Progress, Text, HStack } from '@chakra-ui/react';
import {type AuthSignUpData, validateSignUp} from "../authValidation.ts";
import {registerUser} from "../authApi.ts";
import {toaster} from "../../../components/ui/toaster.tsx";
import {Field} from "../../../components/ui/field.tsx";
import {PasswordInput} from "../../../components/ui/password-input.tsx";

export const RegisterForm = () => {
  const [formData, setFormData] = useState<AuthSignUpData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // --- Password Strength Logic ---
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

  // Helper to color the progress bar
  const getStrengthColor = (score: number) => {
    if (score <= 1) return "red";
    if (score === 2) return "orange";
    if (score === 3) return "yellow";
    return "green";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specific errors
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        // Also clear confirm password error if main password changes
        if (name === 'password') delete newErrors['confirmPassword'];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSignUp(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      toaster.create({ title: "Account created!", type: "success" });
      // Redirect or switch to login view here
    } catch (err: any) {
      toaster.create({ title: "Registration Failed", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="4">

        <Field label="Username" invalid={!!errors.username} errorText={errors.username} required>
          <Input name="username" value={formData.username} onChange={handleChange} />
        </Field>

        <Field label="Email" invalid={!!errors.email} errorText={errors.email} required>
          <Input name="email" value={formData.email} onChange={handleChange} />
        </Field>

        <Field label="Password" invalid={!!errors.password} errorText={errors.password} required>
          <Stack gap="2" w="full">
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
            />

            {/* --- Password Strength Meter --- */}
            {formData.password.length > 0 && (
              <Stack gap="1">
                <Progress.Root value={(strengthScore / 4) * 100} size="xs" colorPalette={getStrengthColor(strengthScore)}>
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
          </Stack>
        </Field>

        <Field label="Confirm Password" invalid={!!errors.confirmPassword} errorText={errors.confirmPassword} required>
          <PasswordInput
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </Field>

        <Button type="submit" loading={loading} colorPalette="blue" mt="4">
          Create Account
        </Button>
      </Stack>
    </form>
  );
};