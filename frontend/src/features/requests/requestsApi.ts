/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * requestsApi.ts
 *
 * This module manages all communication with the /requests endpoints.
 * It handles the lifecycle of Time Off Requests (Creation, Approval, Denial, Deletion).
 */

import axiosInstance from "../../axiosConfig.tsx";
import type {BasicEmployee} from "@/features/personnel/personnelApi.ts";

/**
 * Payload required to submit a new time-off request.
 */
export interface TimeOffAddRequest {
  employee_id: number;
  start_date: string;
  end_date: string;
  request_type: string;
}

/**
 * The standard response for a Time-Off request.
 * Includes nested Employee details for UI display.
 */
export interface TimeOffResponse {
  id: number;
  employee: BasicEmployee;
  start_date: string;
  end_date: string;
  request_type?: string;
  status: string;
}

/**
 * Retrieves a list of all time-off requests for all employees.
 */
export const getRequests = async (): Promise<TimeOffResponse[]> => {
  try {
    const response = await axiosInstance.get<TimeOffResponse[]>("/requests");
    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Requests query failed");
  }
}

/**
 * Submits a new time-off request for an employee.
 */
export const addRequest = async (data: TimeOffAddRequest): Promise<TimeOffResponse> => {
  try {
    const response = await axiosInstance.post<TimeOffResponse>('/requests/add', data);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Request add failed");
  }
}

/**
 * Permanently removes a request from the system.
 */
export const deleteRequest = async (request_id: number) => {
  try {
    await axiosInstance.delete<TimeOffResponse[]>(`/requests/${request_id}/delete`);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Request deletion failed");
  }
}

/**
 * Updates a request status to 'Approved'.
 */
export const approveRequest = async (request_id: number) => {
  try {
    await axiosInstance.patch<TimeOffResponse[]>(`/requests/${request_id}/approve`);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Request approval failed");
  }
}

/**
 * Updates a request status to 'Denied'.
 */
export const denyRequest = async (request_id: number) => {
  try {
    await axiosInstance.patch<TimeOffResponse[]>(`/requests/${request_id}/deny`);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Request denial failed");
  }
}

/**
 * Modifies an existing request's parameters (Dates/Type).
 * TODO: Backend implementation is currently pending.
 */
export const modifyRequest = async (request_id: number) => {
  try {
    await axiosInstance.patch<TimeOffResponse[]>(`/requests/${request_id}/modify`);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Request modification failed");
  }
}