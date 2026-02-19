/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * errorUtils.ts
 *
 * Utility for handling error messages
 */

import {isAxiosError} from "axios";

/**
 * Function for checking for an error type with message parameter
 * or returning a string of the thrown error.
 */
export function getErrorMessage(error: unknown, defaultMessage: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    // Check common backend error payload shapes
    if (data && typeof data === 'object') {
      if ('detail' in data && typeof data.detail === 'string') return data.detail;
      if ('detail' in data && Array.isArray(data.detail)) return data.detail[0]?.msg || defaultMessage;
      if ('error' in data && typeof data.error === 'string') return data.error;
      if ('message' in data && typeof data.message === 'string') return data.message;
    }

    // Fallback to standard Axios message
    if (error.message) return error.message;
  }

  // Handle standard JavaScript Errors
  if (error instanceof Error) {
    return error.message;
  }

  // Handle raw strings
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return defaultMessage;
}