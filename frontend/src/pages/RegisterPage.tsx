/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * RegisterPage.tsx
 *
 * The entry point for new user registration.
 * It composes the generic `AuthLayout` with the specific `RegisterForm` feature.
 */

import AuthLayout from "../layouts/AuthLayout.tsx";
import {RegisterForm} from "../features/authentication/components/RegisterForm.tsx";

/**
 * Main Registration Page.
 */
const RegisterPage = () => {
  return (
    <AuthLayout title="Register for a new account">
      <RegisterForm />
    </AuthLayout>
  );
}

export default RegisterPage;