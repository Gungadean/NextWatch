/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * BuilderPage.tsx
 *
 * Page for building schedules.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Tabs,
  Text,
  Spinner
} from "@chakra-ui/react";
import { useColorModeValue } from "../components/ui/color-mode";
import {
  type ScheduleResponse,
  getScheduleDraftSummaries,
  type DraftSummary,
  type ScheduleDraft,
  type Watchstander,
  getScheduleDraftSchedule,
  generateScheduleStream
} from "../features/schedule/scheduleApi.ts";
import {
  getEmployeesWithTimeOff,
  type EmployeeWithTimeOff,
  type Position
} from "../features/personnel/personnelApi";
import {type CalendarEvent, CalendarGrid} from "@/components/CalendarGrid.tsx";
import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {parseDate, toSimpleDate} from "@/utils/timeUtils.ts";
import {getPositionList} from "@/features/position/positionApi.ts";
import ConfirmPublishDraftModal from "@/features/schedule/components/ConfirmPublishDraftModal.tsx";
import ConfirmDeleteDraftModal from "@/features/schedule/components/ConfirmDeleteDraftModal.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import BuilderSidebar from "@/features/schedule/components/BuilderSidebar.tsx";

const BuilderPage = () => {
  const [viewMode, setViewMode] = useState<string>("calendar");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  const [isConfirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);
  const [currentDraftData, setCurrentDraftData] = useState<ScheduleResponse | ScheduleDraft | null>();

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const nextStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return toSimpleDate(nextStart);
  });

  // Default start date to the first day of next month
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const nextEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return toSimpleDate(nextEnd);
  });

  // Default end date to the last day of next month
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  });

  const mainBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const buttonBG = useColorModeValue("gray.100", "gray.700");

  /**
   * Fetch the data (Personnel, Positions, Draft History) on mount.
   */
  useEffect(() => {
    const parts = startDate.split('-').map(Number);
    setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1));

    const fetchData = async () => {
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
      }
    }

    fetchData();
  }, [startDate]);

  /**
   * Handle generating a new draft schedule.
   */
  const handleGenerate = async () => {
    if (positions.length === 0) {
      toaster.create({ title: "No positions defined. Cannot generate.", type: "error" });
      return;
    }

    setIsGenerating(true);
    setGenProgress(0);
    setCurrentDraftData(null);

    try {
      const requestData = {
        start_date: startDate,
        end_date: endDate,
        position_ids: positions.map(p => p.id),
        min_days_off: 1,
        max_steps: 5000
      };

      await generateScheduleStream(
        requestData,
        (progress) => setGenProgress(progress.percent),
        (result) => {
          setCurrentDraftData(result);

          const newSummary: DraftSummary = {
              public_id: result.draft_id || "Undefined",
              created_at: result.created_at || new Date().toISOString(),
              start_date: startDate,
              end_date: endDate,
              score: result.final_score || -1
          };

          setDraftSummaries(prev => [newSummary, ...prev]);
          setSelectedDraftId(newSummary.public_id);
          setIsGenerating(false);

          setCalendarViewDate(parseDate(startDate));
          toaster.create({ title: "Schedule Generated!", type: "success" });
        },
        (error) => {
          setIsGenerating(false);
          toaster.create({ title: "Generation Error", description: error.message, type: "error" });
        }
      );
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  /**
   * Loads a specific draft from history into the main view.
   */
  const handleDraftSelect = async (id: string) => {
    if (id === selectedDraftId) return; // Don't reload if already selected

    setSelectedDraftId(id);
    setIsLoadingDraft(true);
    setCurrentDraftData(null);

    try {
      const draft_data = await getScheduleDraftSchedule(id);
      setCurrentDraftData(draft_data);

      setStartDate(draft_data.start_date);
      setEndDate(draft_data.end_date);
      setCalendarViewDate(parseDate(draft_data.start_date));
    } catch {
      toaster.create({ title: "Could not load draft details", type: "error" });
    } finally {
      setIsLoadingDraft(false);
    }
  }

  /**
   * Navigates the Calendar view by month.
   */
  const navMonth = (dir: number) => {
      const newDate = new Date(calendarViewDate);
      newDate.setMonth(newDate.getMonth() + dir);

      // Prevent navigating forward/back if there's no data for those months.
      if (parseDate(startDate).getMonth() <= newDate.getMonth()
         && parseDate(endDate).getMonth() >= newDate.getMonth())
      {
        setCalendarViewDate(newDate);
      }
  };

  /**
   * Handle changing the startDate with safety checking
   */
  const handleStartDateChange = (start: string) => {
    setStartDate(start);
    if (startDate > endDate) {
      setEndDate(start);
    }
  }

  /**
   * Handle changing the endDate with
   */
  const handleEndDateChange = (end: string) => {
    setEndDate(end);
    if (endDate < startDate) {
      setStartDate(end);
    }
  }

  /**
   * Convert draft data into calendar events for display on CalendarGrid.
   */
  const builderEvents: CalendarEvent[] = useMemo(() => {
    return (currentDraftData?.assignments || []).map(a => ({
        id: `${a.date}-${a.watchstation.id}`,
        date: a.date,
        label: a.watchstation.name.substring(0,3),
        text: (a.watchstander as Watchstander).name || "Unknown",
        color: a.watchstation.color
    }));
  }, [currentDraftData]);

  /**
   * Convert draft data into timeline rows for display on TimelineGrid.
   */
  const timelineRows: TimelineRow[] = useMemo(() => {
    return employees.map(emp => ({
      id: emp.id,
      label: `${emp.last_name}, ${emp.first_name.charAt(0)}.`,
    }));
  }, [employees]);

  /**
   * Convert draft data into timeline items for display on TimelineGrid.
   */
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add time off requests
    employees.forEach(emp => {
      (emp.time_off_requests || [])
        .filter(req => req.status !== "Denied")
        .forEach((req, i) => {
        items.push({
          id: `time-off-${emp.id}-${i}`,
          rowId: emp.id,
          start: req.start_date,
          end: req.end_date,
          label: `Time-Off: ${req.request_type} ${req.status}`,
          color: req.status === "Approved" ? "green" : "gray"
        });
      });
    });

    // Add draft assignments
    if (currentDraftData?.assignments) {
      currentDraftData.assignments.forEach((assign, i) => {
        items.push({
          id: `shift-${i}`,
          rowId: assign.watchstander.id,
          start: assign.date,
          end: assign.date,
          label: `Shift: ${assign.watchstation.name}`,
          color: assign.watchstation.color
        });
      });
    }

    return items;
  }, [employees, currentDraftData]);

  return (
    <Flex h="calc(100vh - 64px)" overflow="hidden" borderRadius="md">
      {/* Left Sidebar: Config and History */}

      <BuilderSidebar
        mainBg={mainBg}
        borderColor={borderColor}
        draftSummaries={draftSummaries}
        selectedDraftId={selectedDraftId}
        startDate={startDate}
        endDate={endDate}
        isGenerating={isGenerating}
        genProgress={genProgress}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onGenerate={handleGenerate}
        onDraftSelect={handleDraftSelect}
      />

      {/* Main Stage */}
      <Flex flex="1" direction="column" bg={mainBg} overflow="hidden">
        <Flex h="60px" borderBottom="1px solid" borderColor={borderColor} align="center" px={6} justify="space-between">
          <Tabs.Root value={viewMode} onValueChange={(d) => setViewMode(d.value)} variant="plain">
             <Tabs.List bg={buttonBG} p={1} borderRadius="md">
              <Tabs.Trigger
                value="calendar"
                px={3}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">Calendar</Tabs.Trigger>
              <Tabs.Trigger
                value="timeline"
                px={3}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">Timeline</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          {/* Month Navigation (Calendar Mode Only) */}
          {viewMode === "calendar" && (
            <HStack>
              <Button
                border="1px solid"
                background={buttonBG}
                size="xs"
                variant="ghost"
                onClick={() => navMonth(-1)}>Prev</Button>
              <Text fontWeight="bold" w="120px" textAlign="center">
                  {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <Button
                border="1px solid"
                background={buttonBG}
                size="xs"
                variant="ghost"
                onClick={() => navMonth(1)}>Next</Button>
            </HStack>
          )}

          {/* Action Buttons */}
          <HStack gap={3}>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="red"
              onClick={() => setConfirmDeleteModalOpen(true)}>Delete Draft</Button>
            <Button
              size="sm"
              colorPalette="green"
              disabled={!selectedDraftId}
              onClick={() => setConfirmPublishModalOpen(true)}>Publish Selected</Button>
          </HStack>
        </Flex>

        {/* Content Area */}
        <Box flex="1" overflow="auto" p={6}>
          {isLoadingDraft ? (
            <Flex h="100%" justify="center" align="center" direction="column">
              <Spinner size="xl" mb={4} />
              <Text color="gray.500">Loading Schedule...</Text>
          </Flex>
          ) : !currentDraftData && viewMode === 'calendar' ? (
             <Flex h="100%" justify="center" align="center" direction="column" color="gray.400">
                <Heading size="md" mb={2}>Ready to Build</Heading>
                <Text>Select date range and generate.</Text>
             </Flex>
          ) : viewMode === "calendar" ? (
             <CalendarGrid
                year={calendarViewDate.getFullYear()}
                month={calendarViewDate.getMonth() + 1}
                events={builderEvents}
              />
          ) : (
             <TimelineGrid
                rangeStart={startDate}
                rangeEnd={endDate}
                rows={timelineRows}
                items={timelineItems}
                showConflicts={false}
            />
          )}
        </Box>
      </Flex>

      {/* Modals */}
      <ConfirmPublishDraftModal
        isOpen={isConfirmPublishModalOpen}
        onOpenChange={(e) => setConfirmPublishModalOpen(e.open)}
        draft_id={selectedDraftId ? selectedDraftId : ""}
        drafts={draftSummaries}
        onDraftChange={setDraftSummaries}
        onDraftViewChange={setCurrentDraftData}
      />

      <ConfirmDeleteDraftModal
        isOpen={isConfirmDeleteModalOpen}
        onOpenChange={(e) => setConfirmDeleteModalOpen(e.open)}
        draft_id={selectedDraftId ? selectedDraftId : ""}
        drafts={draftSummaries}
        onDraftChange={setDraftSummaries}
        onDraftViewChange={setCurrentDraftData}
        onSelectedChange={setSelectedDraftId}
        onSetViewChange={setViewMode}
      />
    </Flex>
  );
};

export default BuilderPage;