/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * accountApi.ts
 *
 * Handles account API functions for fetching the user profile.
 * TODO: Add support for updating account data.
 */

import axiosInstance from "@/axiosConfig.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Represents the authenticated user's profile data.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  employee_id: number;
}

/**
 * Fetches the currently logged-in user's account information from the backend.
 * This endpoint is typically called during application initialization to
 * populate the global AuthContext.
 */
export const fetchUserProfile = async (): Promise<User> => {
  try {
    const response = await axiosInstance.get<User>('/account/info');
    return response.data;
  } catch (error: unknown) {

    throw new Error(getErrorMessage(error, "User data fetching failed"));
  }
}