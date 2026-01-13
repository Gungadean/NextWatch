/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * authApi.ts
 *
 * Handles authentication API functions for registration, login, logout, and password rests.
 * Uses Axios for requests and manages access tokens in memory.
 */

import axiosInstance from "../../axiosConfig";
import {startTokenTimer, stopTokenTimer} from "./tokenManager.ts";

let accessToken: string | undefined = undefined;

/**
 * Access token retrieval method.
 */
export const getAccessToken = (): string | undefined => {
  return accessToken;
}

/**
 * Setter whenever we get a new token from login.
 */
export const setAccessToken = (token: string) => {
  accessToken = token;
  startTokenTimer(token);
};

/**
 * Remove everything (on logout or refresh failure).
 * */
export const clearAuthData = () => {
  accessToken = undefined;
  stopTokenTimer();
};

/**
 * Payload we send to /auth/login.
 * Identifier is set by type of either email or username.
 */
export interface AuthRequest {
  identifier: string;
  type: string;
  password: string;
}

/**
 * What the backend returns after /auth/login.
 * If successful, access_token should exist (and be stored in memory).
 */
export interface AuthResponse {
  username: string;
  message: string;
  access_token: string;
}

/**
 * Payload for registering a new user.
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * Send user registration request to backend and promise an authentication response.
 */
export const registerUser = async (data: RegisterRequest): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<AuthResponse>('/auth/register', data, {
      withCredentials: true
    });

    setAccessToken(response.data.access_token);

    return response.data;
  } catch (err: any) {
    // If backend threw a 400/422 with { detail: "..."}:
    throw new Error(err.response?.data?.detail || "Registration failed");
  }
};

/**
 * Send user login request to backend and promise an authentication response.
 */
export const loginUser = async (data: AuthRequest): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<AuthResponse>('/auth/login',
        {
          username: data.identifier,
          password: data.password,
          grant_type: "password"
        },
        { headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        withCredentials: true
        });

    setAccessToken(response.data.access_token);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Login failed");
  }
};

/**
 * Send a user logout request to backend. Local auth data is wiped regardless of if request fails.
 */
export const logoutUser = async (): Promise<string | void> => {
  try {
    const response = await axiosInstance.post<{ message: string }>("/auth/logout",
        {}, { withCredentials: true });

    clearAuthData();
    return response.data.message;
  } catch (err: any) {
    clearAuthData();
    throw new Error(err.response?.data?.detail || "Failed to send password reset email");
  }
};

/**
 * Send a request to verify an access token for validity.
 */
export const verifyAccessToken = async (): Promise<void> => {
  try {
    await axiosInstance.get<{message: string}>('/auth/verify')
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to verify access token");
  }
}

/**
 * Send a request to get a new access token if expired. This looks for a refresh token
 * cookie for validation.
 */
export const refreshAccessToken = async (): Promise<string> => {
  try {
    // The backend endpoint /auth/refresh should look at the HttpOnly cookie (refresh token),
    // verify it, and respond with a fresh { access_token: "newJwt" }.
    const response = await axiosInstance.post<{ access_token: string }>('/auth/refresh',
        {}, {withCredentials: true});

    setAccessToken(response.data.access_token);

    return response.data.access_token;
  } catch (error : any) {
    clearAuthData();
    throw new Error(error.response?.data?.detail || 'Session expired. Please log in again.');
  }
};