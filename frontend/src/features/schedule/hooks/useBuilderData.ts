/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useBuilderData.ts
 *
 * Hook to handle fetching of required data for builder page.
 */

import React, {useEffect, useState} from "react";
import {type DraftSummary, getScheduleDraftSummaries} from "@/features/schedule/scheduleApi.ts";
import {type EmployeeWithTimeOff, getEmployeesWithTimeOff, type Position} from "@/features/personnel/personnelApi.ts";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import {toaster} from "@/components/ui/toaster.tsx";
import {getPositionList} from "@/features/position/positionApi.ts";

export const useBuilderData = (
  startDate: string,
  setCalendarViewDate: React.Dispatch<React.SetStateAction<Date>>
) => {
  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the data (Personnel, Positions, Draft History) on mount.
   */
  useEffect(() => {
    const parts = startDate.split('-').map(Number);
    setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1));

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const [employeeData, draftData, positionData] = await Promise.all([
          getEmployeesWithTimeOff(),
          getScheduleDraftSummaries(),
          getPositionList()
        ]);
        setEmployees(employeeData);
        setDraftSummaries(draftData);
        setPositions(positionData);
      } catch (error: unknown) {
        toaster.create({
          title: "Fetching Page Data Failed",
          description: getErrorMessage(error, "Unable to fetch data from backend."),
          type: "error"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [startDate, setCalendarViewDate]);

  return {
    employees,
    positions,
    draftSummaries,
    setDraftSummaries,
    isLoading
  };
}