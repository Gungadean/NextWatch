/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * personnelApi.ts
 *
 * Handles personnel API functions for retrieving, adding, and deleting personnel.
 */

import axiosInstance from "../../axiosConfig.tsx";

/**
 * Interface of data to be sent when adding a member.
 */
export interface MemberAddRequest {
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  quals: number[];
}

/**
 * Interface of data for deleting a member.
 */
export interface MemberDeleteRequest {
  id: number;
}

/**
 * Interface of data for a member query.
 */
export interface MemberQueryResponse {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  quals: number[];
}

/**
 * Request list of all members.
 */
export const getMemberList = async (): Promise<MemberQueryResponse[]> => {
  try {
    const response = await axiosInstance.get('/personnel/list');

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Member query failed");
  }
}

/**
 * Request a member to be added.
 */
export const addMember = async (data: MemberAddRequest): Promise<MemberQueryResponse> => {
  try {
    const response = await axiosInstance.post<MemberQueryResponse>('/personnel/add', data);

    return response.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Member adding failed");
  }
}

/**
 * Request for a list of members to be deleted.
 */
export const deleteMembers = async (members: MemberDeleteRequest[]) => {
  try {
    await axiosInstance.post<MemberDeleteRequest[]>('/personnel/delete', members);
  } catch (err: any) {
    throw new Error(err.response?.data?.detail || "Members deletion failed");
  }
}