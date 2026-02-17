/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * axiosConfig.tsx
 *
 * Config for Axios api. Handles intercepting requests for troubleshooting, applying header data
 * with user access tokens, and error handling for failed requests to the backend.
 */

import axios from "axios";
import {clearAuthData, getAccessToken, refreshAccessToken} from "./features/authentication/authApi.ts";

/**
 * Structure of a queued request waiting for a new token.
 */
interface FailedRequest {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown | null) => void;
}

// Global Flags & State
const devMode: boolean = import.meta.env.VITE_DEV.toLowerCase() === 'true';
let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

/**
 * The singleton Axios instance used for all API calls.
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});



/**
 * Processes the queue of failed requests after a refresh attempt.
 */
const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    // If refresh failed, send rejection otherwise retry with valid token.
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Request interceptor. Add auth token, handle request errors, and additionally print details if environment is in dev mode.
 */
axiosInstance.interceptors.request.use(
  (request) => {
    // Inject token
    const token = getAccessToken();
    if (token && request.headers) {
      request.headers["Authorization"] = `Bearer ${token}`;
    }

    // Dev Logging
    if (devMode) {
      console.groupCollapsed(`[Request] ${request.method?.toUpperCase()} ${request.url}`);
      console.log("BaseURL:", request.baseURL);
      console.log("Headers:", request.headers);
      if (request.params) console.log("Params:", request.params);
      if (request.data) console.log("Data:", request.data);
      console.groupEnd();
    }

    return request;
  },
  (error) => {
    if (devMode) console.error("[Request Error]", error);
    return Promise.reject(error);
  }
)

/**
 * Response interceptor. Add auth token and additionally print details if environment is in dev mode.
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Dev Logging (Success)
    if (devMode) {
      console.groupCollapsed(`[Response] ${response.status} ${response.config.url}`);
      console.log("Data:", response.data);
      console.groupEnd();
    }
    return response;
  },
  async (error) => {
    // An error response (network error, 4xx, 5xx, etc.)
    const originalRequest = error.config;
    const response = error.response; // may be undefined if there was no response

    // Dev Error Logging
    if (devMode) {
      console.group(`[Response Error] ${response?.status || 'Network'} ${originalRequest?.url}`);
      if (response) {
        console.error("Status:", response.status);
        console.error("Data:", response.data);
      } else {
        console.error("No response received (Network/CORS)");
      }
      console.groupEnd();
    }

    // Check if the request was to any of the auth endpoints to prevent a loop.
    const attemptRetry = originalRequest.url && (
        !originalRequest.url.includes('/auth/refresh') &&
        !originalRequest.url.includes('/auth/login') &&
        !originalRequest.url.includes('/auth/logout') &&
        !originalRequest.url.includes('/auth/register')
    );

    // Handle 401 Unauthorized (Expired Access Token)
    if (response?.status === 401 && !originalRequest._retry && attemptRetry) {
      // Refresh already in progress.
      // Queue this request to wait until the first one finishes.
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // First request to fail.
      // Lock the queue and trigger the refresh.
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if(devMode) console.log("Access token expired. Attempting refresh...");

        const newToken = await refreshAccessToken();

        // Update the header for *this* request immediately
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        // Unlock and process all queued requests
        processQueue(null, newToken);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails (Refresh Token expired/invalid), force logout.
        if(devMode) console.error("Refresh failed. Logging out.");

        processQueue(refreshError, null);
        clearAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Return all other errors as is
    return Promise.reject(error);
  }
);

export default axiosInstance;