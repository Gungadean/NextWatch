/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AuthProvider.tsx
 *
 * Manages global authentication state and provides context for login/logout to the application.
 */

import React, {useEffect, useState} from 'react';
import {type AuthRequest, loginUser, logoutUser, verifyAccessToken} from '../features/authentication/authApi';
import { AuthContext } from "../hooks/useAuth.ts";

/**
 * Context provider that wraps the application.
 * Checks for an existing user session when mounting and prevents app rendering until complete.
 * @param children Children elements to be protected by auth context.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for a valid refresh token when loading the app.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await verifyAccessToken();
        setIsAuthenticated(true);
      } catch {
        // If verification fails, assume the user is logged out.
        setIsAuthenticated(false);
      } finally {
        // Regardless of outcome, set loading to false.
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (data: AuthRequest) => {
    // Call api with AuthRequest model and set authenticated to true.
    await loginUser(data);
    setIsAuthenticated(true);
  }

  const logout = async () => {
    try {
      await logoutUser()
    } finally {
      // Even if api request fails, set state to false.
      setIsAuthenticated(false);
    }
  }

  // Memoize context to prevent rerenders when values change.
  const contextValue = React.useMemo(
    () => ({
      isAuthenticated: isAuthenticated,
      isLoading: isLoading,
      setIsAuthenticated,
      login,
      logout
    }),
  [isAuthenticated, isLoading]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Block loading children until authentication has been attempted. */}
      {!isLoading && children}
    </AuthContext.Provider>
    );
};