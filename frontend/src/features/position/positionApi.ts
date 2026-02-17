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
export const getPositionList = async (): Promise<PositionQueryResponse[]> => {
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
export const addPosition = async (positions: PositionAddRequest): Promise<PositionQueryResponse> => {
  try {
    const response = await axiosInstance.post<PositionQueryResponse>('/positions/add', positions);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Position creation failed"));
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