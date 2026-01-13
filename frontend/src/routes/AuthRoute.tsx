/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AuthRoute.tsx
 *
 * Route wrapper for ensuring authentication for protected routes.
 */

import { Navigate, Outlet, useLocation } from 'react-router';
import {useAuth} from "../hooks/useAuth.ts";

/**
 * Main route logic.
 * Checks for authenticated user and redirects to login page if not session is active.
 */
const AuthRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div>Loading...</div>
    )
  }

  // Redirect the user to login page if no session is found.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default AuthRoute;