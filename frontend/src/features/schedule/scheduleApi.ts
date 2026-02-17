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

import axiosInstance from "@/axiosConfig.tsx";

/**
 * Represents a shift assigned in the official schedule.
 */
export interface Shift {
  id: number;
  member_id: number;
  position_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  employee?: {
    first_name: string;
    last_name: string;
    middle_name: string;
  };
  position?: {
    name: string;
    color: string;
  };
}

/**
 * Lightweight employee object used during generation
 */
export interface Watchstander {
  id: number;
  name: string;
}

/**
 * Lightweight position object used during generation
 */
export interface Watchstation {
  id: number;
  name: string;
  color: string;
}

/**
 * An individual assignment within a schedule draft
 */
export interface Assignment {
  date: string;
  watchstander: Watchstander;
  watchstation: Watchstation;
}

/**
 * Data returned when a schedule generation is finalized.
 */
export interface ScheduleResponse {
  draft_id?: string;
  created_at?: string;
  score_history: number[];
  assignments: Assignment[];
  final_score?: number;
}

/**
 * Summary record for the draft history list
 */
export interface DraftSummary {
  public_id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  score: number;
}

/**
 * Full details of a saved schedule draft
 * */
export interface ScheduleDraft {
  public_id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  score: number;
  assignments: Assignment[];
}

/**
 * Manages the streaming generation of a schedule via Server-Sent Events (SSE).
 *
 *
 * Uses an Axios `onDownloadProgress` handler to parse a stream of data chunks.
 * This allows the UI to show real-time progress to the user.
 */
export const generateScheduleStream = async (
  requestData: any,
  onProgress: (data: any) => void,
  onComplete: (data: ScheduleResponse) => void,
  onError: (err: any) => void
) => {
  let seenBytes = 0;
  let buffer = "";

  try {
    await axiosInstance.post('/schedule/drafts/generate', requestData, {
      onDownloadProgress: (progressEvent) => {
        const xhr = progressEvent.event?.target;
        const response = xhr?.response || "";

        // Extract only the new part of the response
        const newChunk = response.substring(seenBytes);
        seenBytes = response.length;

        buffer += newChunk;

        // SSE messages are separated by double newlines
        const parts = buffer.split("\n\n");

        // Loop through all parts except the last one (which might be incomplete)
        for (let i = 0; i < parts.length - 1; i++) {
          const line = parts[i];
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "");
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.type === "progress") onProgress(payload);
              if (payload.type === "result") onComplete(payload.payload);
              if (payload.type === "error") onError(payload);
            } catch (e) {
              console.error("Stream parse error:", e);
            }
          }
        }

        // Keep the last part in the buffer for the next chunk
        buffer = parts[parts.length - 1];
      }
    });
  } catch (err: any) {
    const errorMessage = err.response?.data?.detail || err.message || "Schedule Generation Failed";
    onError({ type: "error", message: errorMessage });
  }
};

/**
 * Fetches a list of all previously generated schedule drafts.
 */
export const getScheduleDraftSummaries = async (): Promise<DraftSummary[]> => {
  try {
    const response = await axiosInstance.get(`/schedule/drafts`);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Drafts Request Failed");
  }
}

/**
 * Retrieves the full assignment list for a specific draft.
 */
export const getScheduleDraftSchedule = async (uuid: string): Promise<ScheduleDraft> => {
  try {
    const response = await axiosInstance.get(`/schedule/drafts/${uuid}`);

    return response.data
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Draft Schedule Request Failed");
  }
}

/**
 * Promotes a draft to the official schedule.
 * WARNING: This will overwrite any existing shifts for the given date range and positions.
 */
export const publishDraft = async (uuid: string): Promise<ScheduleResponse> => {
  try {
    const response = await axiosInstance.post(`/schedule/drafts/${uuid}/publish`);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Draft Publishing Failed");
  }
}

/**
 * Permanently removes a draft from the history.
 */
export const deleteDraft = async (uuid: string) => {
  try {
    const response = await axiosInstance.delete(`/schedule/drafts/${uuid}/delete`);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Draft Publishing Failed");
  }
}

/**
 * Retrieves the published shifts for a specific month and year.
 */
export const getMonthlySchedule = async (year: number, month: number): Promise<Shift[]> => {
  try {
    const response = await axiosInstance.get<Shift[]>(`/schedule/${year}/${month}`);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Schedule Request Failed");
  }
}