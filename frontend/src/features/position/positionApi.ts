/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * positionApi.ts
 *
 * This module manages all asynchronous communication with the /positions endpoints.
 * It provides the data structures and methods required to maintain the watch stations (Positions).
 */

import axiosInstance from "../../axiosConfig.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import type {ShiftTemplateRead} from "@/features/schedule/scheduleApi.ts";

/**
 * Payload for creating a new position requirement
 */
export interface PositionRequirementCreate {
  shift_template_id: number
  count: number
  applies_on_days: number[];
  is_fixed: boolean;
}

/**
 * Payload of a positions requirement
 */
export interface PositionRequirementRead extends PositionRequirementCreate {
  id: number;
  position_id: number;
  shift_template?: ShiftTemplateRead;
}

/**
 * Payload for reading a Position with its headcount/template requirements
 */
export interface PositionWithRequirementsRead extends PositionQueryResponse {
  requirements: PositionRequirementRead[]
}

/**
 * Payload required to create a new position.
 */
export interface PositionAddRequest {
  name: string;
  description: string;
  color: string;
}

/**
 * Payload required to delete a position.
 */
export interface PositionDeleteRequest {
  id: number;
}

/**
 * The standard Position model returned by the backend.
 */
export interface PositionQueryResponse {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at: string;
  created_by: string;
}

/**
 * Retrieves the full list of positions (watch stations) from the database.
 */
export const getPositionList = async (): Promise<PositionWithRequirementsRead[]> => {
  try {
    const response = await axiosInstance.get('/positions');

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Registration failed"));
  }
};

/**
 * Submits a request to add a new position to the backend.
 */
export const addPosition = async (position: PositionAddRequest): Promise<PositionQueryResponse> => {
  try {
    const response = await axiosInstance.post<PositionQueryResponse>('/positions/add', position);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Position creation failed"));
  }
}

/**
 * Submits a request to update a position.
 */
export const updatePosition = async (id: number, data: PositionAddRequest): Promise<PositionQueryResponse> => {
  try {
    const response = await axiosInstance.patch<PositionQueryResponse>(`/positions/${id}/update`, data);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Position update failed"));
  }
}

/**
 * Performs a bulk deletion of position records.
 */
export const deletePositions = async (positions: PositionDeleteRequest[]) => {
  try {
    await axiosInstance.post<PositionDeleteRequest[]>('/positions/delete', positions);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Position deletion(s) failed"));
  }
}

/**
 * Sends a request to create a new requirement for the specified position
 */
export const createPositionRequirement = async (activePositionId: number, newReq: PositionRequirementCreate): Promise<PositionRequirementRead> => {
  try {
    const response = await axiosInstance.post<PositionRequirementRead>(`/positions/${activePositionId}/requirements`, newReq);

    return response.data;
  } catch(error: unknown) {
    throw new Error(getErrorMessage(error, "Position requirement creation failed"));
  }
}

/**
 * Sends a request to delete a positions requirement
 */
export const deletePositionRequirement = async (activePositionId: number, reqId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/positions/${activePositionId}/requirements/${reqId}`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Position requirement deletion failed"));
  }
}