/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AdminRoute.tsx
 *
 * A "Protected Route" wrapper component for Admin-only views.
 * It intercepts navigation to ensure the user has the 'admin' role before
 * rendering the child route (Outlet).
 */

import { Navigate, Outlet } from 'react-router';
import { useCurrentUser } from "../hooks/useAuth.ts";

/**
 * AdminRoute Component
 */
const AdminRoute = () => {
  const currentUser = useCurrentUser();

  // If the user is not an admin, redirect them to the home page.
  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Render the child route elements.
  return <Outlet />;
};

export default AdminRoute;
