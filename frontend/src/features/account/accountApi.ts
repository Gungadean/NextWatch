/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * accountApi.ts
 *
 * Handles account API functions for fetching the user profile.
 */

import axiosInstance from "@/axiosConfig.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Represents the authenticated user's profile data.
 */
export interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
  employee_id: number | null;
}

/**
 * Represents a user update request.
 */
export interface UserUpdate {
  id: number;
  password?: string;
  role?: string;
  is_active?: boolean;
  employee_id?: number | null;
}

/**
 *
 */
export interface InviteCreateResponse {
  token: string;
  expires_at: string;
  message: string;
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

export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await axiosInstance.get<User[]>('/users');
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Failed to load users"));
  }
};

export const updateUser = async (id: number, data: UserUpdate): Promise<User> => {
  try {
    const response = await axiosInstance.put<User>(`/users/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Failed to update user"));
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/users/${id}`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Failed to delete user"));
  }
};

export const inviteUser = async (employeeId: number): Promise<InviteCreateResponse> => {
  try {
    const response = await axiosInstance.post<InviteCreateResponse>(`/invites/${employeeId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Failed to invite user"));
  }
};