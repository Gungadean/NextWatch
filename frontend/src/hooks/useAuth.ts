/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useAuth.ts
 *
 * Defines the React Context for authentication and the consuming hooks.
 * This acts as the bridge between the raw AuthProvider logic and the rest
 * of the application components.
 */

import type {AuthRequest} from "../features/authentication/authApi.ts";
import {createContext, useContext} from "react";
import type {User} from "@/features/account/accountApi.ts";

/**
 * Shape of the Authentication Context.
 * Defines everything available to components via `useAuth()`.
 */
export interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    login: (data: AuthRequest) => Promise<void>;
    logout: () => void;
    user: User | null;
}

/**
 * The React Context object.
 * Initialized to null; populated by <AuthProvider>.
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook to access the global authentication state.
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};


/**
 * Hook to retrieve the current user's profile safely.
 *
 * Unlike `useAuth()`, this hook guarantees that `user` is not null.
 * It is designed for use inside "Protected Routes" where we know the user is already logged in.
 */
export const useCurrentUser = (): User => {
    const { user } = useAuth();

    if (!user) {
        throw new Error("useCurrentUser: User is missing. Are you wrapping this in a Protected Route?")
    }
    return user;
}