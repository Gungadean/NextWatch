/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * BuilderPage.tsx
 *
 * Page for building schedules.
 */

import {useEffect, useRef, useState} from "react";
import {Center, Flex, Spinner, Text, VStack} from "@chakra-ui/react";
import { useColorModeValue } from "../components/ui/color-mode";
import {parseDate, toSimpleDate} from "@/utils/timeUtils.ts";
import ConfirmPublishDraftModal from "@/features/schedule/components/ConfirmPublishDraftModal.tsx";
import ConfirmDeleteDraftModal from "@/features/schedule/components/ConfirmDeleteDraftModal.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import BuilderSidebar from "@/features/schedule/components/BuilderSidebar.tsx";
import BuilderMainStage from "@/features/schedule/components/BuilderMainStage.tsx";
import {useScheduleGenerator} from "@/features/schedule/hooks/useScheduleGenerator.ts";
import {useBuilderData} from "@/features/schedule/hooks/useBuilderData.ts";
import {type ScheduleRequest, validateScheduleDraft} from "@/features/schedule/scheduleApi.ts";

const BuilderPage = () => {
  const [viewMode, setViewMode] = useState<string>("calendar");

  const [isConfirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  const [maxSteps, setMaxSteps] = useState<number | string>(50000);
  const [minDaysOff, setMinDaysOff] = useState<number | string>(1);
  const [maxDaysOff, setMaxDaysOff] = useState<number | string>(3);

  const [selectAllPositions, setSelectAllPositions] = useState<boolean>(true);
  const [selectIgnorePending, setIgnorePending] = useState<boolean>(false);
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

  // States for handling validation indicator icons
  const [globalHardErrors, setGlobalHardErrors] = useState<string[]>([]);
  const [globalSoftWarnings, setGlobalSoftWarnings] = useState<string[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(false);

  const {
    employees,
    positions,
    templates,
    draftSummaries,
    setDraftSummaries,
    isLoading
  } = useBuilderData(startDate, setCalendarViewDate);

  const {
    isGenerating,
    isLoadingDraft,
    currentDraftData,
    setCurrentDraftData,
    selectedDraftId,
    setSelectedDraftId,
    generateSchedule,
    selectDraft,
    updateCurrentDraft,
    buildSkeleton,
    genProgress
  } = useScheduleGenerator(setDraftSummaries, setCalendarViewDate, setStartDate, setEndDate);

  /**
   * Get current schedule parameters to help validate draft schedule.
   */
  const currentScheduleParams: ScheduleRequest = {
    start_date: startDate,
    end_date: endDate,
    position_ids: selectAllPositions ? positions.map(p => p.id) : selectedPositionIds.map(Number),
    ignore_pending_timeoff: selectIgnorePending,
    min_days_off: minDaysOff === "" ? 1 : Number(minDaysOff),
    max_days_off: maxDaysOff === "" ? 1 : Number(maxDaysOff),
    max_steps: Number(maxSteps) || 10000,
  };

  const mainBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const joinedSelectedIds = selectedPositionIds.join(',');

  useEffect(() => {
    if (isLoadingDraft) {
      setIsScheduleLoading(true);
    }
  }, [isLoadingDraft]);

  const prevDraftRef = useRef(currentDraftData);

  /**
   * Automatically validate currently loaded draft
   */
  useEffect(() => {
    const isDraftChange = prevDraftRef.current !== currentDraftData;
    prevDraftRef.current = currentDraftData;

    const runGlobalValidation = async () => {
      if (!currentDraftData) {
        setIsScheduleLoading(false);
        return;
      }

      try {
        const result = await validateScheduleDraft({
          params: currentScheduleParams,
          assignments: currentDraftData.assignments,
          is_global_audit: true
        });

        setGlobalHardErrors(result.hard_error || []);
        setGlobalSoftWarnings(result.soft_warnings || []);
      } catch (error) {
        console.error("Global validation failed:", error);
      } finally {
        setIsScheduleLoading(false);
      }
    };

    if (isDraftChange) {
      runGlobalValidation();
    } else {
      // Wait 500ms on non-draft changes to prevent rerender.
      const timeoutId = setTimeout(() => {
        runGlobalValidation();
      }, 500);

      // Cancel the timer if they keep typing
      return () => clearTimeout(timeoutId);
    }
  }, [
    currentDraftData,
    startDate,
    endDate,
    minDaysOff,
    maxDaysOff,
    selectIgnorePending,
    selectAllPositions,
    joinedSelectedIds
  ]);

  /**
   * Wrap the hook's generate function to grab from the current form state.
   */
  const handleGenerate = (isRegen: boolean = false, regenDates: string[] = []) => {
    const positionIds = selectAllPositions ? positions.map(p => p.id) : selectedPositionIds.map(Number);

    generateSchedule({
      startDate,
      endDate,
      positionIds,
      selectIgnorePending,
      minDaysOff: minDaysOff === "" ? 1 : Number(minDaysOff),
      maxDaysOff: maxDaysOff === "" ? 1 : Number(maxDaysOff),
      maxSteps: Number(maxSteps) || 10000
    }, isRegen, regenDates);
  }

  /**
   * Handles building skeleton for drafts
   */
  const handleBuildSkeleton = () => {
    setViewMode("calendar");
    const positionIds = selectAllPositions ? positions.map(p => p.id) : selectedPositionIds.map(Number);
    buildSkeleton({
      startDate,
      endDate,
      positionIds,
      selectIgnorePending,
      minDaysOff: minDaysOff === "" ? 1 : Number(minDaysOff),
      maxDaysOff: maxDaysOff === "" ? 1 : Number(maxDaysOff),
      maxSteps: Number(maxSteps) || 10000
    }, positions);
  };

  /**
   * Wrap the draftSelect to apply draft parameters to sidebar.
   */
  const handleDraftSelect = async (draftId: string) => {
    const loadedDraft = await selectDraft(draftId);

    if (loadedDraft && loadedDraft.parameters) {
      const params = loadedDraft.parameters;

      setMinDaysOff(params.min_days_off);
      setMaxDaysOff(params.max_days_off);
      setMaxSteps(params.max_steps);
      setIgnorePending(params.ignore_pending_timeoff);

      // Handle the Position Checkboxes
      if (params.position_ids.length === 0 ||
        params.position_ids.length === positions.length) {
        setSelectAllPositions(true);
      } else {
        setSelectAllPositions(false);
        // Map numbers back to strings for the CheckboxGroup value
        setSelectedPositionIds(params.position_ids.map(String));
      }
    }
  };

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
   * Handle changing the minimum number of days off
   */
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

  /**
   * Handle changing the maximum number of days off
   */
  const handleMaxDaysOffChange = (rawDays: string) => {
    if (rawDays === "") {
      setMaxDaysOff("");
      return;
    }

    const days = Number(rawDays);

    if (days > 10 || days < 0) {
      toaster.create({
          title: "Invalid Input",
          description: "Max Days off must be between 0 and 10.",
          type: "error"
        });
      return;
    }

    setMaxDaysOff(days);
  }

  /**
   * Handle changing the maximum steps for annealing.
   */
  const handleMaxStepsChange = (rawSteps: string) => {
    if (rawSteps === "") {
      setMaxSteps("");
      return;
    }

    const steps = Number(rawSteps);

    setMaxSteps(steps);
  }

  const isInitialLoad = isLoading && employees.length === 0;

  if (isInitialLoad) {
    return (
      <Center h="100vh" bg={mainBg}>
        <VStack>
          <Spinner size="xl" color="blue.500"/>
          <Text color="gray.500">Loading Builder...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Flex h="calc(100vh - 64px)" overflow="hidden" borderRadius="md">
      {/* Left Sidebar: Config and History */}
      <BuilderSidebar
        mainBg={mainBg}
        borderColor={borderColor}
        minDaysOff={minDaysOff}
        maxDaysOff={maxDaysOff}
        maxSteps={maxSteps}
        positions={positions}
        selectAllPositions={selectAllPositions}
        selectIgnorePending={selectIgnorePending}
        selectedPositions={selectedPositionIds}
        onSelectAllPositionsChange={setSelectAllPositions}
        onSelectIgnorePendingChange={setIgnorePending}
        onSelectedPositionsChange={setSelectedPositionIds}
        onMaxStepsChange={handleMaxStepsChange}
        onMinDaysOffChange={handleMinDaysOffChange}
        onMaxDaysOffChange={handleMaxDaysOffChange}
        draftSummaries={draftSummaries}
        selectedDraftId={selectedDraftId}
        startDate={startDate}
        endDate={endDate}
        isGenerating={isGenerating}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onDraftSelect={handleDraftSelect}
        onBuildSkeleton={handleBuildSkeleton}
        currentDraftData={currentDraftData}
      />

      {/* Main Content: Schedule Builder */}
      <BuilderMainStage
        mainBg={mainBg}
        borderColor={borderColor}
        employees={employees}
        positions={positions}
        templates={templates}
        minDaysOff={Number(minDaysOff) || 1}
        selectedDraftId={selectedDraftId}
        currentDraftData={currentDraftData}
        startDate={startDate}
        endDate={endDate}
        viewMode={viewMode}
        genProgress={genProgress}
        isScheduleLoading={isScheduleLoading}
        isGenerating={isGenerating}
        calendarViewDate={calendarViewDate}
        navMonth={navMonth}
        setViewMode={setViewMode}
        onDeleteDraft={() => setConfirmDeleteModalOpen(true)}
        onPublishDraft={() => setConfirmPublishModalOpen(true)}
        onCurrentDraftData={updateCurrentDraft}
        generateSchedule={handleGenerate}
        scheduleParams={currentScheduleParams}
        globalHardErrors={globalHardErrors}
        globalSoftWarnings={globalSoftWarnings}
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