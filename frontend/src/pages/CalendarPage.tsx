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
import {Box, Button, Flex, Heading, HStack, Tabs} from "@chakra-ui/react";
import {getMonthlySchedule, type Shift} from "@/features/schedule/scheduleApi.ts";
import {CalendarGrid} from "@/components/CalendarGrid.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import {type EmployeeWithTimeOff, getEmployeesWithTimeOff} from "@/features/personnel/personnelApi.ts";
import {useScheduleViewData} from "@/features/schedule/hooks/useScheduleViewData.ts";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {TimelineGrid} from "@/components/TimelineGrid.tsx";
import FullScreenTimelineModal from "@/components/FullScreenTimelineModal.tsx";
import {toSimpleDate} from "@/utils/timeUtils.ts";

/**
 * Main calendar layout for displaying schedule calendar.
 * Retrieves data from backend about schedule and displays on calendar for end user.
 */
const CalendarPage = () => {
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const [viewMode, setViewMode] = useState<string>("calendar");
  const [isFullScreenOpen, setFullScreenOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const selectedMonth = currentViewDate.getMonth() + 1;
  const selectedYear = currentViewDate.getFullYear();

  const startDate = toSimpleDate(new Date(selectedYear, selectedMonth - 1, 1));
  const endDate = toSimpleDate(new Date(selectedYear, selectedMonth, 0));

  const { events, timelineRows, timelineItems } = useScheduleViewData(employees, shifts);

  const buttonBG = useColorModeValue("gray.100", "gray.700");
  const mainBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

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
    <Box p="0" pb={0} h="calc(100vh - 64px)" display="flex" flexDirection="column">

      {/* Header Controls */}
      <Flex justify="space-between" align="center" paddingBottom="4">

        {/* Left: View Switcher */}
        <Box flex="1">
          <Tabs.Root value={viewMode} onValueChange={(e) => setViewMode(e.value)} variant="plain">
            <Tabs.List bg={buttonBG} p={1} borderRadius="md" w="fit-content">
              <Tabs.Trigger
                value="calendar"
                px={4}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">
                Calendar
              </Tabs.Trigger>
              <Tabs.Trigger
                value="timeline"
                px={4}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">
                Timeline
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Box>

        {/* Center: Month Navigation */}
        <HStack gap={4} flex="0 0 auto">
          <Button variant="surface" size="sm" onClick={() => updateSelectedMonth(-1)}>Prev</Button>
          <Heading size="md" minW="180px" textAlign="center">
            {currentViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Heading>
          <Button variant="surface" size="sm" onClick={() => updateSelectedMonth(1)}>Next</Button>
        </HStack>

        {/* Right: Spacer to properly center month navigation controls */}
        <Box flex="1" display="flex" justifyContent="flex-end" />
      </Flex>

      {/* The Reusable Grid Component */}
      <Box
        borderRadius="md"
        flex="1"
        position="relative"
        overflow="hidden"
        border="1px solid"
        borderColor={borderColor}
        bg={mainBg}>
        <Box w="100%" h="100%" overflowY="auto" overflowX="hidden">
          {viewMode === "calendar" ? (
            <CalendarGrid
              year={selectedYear}
              month={selectedMonth}
              events={events}
              timelineRows={timelineRows}
              timelineItems={timelineItems}
            />
          ) : (
            <TimelineGrid
              rangeStart={startDate}
              rangeEnd={endDate}
              rows={timelineRows}
              items={timelineItems}
              showConflicts={false}
              enableEmployeeModal={true}
              enableHighlight={true}
              onExpandView={() => setFullScreenOpen(true)}
            />
          )}
        </Box>
      </Box>

      <FullScreenTimelineModal
        open={isFullScreenOpen}
        onOpenChange={(details) => setFullScreenOpen(details.open)}
        timelineItems={timelineItems}
        timelineRows={timelineRows}
        rangeStart={startDate}
        rangeEnd={endDate}
        mainBg={mainBg}
        borderColor={borderColor}
      />
    </Box>
  );
};

export default CalendarPage;