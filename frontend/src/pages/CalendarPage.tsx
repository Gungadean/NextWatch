/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarPage.tsx
 *
 * The primary view for the official schedule.
 * Displays the published roster in a standard monthly grid format.
 */

import {useEffect, useState} from "react";
import {Box, Button, Heading, Stack} from "@chakra-ui/react";
import {getMonthlySchedule, type Shift} from "@/features/schedule/scheduleApi.ts";
import {CalendarGrid} from "@/components/CalendarGrid.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import {type EmployeeWithTimeOff, getEmployeesWithTimeOff} from "@/features/personnel/personnelApi.ts";
import {useScheduleViewData} from "@/features/schedule/hooks/useScheduleViewData.ts";

/**
 * Main calendar layout for displaying schedule calendar.
 * Retrieves data from backend about schedule and displays on calendar for end user.
 */
const CalendarPage = () => {
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const selectedMonth = currentViewDate.getMonth() + 1;
  const selectedYear = currentViewDate.getFullYear();

  const { events, timelineRows, timelineItems } = useScheduleViewData(employees, shifts);

  /**
   * Data Fetching Effect.
   * Runs whenever the user navigates to a new month.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both the schedule and the employees
        const [scheduleData, employeeData] = await Promise.all([
          getMonthlySchedule(selectedYear, selectedMonth),
          getEmployeesWithTimeOff()
        ]);

        setEmployees(employeeData);
        setShifts(scheduleData);
      } catch (error: unknown) {
        toaster.create({
          title: "Schedule Load Failed",
          description: getErrorMessage(error, "Could not retrieve schedule or personnel data."),
          type: "error"
        });
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  /**
   * Handles navigation between months.
   */
  const updateSelectedMonth = (change: number) => {
    const newDate = new Date(currentViewDate)
    newDate.setMonth(newDate.getMonth() + change)
    setCurrentViewDate(newDate)
  }

  return (
    <Box p="0" h="100%" display="flex" flexDirection="column">

      {/* Header Controls */}
      <Stack direction="row" justify="space-between" paddingBottom="2" align="center">
        <Button onClick={() => updateSelectedMonth(-1)}>
          Previous Month
        </Button>

        <Heading size="lg">
          {currentViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Heading>

        <Button onClick={() => updateSelectedMonth(1)}>
          Next Month
        </Button>
      </Stack>

      {/* The Reusable Grid Component */}
      <Box borderRadius="md" flex="1" overflowY="auto">
        <CalendarGrid
          year={selectedYear}
          month={selectedMonth}
          events={events}
          timelineRows={timelineRows}
          timelineItems={timelineItems}
        />
      </Box>
    </Box>
  );
};

export default CalendarPage;