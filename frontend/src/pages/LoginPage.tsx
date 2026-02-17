/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * LoginPage.tsx
 *
 * The entry point for existing users.
 * It composes the generic `AuthLayout` with the specific `LoginForm` feature.
 */

import AuthLayout from "../layouts/AuthLayout.tsx";
import {LoginForm} from "../features/authentication/components/LoginForm.tsx";

/**
 * Main Login Page.
 */
const LoginPage = () => {
  return (
    <AuthLayout title="Sign in to your account">
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;