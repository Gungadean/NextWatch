/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * personnelApi.ts
 *
 * This module manages all communication with the /employees endpoints.
 * It provides the data structures and methods required to maintain the organization's roster.
 */

import axiosInstance from "../../axiosConfig.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Represents an employee's time off request.
 */
export interface TimeOffRequest {
  id: number;
  start_date: string;
  end_date: string;
  request_type: string;
  status: string;
}

/**
 * Represents a job qualification or watch station role.
 */
export interface Position {
  id: number;
  name: string;
  color: string;
}

/**
 * Minimal employee identity data.
 */
export interface BasicEmployee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  max_shift_length?: number | null;
  target_weekly_hours?: number | null;
}

/**
 * The standard Employee model
 * Includes nested qualifications and time-off records.
 */
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  positions: Position[];
  time_off_requests: TimeOffRequest[];
  max_shift_length?: number | null;
  target_weekly_hours?: number | null;
}

/**
 * Optimized model for scheduling views where only dates and names are required.
 */
export interface EmployeeWithTimeOff {
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    time_off_requests: TimeOffRequest[];
    positions: Position[];
    max_shift_length?: number | null;
    target_weekly_hours?: number | null;
}

/**
 * Interface of data to be sent when adding an employee.
 */
export interface EmployeeAddRequest {
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  positions: number[];
  max_shift_length?: number | null;
  target_weekly_hours?: number | null;
}

/**
 * Interface of data for deleting an employee.
 */
export interface EmployeeDeleteRequest {
  id: number;
}

/**
 * Retrieves the full list of employees from the database.
 */
export const getEmployees = async (includeTimeOff = false): Promise<Employee[]> => {
  try {
    const url = includeTimeOff ? "/employees?include_time_off=true" : "/employees";
    const response = await axiosInstance.get<Employee[]>(url);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Employee query failed"));
  }
}

/**
 * Wrapper to fetch all employees with scheduling conflicts (Time Off) included.
 */
export const getEmployeesWithTimeOff = async () => {
    return getEmployees(true);
};

/**
 * Submits a request to add a new employee to the organization.
 */
export const addEmployee = async (data: EmployeeAddRequest): Promise<Employee> => {
  try {
    const response = await axiosInstance.post<Employee>('/employees/add', data);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Employee adding failed"));
  }
}

/**
 * Update an employees data.
 */
export const updateEmployee = async (id: number, data: EmployeeAddRequest): Promise<Employee> => {
  try {
    const response = await axiosInstance.patch<Employee>(`/employees/${id}/update`, data);

    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Employee adding failed"));
  }
}

/**
 * Performs a bulk deletion of employee records.
 */
export const deleteEmployees = async (employees: EmployeeDeleteRequest[]) => {
  try {
    await axiosInstance.post<EmployeeDeleteRequest[]>('/employees/delete', employees);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Employee deletion failed"));
  }
}