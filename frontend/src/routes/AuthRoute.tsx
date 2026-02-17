/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AuthRoute.tsx
 *
 * A "Protected Route" wrapper component.
 * It intercepts navigation to ensure the user has a valid session before
 * rendering the child route (Outlet).
 */

import { Navigate, Outlet, useLocation } from 'react-router';
import {useAuth} from "../hooks/useAuth.ts";

/**
 * AuthRoute Component
 */
const AuthRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Prevent flashing the login screen while the token is being verified.
  if (isLoading) {
    return (
      <div>Loading...</div>
    )
  }

  // No Session Found
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render the child route elements.
  return <Outlet />;
};

export default AuthRoute;