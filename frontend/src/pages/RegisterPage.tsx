/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * RegisterPage.tsx
 *
 * The entry point for new user registration.
 * Validates the invite token from the URL and composes the AuthLayout
 * with the specific RegisterForm feature.
 */

import React, { useEffect, useState } from "react";
import { Center, Spinner, Text, VStack, Button, Stack } from "@chakra-ui/react";
import AuthLayout from "../layouts/AuthLayout.tsx";
import { RegisterForm } from "../features/authentication/components/RegisterForm.tsx";
import { validateInviteToken } from "../features/authentication/authApi.ts";
import { toaster } from "@/components/ui/toaster.tsx";
import { useNavigate, useSearchParams } from "react-router";

// Defines the expected structure from the validation endpoint.
interface InviteValidationData {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Main Registration Page.
 */
const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract token directly from the browser URL parameters.
  const inviteToken: string | null = searchParams.get("token");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employeeData, setEmployeeData] = useState<InviteValidationData | null>(null);

  // Validate the token immediately upon page load.
  useEffect(() => {
    const verifyToken = async () => {
      if (!inviteToken) {
        setIsLoading(false);
        return;
      }

      try {
        const data: InviteValidationData = await validateInviteToken(inviteToken);
        setEmployeeData(data);
      } catch (error: unknown) {
        console.log(error);
        toaster.create({
          title: "Invalid Link",
          description: "The invite link is invalid or has expired.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [inviteToken]);

  // Render a loading state while reaching out to the API.
  if (isLoading) {
    return (
      <AuthLayout title="Verifying Invite...">
        <Center py="8">
          <VStack gap="4">
            <Spinner size="xl" colorPalette="blue" />
            <Text color="gray.500">Checking secure token...</Text>
          </VStack>
        </Center>
      </AuthLayout>
    );
  }

  // Render an error state if the token is missing or rejected.
  if (!inviteToken || !employeeData) {
    return (
      <AuthLayout title="Invalid Invite Link">
        <Stack gap="6" textAlign="center">
          <Text color="gray.600" _dark={{ color: "gray.400" }}>
            We couldn't find a valid invite token. Please click the exact link provided in your welcome email, or contact your administrator.
          </Text>
          <Button colorPalette="blue" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </Stack>
      </AuthLayout>
    );
  }

  // Render the actual form if the token is valid.
  return (
    <AuthLayout title="Register Account">
      <Text textAlign="center" color="gray.600" _dark={{ color: "gray.400" }} mb="6">
        Setting up access for <b>{employeeData.first_name} {employeeData.last_name}</b>
      </Text>
      <RegisterForm token={inviteToken} email={employeeData.email} />
    </AuthLayout>
  );
};

export default RegisterPage;