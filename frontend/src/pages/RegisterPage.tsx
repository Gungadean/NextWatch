/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * RegisterPage.tsx
 *
 * Page wrapper for register form.
 */

import AuthLayout from "../layouts/AuthLayout.tsx";
import {RegisterForm} from "../features/authentication/components/RegisterForm.tsx";

/**
 * Main registration page with register form wrapped by AuthLayout.
 */
const RegisterPage = () => {
  return (
    <AuthLayout title="Register for a new account">
      <RegisterForm />
    </AuthLayout>
  );
}

export default RegisterPage;