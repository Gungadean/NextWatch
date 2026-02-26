/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Tabs,
  Text
} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {
  type Assignment,
  type ScheduleDraft,
  type ScheduleResponse,
} from "@/features/schedule/scheduleApi.ts";
import {type CalendarEvent, CalendarGrid} from "@/components/CalendarGrid.tsx";
import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import type {EmployeeWithTimeOff, Position} from "@/features/personnel/personnelApi.ts";
import {useState} from "react";
import DayEditModal from "@/features/schedule/components/DayEditModal.tsx";

/**
 * BuilderMainStage.tsx
 *
 * Main stage for builder component.
 */

/**
 * Props for the Builder Main Stage.
 */
interface BuilderMainStageProps {
  mainBg: string;
  borderColor: string;

  employees: EmployeeWithTimeOff[];
  positions: Position[];
  minDaysOff: number;

  selectedDraftId: string | null;
  currentDraftData: ScheduleResponse | ScheduleDraft | null | undefined;
  startDate: string;
  endDate: string;

  viewMode: string;
  isLoadingDraft: boolean;

  builderEvents: CalendarEvent[];
  timelineRows: TimelineRow[];
  timelineItems: TimelineItem[];

  calendarViewDate: Date;
  navMonth: (dir: number) => void;
  setViewMode: (mode: string) => void;

  onDeleteDraft: () => void;
  onPublishDraft: () => void;
  onCurrentDraftData: (data: ScheduleResponse | ScheduleDraft | null | undefined) => void;
}

/**
 * Main stage component for schedule builder page.
 */
const BuilderMainStage = ({
  mainBg,
  borderColor,
  employees,
  positions,
  minDaysOff,
  selectedDraftId,
  currentDraftData,
  startDate,
  endDate,
  viewMode,
  isLoadingDraft,
  builderEvents,
  timelineRows,
  timelineItems,
  calendarViewDate,
  navMonth,
  setViewMode,
  onDeleteDraft,
  onPublishDraft,
  onCurrentDraftData
}: BuilderMainStageProps) => {

  const buttonBG = useColorModeValue("gray.100", "gray.700");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayAssignments, setDayAssignments] = useState<Assignment[]>([]);

  const [selectedRegenDates, setSelectedRegenDates] = useState<string[]>([]);

  const [prevDraftId, setPrevDraftId] = useState(selectedDraftId);

  // Check if the draft id has changed and reset the selected regen dates.
  if (selectedDraftId !== prevDraftId) {
    setPrevDraftId(selectedDraftId);
    setSelectedRegenDates([]);
  }

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

  return (
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
            {selectedRegenDates.length > 0 && (
              <Button size="sm" colorPalette="blue" variant="surface">
                Regenerate {selectedRegenDates.length} Days
              </Button>
            )}

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
          </HStack>
        </Flex>

        {/* Content Area */}
        <Box flex="1" overflow="auto" p={6}>
          {isLoadingDraft ? (
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
                events={builderEvents}
                onDayClick={handleDayClick}
                selectedRegenDates={selectedRegenDates}
                onToggleRegenDate={handleToggleRegenDate}
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
            />
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
            minDaysOff={minDaysOff}
        />
      </Flex>
  );
};

export default BuilderMainStage;