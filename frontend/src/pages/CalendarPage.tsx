/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarPage.tsx
 *
 * The primary view for the official schedule.
 * Displays the published roster in a standard monthly grid format.
 * Includes live edit capabilities for admins/managers to modify the live schedule.
 */

import {useEffect, useMemo, useState} from "react";
import {Box, Button, Flex, Heading, HStack, Tabs, Text, VStack} from "@chakra-ui/react";
import {
  type Assignment,
  getMonthlySchedule,
  updateOfficialDay,
  regenerateLiveDays,
  getShiftTemplates,
  validateScheduleDraft,
  type Shift,
  type ShiftTemplateRead,
  type ScheduleResponse,
  type ScheduleDraft,
  type ScheduleRequest
} from "@/features/schedule/scheduleApi.ts";
import {CalendarGrid} from "@/components/CalendarGrid.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import {type EmployeeWithTimeOff, getEmployeesWithTimeOff} from "@/features/personnel/personnelApi.ts";
import {useScheduleViewData} from "@/features/schedule/hooks/useScheduleViewData.ts";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {TimelineGrid} from "@/components/TimelineGrid.tsx";
import FullScreenTimelineModal from "@/components/FullScreenTimelineModal.tsx";
import DayEditModal from "@/features/schedule/components/DayEditModal.tsx";
import {toSimpleDate} from "@/utils/timeUtils.ts";
import {getPositionList, type PositionWithRequirementsRead} from "@/features/position/positionApi.ts";
import {useCurrentUser} from "@/hooks/useAuth.ts";
import ConfirmModal from "@/components/ConfirmModal.tsx";

/**
 * Main calendar layout for displaying schedule calendar.
 * Retrieves data from backend about schedule and displays on calendar for end user.
 */
const CalendarPage = () => {
  const user = useCurrentUser();
  const canEdit = user.role === 'admin' || user.role === 'manager';

  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<string>("calendar");
  const [isFullScreenOpen, setFullScreenOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [positions, setPositions] = useState<PositionWithRequirementsRead[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplateRead[]>([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRegenDates, setSelectedRegenDates] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [hardErrors, setHardErrors] = useState<string[]>([]);
  const [softWarnings, setSoftWarnings] = useState<string[]>([]);

  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedEditDate, setSelectedEditDate] = useState<string | null>(null);
  const [dayAssignments, setDayAssignments] = useState<Assignment[]>([]);

  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<ScheduleResponse | ScheduleDraft | null>(null);
  const [isConfirmRegenOpen, setIsConfirmRegenOpen] = useState(false);

  const [regenProgress, setRegenProgress] = useState(0);
  const [regenMessage, setRegenMessage] = useState("");

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
        const [scheduleData, employeeData, posData, tempData] = await Promise.all([
          getMonthlySchedule(selectedYear, selectedMonth),
          getEmployeesWithTimeOff(),
          getPositionList(),
          getShiftTemplates()
        ]);

        setEmployees(employeeData);
        setShifts(scheduleData);
        setPositions(posData);
        setTemplates(tempData);
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
   * Translates Shift models into Assignment models so the DayEditModal can read them.
   */
  const liveAssignments: Assignment[] = useMemo(() => {
    return shifts.map(s => {
      const datePart = s.shift_date.includes('T') ? s.shift_date.split('T')[0] : s.shift_date;
      const startPart = s.start_time?.includes('T') ? s.start_time.split('T')[1].substring(0,8) : s.start_time;
      const endPart = s.end_time?.includes('T') ? s.end_time.split('T')[1].substring(0,8) : s.end_time;

      const posId = s.position_id ?? s.position?.id ?? 0;
      const empId = s.employee?.id ?? s.employee_id ?? 0;

      return {
        date: datePart,
        start_time: startPart,
        end_time: endPart,
        watchstander: {
            id: empId,
            name: `${s.employee?.last_name || "Unknown"}, ${s.employee?.first_name || "Name"}`,
            watchstations: [],
            offset: 0
        },
        watchstation: {
            id: posId,
            name: s.position?.name || "Unknown Role",
            color: s.position?.color || "blue"
        }
      };
    });
  }, [shifts]);

  /**
   * Mock draft data to pass to the DayEditModal
   */
  const fakeDraftData: ScheduleResponse = useMemo(() => ({
    score_history: [],
    assignments: liveAssignments
  }), [liveAssignments]);

  /**
   * Mock schedule parameters to satisfy the backend validation endpoint.
   */
  const mockScheduleParams: ScheduleRequest = useMemo(() => ({
    start_date: startDate,
    end_date: endDate,
    position_ids: positions.map(p => p.id),
    ignore_pending_timeoff: false,
    min_days_off: 1,
    max_days_off: 7,
    max_steps: 10000
  }), [startDate, endDate, positions]);

  /**
   * Runs validation against the month when edit mode is active
   * to display error icons on the Calendar Grid.
   */
useEffect(() => {
    if (!isEditMode || employees.length === 0 || liveAssignments.length === 0) {
      setHardErrors([]);
      setSoftWarnings([]);
      return;
    }

    const runGlobalValidation = async () => {
      try {
        // Inject employee watchstation qualifications for validation
        const payloadAssignments = liveAssignments.map(shift => {
          if (shift.watchstander.id === 0) return shift;
          const emp = employees.find(e => e.id === shift.watchstander.id);
          return {
            ...shift,
            watchstander: {
              ...shift.watchstander,
              watchstations: emp ? emp.positions.map(p => p.id) : [],
              offset: 0
            }
          };
        });

        const result = await validateScheduleDraft({
          params: mockScheduleParams,
          assignments: payloadAssignments,
          target_person_names: [],
          is_global_audit: true
        });

        setHardErrors(result.hard_error || []);
        setSoftWarnings(result.soft_warnings || []);
      } catch (error) {
        console.error("Failed to run validation..", error);
      }
    };

    // Use a 300ms debounce to prevent backend spam
    const debounceTimer = setTimeout(runGlobalValidation, 300);
    return () => clearTimeout(debounceTimer);
  }, [isEditMode, liveAssignments, employees, mockScheduleParams]);

  /**
   * Handles navigation between months.
   */
  const updateSelectedMonth = (change: number) => {
    const newDate = new Date(currentViewDate)
    newDate.setMonth(newDate.getMonth() + change)
    setCurrentViewDate(newDate)
  }

  /**
   * Toggles a date in the regeneration selection list
   */
  const handleToggleRegenDate = (dateStr: string) => {
    setSelectedRegenDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  /**
   * Opens the DayEditModal when a cell is clicked in Edit Mode
   */
  const handleDayClick = (dateStr: string) => {
    if (!isEditMode) return;
    setSelectedEditDate(dateStr);
    setDayAssignments(liveAssignments.filter(a => a.date === dateStr));
    setIsDayModalOpen(true);
  };

  /**
   * Intercepts the save from DayEditModal to ask for confirmation
   */
  const handleInitiateSave = (updatedDraft: ScheduleResponse | ScheduleDraft | null | undefined) => {
    if (!updatedDraft) return;
    setPendingSaveData(updatedDraft);
    setIsConfirmSaveOpen(true);
  };

  /**
   * Executes the actual save to the live database
   */
  const executeLiveSave = async () => {
    if (!selectedEditDate || !pendingSaveData) return;
    setIsProcessing(true);
    try {
      const newDayShifts = pendingSaveData.assignments.filter((a: Assignment) => a.date === selectedEditDate);
      await updateOfficialDay(selectedEditDate, newDayShifts);

      const scheduleData = await getMonthlySchedule(selectedYear, selectedMonth);
      setShifts(scheduleData);

      toaster.create({ title: "Live Schedule Updated", type: "success" });
      setIsConfirmSaveOpen(false);
      setIsDayModalOpen(false);
    } catch (error: unknown) {
      toaster.create({
        title: "Update Failed",
        description: getErrorMessage(error, "Failed to update live schedule."),
        type: "error"
      });
    } finally {
      setIsProcessing(false);
      setPendingSaveData(null);
    }
  };

/**
 * Executes the regeneration of selected days.
 */
const executeRegeneration = async () => {
    setIsProcessing(true);
    setRegenProgress(0);
    setRegenMessage("Initializing regeneration...");

    try {
      await regenerateLiveDays(
        selectedRegenDates,
        // onProgress Callback
        (progressData) => {
          setRegenProgress(progressData.percent || 0);
          setRegenMessage("Evaluating possible schedules...");
        },
        // onComplete Callback
        async () => {
          // Fetch fresh schedule after successful regeneration
          const scheduleData = await getMonthlySchedule(selectedYear, selectedMonth);
          setShifts(scheduleData);

          toaster.create({ title: "Days Regenerated", description: "The live schedule has been updated with new shifts.", type: "success" });
          setSelectedRegenDates([]);
          setIsConfirmRegenOpen(false);
          setIsProcessing(false); // Clear processing ONLY when the fetch is done
        },
        // onError Callback
        (err) => {
          toaster.create({
            title: "Regeneration Failed",
            description: err.message,
            type: "error"
          });
          setIsProcessing(false); // Clear processing on error
        }
      );
    } catch (error: unknown) {
      // This catches synchronous errors like network failures before the stream connects
      toaster.create({
        title: "Regeneration Failed",
        description: getErrorMessage(error, "Failed to connect to generation server."),
        type: "error"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Box p="0" pb={0} h="calc(100vh - 64px)" display="flex" flexDirection="column">

      {/* Header Controls */}
      <Flex justify="space-between" align="center" paddingBottom="4">

        {/* Left: View Switcher */}
        <Box flex="1">
          <Tabs.Root value={viewMode} onValueChange={(e) => setViewMode(e.value)} variant="plain">
            <Tabs.List bg={buttonBG} p={1} borderRadius="md" w="fit-content">
              <Tabs.Trigger value="calendar" px={4} py={1} _selected={{ bg: "white", color: "blue.600", shadow: "sm" }} borderRadius="sm">
                Calendar
              </Tabs.Trigger>
              <Tabs.Trigger value="timeline" px={4} py={1} _selected={{ bg: "white", color: "blue.600", shadow: "sm" }} borderRadius="sm">
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

        {/* Right: Action Buttons */}
        <Box flex="1" display="flex" justifyContent="flex-end" gap={2}>
          {isEditMode && selectedRegenDates.length > 0 && (
            <Button
              size="sm"
              colorPalette="blue"
              onClick={() => setIsConfirmRegenOpen(true)}
            >
              Regenerate ({selectedRegenDates.length})
            </Button>
          )}

          {/* Edit Button */}
          {canEdit && (
            <Button
              size="sm"
              variant={isEditMode ? "solid" : "surface"}
              colorPalette={isEditMode ? "orange" : "gray"}
              onClick={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedRegenDates([]); // Clear selection when exiting
              }}
            >
              {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
            </Button>
          )}
        </Box>
      </Flex>

      {/* The Reusable Grid Component */}
      <Box
        borderRadius="md"
        flex="1"
        position="relative"
        overflow="hidden"
        border={isEditMode ? "2px solid" : "1px solid"}
        borderColor={isEditMode ? "orange.400" : borderColor}
        bg={mainBg}
        transition="border-color 0.2s"
      >
        <Box w="100%" h="100%" overflowY="auto" overflowX="hidden">
          {viewMode === "calendar" ? (
            <CalendarGrid
              year={selectedYear}
              month={selectedMonth}
              events={events}
              timelineRows={timelineRows}
              timelineItems={timelineItems}
              isSkeletonView={isEditMode}
              onDayClick={handleDayClick}
              selectedRegenDates={selectedRegenDates}
              onToggleRegenDate={isEditMode ? handleToggleRegenDate : undefined}
              globalHardErrors={hardErrors}
              globalSoftWarnings={softWarnings}
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
              onDayClick={handleDayClick}
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

      {/* Manual Day Edit Modal */}
      {canEdit && selectedEditDate && (
        <DayEditModal
          open={isDayModalOpen}
          onOpenChange={(e) => setIsDayModalOpen(e.open)}
          selectedDate={selectedEditDate}
          dayAssignments={dayAssignments}
          setDayAssignments={setDayAssignments}
          currentDraftData={fakeDraftData}
          onCurrentDraftData={handleInitiateSave}
          employees={employees}
          positions={positions}
          templates={templates}
          minDaysOff={1}
          isSkeletonView={false}
          scheduleParams={mockScheduleParams}
        />
      )}

      {/* Manual Save Confirmation */}
      <ConfirmModal
        isOpen={isConfirmSaveOpen}
        onOpenChange={(e) => setIsConfirmSaveOpen(e.open)}
        title="Confirm Live Edit"
        confirmText="Confirm Edit"
        confirmColorPalette="orange"
        onConfirm={executeLiveSave}
        isProcessing={isProcessing}
      >
        <VStack align="flex-start" gap={3}>
          <Text>
            You are about to modify the <strong>official live schedule</strong> for {selectedEditDate}.
          </Text>
          <Text color="orange.500" fontSize="sm" fontWeight="bold">
            These changes will immediately apply to the database and be visible to all personnel. Are you sure?
          </Text>
        </VStack>
      </ConfirmModal>

      {/* Regeneration Confirmation */}
      <ConfirmModal
        isOpen={isConfirmRegenOpen}
        onOpenChange={(e) => setIsConfirmRegenOpen(e.open)}
        title="Regenerate Selected Days"
        confirmText="Regenerate Live Schedule"
        confirmColorPalette="red"
        onConfirm={executeRegeneration}
        isProcessing={isProcessing}
      >
        <VStack align="flex-start" gap={3} w="100%">
          <Text>
            You are about to regenerate the schedule for <strong>{selectedRegenDates.length} day(s)</strong>.
          </Text>
          <Text color="red.500" fontSize="sm" fontWeight="bold">
            This will overwrite any existing shifts on these days in the live database. Are you sure you want to proceed?
          </Text>

          {/* Regeneration Progress Bar */}
          {isProcessing && (
            <Box w="100%" mt={4} animation="fadeIn 0.3s ease-in-out">
              <Flex justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="bold">{regenMessage}</Text>
                <Text fontSize="xs" color="gray.500" fontWeight="bold">{regenProgress}%</Text>
              </Flex>
              <Box w="100%" bg="gray.100" _dark={{ bg: "gray.700" }} h="2" borderRadius="full" overflow="hidden">
                <Box
                  bg="blue.500"
                  h="100%"
                  w={`${regenProgress}%`}
                  transition="width 0.2s linear"
                />
              </Box>
            </Box>
          )}
        </VStack>
      </ConfirmModal>
    </Box>
  );
};

export default CalendarPage;