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
import {fetchUserProfile, type User} from "@/features/account/accountApi.ts";

/**
 * Context provider that wraps the application.
 * Checks for an existing user session when mounting and prevents app rendering until complete.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize authentication and verify user if available.
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        await verifyAccessToken();
        const userData = await fetchUserProfile();

        setIsAuthenticated(true);
        setUser(userData);
      } catch {
        // If verification fails, assume the user is logged out.
        setIsAuthenticated(false);
      } finally {
        // Regardless of outcome, set loading to false.
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  /**
   * Authenticates a user with the backend using the user's
   * login credentials (identifier and password).
   */
  const login = async (data: AuthRequest) => {
    // Call api with AuthRequest model and set authenticated to true.
    await loginUser(data);

    const userData = await fetchUserProfile();

    setUser(userData);
    setIsAuthenticated(true);
  }

  /**
   * Terminates the user session.
   * Clears the backend session (cookies/tokens) and resets the local state.
   */
  const logout = async () => {
    try {
      await logoutUser()
    } finally {
      // Even if api request fails, set state to false.
      setIsAuthenticated(false);
      setUser(null);
    }
  }

  /**
   * Prevents every component consuming this context from re-rendering unless
   * one of the specific auth values changes.
   */
  const contextValue = React.useMemo(
    () => ({
      isAuthenticated: isAuthenticated,
      isLoading: isLoading,
      setIsAuthenticated,
      login,
      logout,
      user
    }),
  [isAuthenticated, isLoading, user]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Block loading children until authentication has been attempted. */}
      {!isLoading && children}
    </AuthContext.Provider>
    );
};