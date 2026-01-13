/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * LoginPage.tsx
 *
 * Page wrapper for login form.
 */

import AuthLayout from "../layouts/AuthLayout.tsx";
import {LoginForm} from "../features/authentication/components/LoginForm.tsx";

/**
 * Main login page with login form wrapped by AuthLayout.
 */
const LoginPage = () => {
  return (
    <AuthLayout title="Sign in to your account">
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;