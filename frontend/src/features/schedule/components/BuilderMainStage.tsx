/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * BuilderMainStage.tsx
 *
 * Main stage for builder component.
 */

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Progress,
  Spinner,
  Tabs,
  Text
} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {
  type Assignment,
  type ScheduleDraft, type ScheduleRequest,
  type ScheduleResponse,
  type ShiftTemplateRead
} from "@/features/schedule/scheduleApi.ts";
import {CalendarGrid} from "@/components/CalendarGrid.tsx";
import {TimelineGrid} from "@/components/TimelineGrid.tsx";
import type {EmployeeWithTimeOff} from "@/features/personnel/personnelApi.ts";
import {useState} from "react";
import DayEditModal from "@/features/schedule/components/DayEditModal.tsx";
import {useScheduleViewData} from "@/features/schedule/hooks/useScheduleViewData.ts";
import type { PositionWithRequirementsRead } from "@/features/position/positionApi";
import FullScreenTimelineModal from "@/components/FullScreenTimelineModal.tsx";

/**
 * Props for the Builder Main Stage.
 */
interface BuilderMainStageProps {
  mainBg: string;
  borderColor: string;

  employees: EmployeeWithTimeOff[];
  positions: PositionWithRequirementsRead[];
  templates: ShiftTemplateRead[];
  minDaysOff: number;

  selectedDraftId: string | null;
  currentDraftData: ScheduleResponse | ScheduleDraft | null | undefined;
  startDate: string;
  endDate: string;

  viewMode: string;
  genProgress: number;
  isScheduleLoading: boolean;
  isGenerating: boolean;

  calendarViewDate: Date;
  navMonth: (dir: number) => void;
  setViewMode: (mode: string) => void;

  onDeleteDraft: () => void;
  onPublishDraft: () => void;
  onCurrentDraftData: (data: ScheduleResponse | ScheduleDraft | null | undefined) => void;
  generateSchedule: (isRegen: boolean, regenDates: string[]) => void;

  scheduleParams: ScheduleRequest;
  globalHardErrors: string[];
  globalSoftWarnings: string[];
}

/**
 * Main stage component for schedule builder page.
 */
const BuilderMainStage = ({
  mainBg,
  borderColor,
  employees,
  positions,
  templates,
  minDaysOff,
  selectedDraftId,
  currentDraftData,
  startDate,
  endDate,
  viewMode,
  genProgress,
  isScheduleLoading,
  isGenerating,
  calendarViewDate,
  navMonth,
  setViewMode,
  onDeleteDraft,
  onPublishDraft,
  onCurrentDraftData,
  generateSchedule,
  scheduleParams,
  globalHardErrors,
  globalSoftWarnings
}: BuilderMainStageProps) => {
  const buttonBG = useColorModeValue("gray.100", "gray.700");
  const overlayBg = useColorModeValue("whiteAlpha.800", "blackAlpha.800");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayAssignments, setDayAssignments] = useState<Assignment[]>([]);

  const [isFullScreenTimelineOpen, setFullScreenTimelineOpen] = useState(false);

  const [selectedRegenDates, setSelectedRegenDates] = useState<string[]>([]);

  const [prevDraftId, setPrevDraftId] = useState(selectedDraftId);

  // Check if the draft id has changed and reset the selected regen dates.
  if (selectedDraftId !== prevDraftId) {
    setPrevDraftId(selectedDraftId);
    setSelectedRegenDates([]);
  }

  const activeAssignments = currentDraftData?.assignments || [];
  const { events, timelineRows, timelineItems } = useScheduleViewData(employees, activeAssignments);

  /**
   * Handle toggle button for selecting days to regenerate
   */
  const handleToggleRegenDate = (dateStr: string) => {
    setSelectedRegenDates(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr) // Uncheck
        : [...prev, dateStr]              // Check
    );
  };

  /**
   * Handle selecting and opening the DayEditModal when calendar day is clicked.
   */
  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);

    if (currentDraftData) {
      const shiftsForDay = currentDraftData.assignments.filter(a => a.date === dateStr);
      setDayAssignments(shiftsForDay);
    } else {
      setDayAssignments([]);
    }

    setIsModalOpen(true);
  }

  const hasSkeleton = currentDraftData && currentDraftData.assignments.length > 0;
  const isSavedDraft = !!selectedDraftId;

  return (
    <Flex flex="1" direction="column" bg={mainBg} overflow="hidden">
      <Flex h="60px" borderBottom="1px solid" borderColor={borderColor} align="center" px={6}>
        <Box flex="1" display="flex" justifyContent="flex-start">
          {isSavedDraft && (
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
          )}
        </Box>

        {/* Month Navigation (Calendar Mode Only) */}
        <Box flex="1" display="flex" justifyContent="center">
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
        </Box>

        {/* Action Buttons */}
        <Box flex="1" display="flex" justifyContent="flex-end">
          <HStack gap={3}>
            {hasSkeleton && !isSavedDraft && (
              <Button
                size="sm"
                colorPalette="blue"
                loading={isGenerating}
                onClick={() => generateSchedule(false, [])}
              >
                Auto-Assign Employees
              </Button>
            )}

            {isSavedDraft && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={onDeleteDraft}>Delete Draft</Button>
                <Button
                  size="sm"
                  colorPalette="green"
                  disabled={!selectedDraftId}
                  onClick={onPublishDraft}>Publish Selected</Button>
              </>
            )}

            {selectedRegenDates.length > 0 && (
              <Button
                size="sm"
                colorPalette="blue"
                variant="surface"
                onClick={() => {
                  generateSchedule(true, selectedRegenDates);
                  setSelectedRegenDates([])
                }}
              >
                Regenerate {selectedRegenDates.length} Days
              </Button>
            )}
          </HStack>
        </Box>
      </Flex>

      {/* Content Area */}
      <Box flex="1" overflow="hidden" position="relative" display="flex" flexDirection="column">
        <Box flex="1" overflow="auto" p={6}>
          {(isScheduleLoading) ? (
            <Flex h="100%" justify="center" align="center" direction="column">
              <Spinner size="xl" mb={4} />
              <Text color="gray.500">Loading Schedule...</Text>
            </Flex>
          ) : !currentDraftData ? (
            <Flex h="100%" justify="center" align="center" direction="column" color="gray.400">
              <Heading size="md" mb={2}>Ready to Build</Heading>
              <Text>Select date range and generate.</Text>
            </Flex>
          ) : viewMode === "calendar" ? (
            <CalendarGrid
              year={calendarViewDate.getFullYear()}
              month={calendarViewDate.getMonth() + 1}
              events={events}
              onDayClick={handleDayClick}
              selectedRegenDates={selectedRegenDates}
              onToggleRegenDate={handleToggleRegenDate}
              globalHardErrors={globalHardErrors}
              globalSoftWarnings={globalSoftWarnings}
            />
          ) : (
            <TimelineGrid
              rangeStart={startDate}
              rangeEnd={endDate}
              rows={timelineRows}
              items={timelineItems}
              showConflicts={false}
              onDayClick={handleDayClick}
              enableEmployeeModal={true}
              enableHighlight={true}
              onExpandView={() => setFullScreenTimelineOpen(true)}
            />
          )}
        </Box>

        {/* Apply generation overlay */}
        {isGenerating && (
          <Flex
            position="absolute"
            top={0} left={0} right={0} bottom={0}
            bg={overlayBg}
            backdropFilter="blur(4px)"
            zIndex={50}
            direction="column"
            justify="center"
            align="center"
            animation="fadeIn 0.2s ease-out"
          >
            <Box w="100%" maxW="400px" textAlign="center" p={6} bg={mainBg} borderRadius="xl" shadow="xl" border="1px solid" borderColor={borderColor}>
              <Heading size="md" color="blue.500" mb={2}>
                Generating Assignments...
              </Heading>

              <Progress.Root
                value={genProgress}
                size="md"
                colorPalette="blue"
                h="10px"
                w="100%"
                striped
                animated
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          </Flex>
        )}
      </Box>

      {/* Modal for editing shifts for a day */}
      <DayEditModal
        open={isModalOpen}
        onOpenChange={(details) => setIsModalOpen(details.open)}
        selectedDate={selectedDate}
        dayAssignments={dayAssignments}
        setDayAssignments={setDayAssignments}
        currentDraftData={currentDraftData}
        onCurrentDraftData={onCurrentDraftData}
        employees={employees}
        positions={positions}
        templates={templates}
        minDaysOff={minDaysOff}
        isSkeletonView={hasSkeleton && !isSavedDraft ? hasSkeleton : false}
        scheduleParams={scheduleParams}
      />

      {/* Full screen timeline view modal */}
      <FullScreenTimelineModal
        mainBg={mainBg}
        borderColor={borderColor}
        open={isFullScreenTimelineOpen}
        onOpenChange={(details) => setFullScreenTimelineOpen(details.open)}
        timelineItems={timelineItems}
        timelineRows={timelineRows}
        rangeStart={startDate}
        rangeEnd={endDate}
        onDayClick={handleDayClick}
      />
    </Flex>
  );
};

export default BuilderMainStage;