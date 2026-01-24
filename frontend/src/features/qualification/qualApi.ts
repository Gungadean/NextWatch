/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * qualApi.ts
 *
 * Handles qualification API functions for retrieving, creating, and deleting qualifications.
 * Uses Axios for requests.
 */

import axiosInstance from "../../axiosConfig.tsx";

/**
 * Payload we send to /qual/add.
 * Creates new qualification.
 */
export interface QualificationAddRequest {
  name: string;
  description: string;
}

/**
 * Payload we send to /qual/delete.
 * Removes a qualification from server.
 */
export interface QualificationDeleteRequest {
  id: number;
}

/**
 * Payload we receive from /qual/get and /qual/list
 * Contains data for qualification
 */
export interface QualificationQueryResponse {
  id: number;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
}

/**
 * Request list of all qualifications from backend.
 */
export const getQualList = async (): Promise<QualificationQueryResponse[]> => {
  try {
    const response = await axiosInstance.get('/qual/list');

    return response.data;
  } catch (err: any) {
    // If backend threw a 400/422 with { detail: "..."}:
    throw new Error(err.response?.data?.detail || "Registration failed");
  }
};

/**
 * Request for a qualification to be added to the backend.
 */
export const addQual = async (qualification: QualificationAddRequest): Promise<QualificationQueryResponse> => {
  try {
    const response = await axiosInstance.post<QualificationQueryResponse>('/qual/add', qualification);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Qualification creation failed");
  }
}

/**
 * Request for a list of qualifications to be deleted.
 */
export const deleteQuals = async (qualifications: QualificationDeleteRequest[]) => {
  try {
    await axiosInstance.post<QualificationDeleteRequest[]>('/qual/delete', qualifications);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Qualification deletion failed");
  }
}