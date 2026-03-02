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
import {Flex} from "@chakra-ui/react";
import { useColorModeValue } from "../components/ui/color-mode";
import {
  getScheduleDraftSummaries,
  type DraftSummary,
  type Watchstander
} from "../features/schedule/scheduleApi.ts";
import {
  getEmployeesWithTimeOff,
  type EmployeeWithTimeOff,
  type Position
} from "../features/personnel/personnelApi";
import {type CalendarEvent} from "@/components/CalendarGrid.tsx";
import {type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {parseDate, toSimpleDate} from "@/utils/timeUtils.ts";
import {getPositionList} from "@/features/position/positionApi.ts";
import ConfirmPublishDraftModal from "@/features/schedule/components/ConfirmPublishDraftModal.tsx";
import ConfirmDeleteDraftModal from "@/features/schedule/components/ConfirmDeleteDraftModal.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import BuilderSidebar from "@/features/schedule/components/BuilderSidebar.tsx";
import BuilderMainStage from "@/features/schedule/components/BuilderMainStage.tsx";
import {useScheduleGenerator} from "@/features/schedule/hooks/useScheduleGenerator.ts";

const BuilderPage = () => {
  const [viewMode, setViewMode] = useState<string>("calendar");

  const [isConfirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);

  const [maxSteps, setMaxSteps] = useState<number | string>(10000);
  const [minDaysOff, setMinDaysOff] = useState<number | string>(1);

  const [selectAllPositions, setSelectAllPositions] = useState<boolean>(true);
  const [selectedPositionIds, setSelectedPositionIds] = useState<string[]>([]);



  // Default start date to the first day of next month
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const nextStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return toSimpleDate(nextStart);
  });

  // Default start date to the last day of next month
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

  const {
    isGenerating,
    genProgress,
    isLoadingDraft,
    currentDraftData,
    setCurrentDraftData,
    selectedDraftId,
    setSelectedDraftId,
    generateSchedule,
    selectDraft,
    updateCurrentDraft
  } = useScheduleGenerator(setDraftSummaries, setCalendarViewDate, setStartDate, setEndDate);

  const mainBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

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
   * Wrap the hook's generate function to grab from the current form state.
   */
  const handleGenerate = (isRegen: boolean = false, regenDates: string[] = []) => {
    const positionIds = selectAllPositions ? positions.map(p => p.id) : selectedPositionIds.map(Number);

    generateSchedule({
      startDate,
      endDate,
      positionIds,
      minDaysOff: Number(minDaysOff) || 1,
      maxSteps: Number(maxSteps) || 10000
    }, isRegen, regenDates);
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

  const handleMinDaysOffChange = (rawDays: string) => {
    if (rawDays === "") {
      setMinDaysOff("");
      return;
    }

    const days = Number(rawDays);

    if (days > 10 || days < 0) {
      toaster.create({
          title: "Invalid Input",
          description: "Min Days off must be between 0 and 10.",
          type: "error"
        });
      return;
    }

    setMinDaysOff(days);
  }

  const handleMaxStepsChange = (rawSteps: string) => {
    if (rawSteps === "") {
      setMaxSteps("");
      return;
    }

    const steps = Number(rawSteps);

    setMaxSteps(steps);
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
        color: a.watchstation.color,
        rawAssignment: a
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
        minDaysOff={minDaysOff}
        maxSteps={maxSteps}
        positions={positions}
        selectAllPositions={selectAllPositions}
        selectedPositions={selectedPositionIds}
        onSelectAllPositionsChange={setSelectAllPositions}
        onSelectedPositionsChange={setSelectedPositionIds}
        onMaxStepsChange={handleMaxStepsChange}
        onMinDaysOffChange={handleMinDaysOffChange}
        draftSummaries={draftSummaries}
        selectedDraftId={selectedDraftId}
        startDate={startDate}
        endDate={endDate}
        isGenerating={isGenerating}
        genProgress={genProgress}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onGenerate={handleGenerate}
        onDraftSelect={selectDraft}
      />

      <BuilderMainStage
        mainBg={mainBg}
        borderColor={borderColor}
        employees={employees}
        positions={positions}
        minDaysOff={Number(minDaysOff) || 1}
        selectedDraftId={selectedDraftId}
        currentDraftData={currentDraftData}
        startDate={startDate}
        endDate={endDate}
        viewMode={viewMode}
        isLoadingDraft={isLoadingDraft}
        builderEvents={builderEvents}
        timelineRows={timelineRows}
        timelineItems={timelineItems}
        calendarViewDate={calendarViewDate}
        navMonth={navMonth}
        setViewMode={setViewMode}
        onDeleteDraft={() => setConfirmDeleteModalOpen(true)}
        onPublishDraft={() => setConfirmPublishModalOpen(true)}
        onCurrentDraftData={updateCurrentDraft}
        regenerateSchedule={handleGenerate}
      />

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