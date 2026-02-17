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
import {getMonthlySchedule} from "@/features/schedule/scheduleApi.ts";
import {type CalendarEvent, CalendarGrid} from "@/components/CalendarGrid.tsx";
import {toaster} from "@/components/ui/toaster.tsx";

/**
 * Main calendar layout for displaying schedule calendar.
 * Retrieves data from backend about schedule and displays on calendar for end user.
 */
const CalendarPage = () => {
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const selectedMonth = currentViewDate.getMonth() + 1;
  const selectedYear = currentViewDate.getFullYear();

  /**
   * Data Fetching Effect.
   * Runs whenever the user navigates to a new month.
   */
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getMonthlySchedule(selectedYear, selectedMonth);

        // Convert shifts into calendar events for CalendarGrid.
        const normalizedEvents: CalendarEvent[] = data.map(shift => ({
          id: shift.id,
          date: shift.shift_date,
          label: shift.position?.name.substring(0, 3) || "?",
          text: shift.employee ?
            `${shift.employee.last_name}, ${shift.employee.first_name} ${shift.employee.middle_name.charAt(0)}.`
            : "Unknown",
          color: shift.position?.color || "#3256a8"
        }));

        setEvents(normalizedEvents);
      } catch (error: any) {
        toaster.create({
          title: "Schedule Load Failed",
          description: error.message || "Could not retrieve shifts.",
          type: "error"
        });
      }
    };

    fetchSchedule();
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
    <Box p="4" h="100%" display="flex" flexDirection="column">

      {/* Header Controls */}
      <Stack direction="row" justify="space-between" paddingBottom="5" align="center">
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
        />
      </Box>
    </Box>
  );
};

export default CalendarPage;