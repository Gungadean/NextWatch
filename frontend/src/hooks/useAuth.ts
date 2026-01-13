/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useAuth.ts
 *
 * Defines react context for authentication and the consuming hook.
 * This is a bridge between AuthProvider and the rest of the app for fast reload.
 */
import type {AuthRequest} from "../features/authentication/authApi.ts";
import {createContext, useContext} from "react";

/**
 * Shape of authentication context.
 * Used by consumers to get the global auth state.
 */
export interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    login: (data: AuthRequest) => Promise<void>;
    logout: () => void;
}

/**
 * The context object itself.
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access the authentication context.
 * @throws {Error} If used outside a <AuthProvider> wrapper.
 * @returns {AuthContextType} The current authentication state.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};