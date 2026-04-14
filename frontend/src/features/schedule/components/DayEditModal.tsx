/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * DayEditModal.tsx
 *
 * Modal for modifying a specific calendar day of a draft.
 */

import {Button, Text, Box, Flex, VStack, Spinner} from "@chakra-ui/react";
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelectField, NativeSelectRoot } from "@/components/ui/native-select";

import {
  type ScheduleResponse,
  type ScheduleDraft,
  type Assignment,
  type ShiftTemplateRead,
  validateScheduleDraft,
  type ScheduleRequest
} from "@/features/schedule/scheduleApi";
import type { EmployeeWithTimeOff } from "@/features/personnel/personnelApi";
import {useEffect, useMemo, useState} from "react";
import {toSimpleDate} from "@/utils/timeUtils.ts";
import {toaster} from "@/components/ui/toaster.tsx";
import {LuShuffle} from "react-icons/lu";
import type { PositionWithRequirementsRead } from "@/features/position/positionApi";

/**
 * Props for the DayEditModal component.
 */
export interface DayEditModalProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selectedDate: string | null;
  dayAssignments: Assignment[];
  setDayAssignments: (assignments: Assignment[]) => void;
  currentDraftData: ScheduleResponse | ScheduleDraft | null | undefined;
  onCurrentDraftData: (data: ScheduleResponse | ScheduleDraft | null | undefined) => void;
  employees: EmployeeWithTimeOff[];
  positions: PositionWithRequirementsRead[];
  templates: ShiftTemplateRead[];
  minDaysOff: number;
  isSkeletonView: boolean;
  scheduleParams: ScheduleRequest;
}

/**
 * Modal that allows adding, deleting, and modifying shifts and their assigned employee for
 * the chosen day.
 */
export default function DayEditModal({
  open,
  onOpenChange,
  selectedDate,
  dayAssignments,
  setDayAssignments,
  currentDraftData,
  onCurrentDraftData,
  employees,
  positions,
  templates,
  minDaysOff,
  isSkeletonView = false,
  scheduleParams
}: DayEditModalProps) {

  const [isValid, setIsValid] = useState<boolean>(true);
  const [hardErrors, setHardErrors] = useState<string[]>([]);
  const [softWarnings, setSoftWarnings] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  /**
   * Get list of all people being displayed in this edit modal
   */
  const relevantPeopleNames = useMemo(() => {
    const names = new Set<string>();

    // Add everyone currently visible in the modal
    dayAssignments.forEach(a => names.add(a.watchstander.name));

    // Add everyone who was assigned to this day in the original saved draft
    if (currentDraftData && selectedDate) {
      currentDraftData.assignments
        .filter(a => a.date === selectedDate)
        .forEach(a => names.add(a.watchstander.name));
    }

    return Array.from(names);
  }, [dayAssignments, currentDraftData, selectedDate]);

  /**
   * useEffect for evaluating warnings/errors for the schedule.
   */
  useEffect(() => {
    setIsValid(true);
    setHardErrors([]);
    setSoftWarnings([]);

    // Do not validate if the modal is closed, if it's just a skeleton, or if data is missing
    if (!open || !currentDraftData || !selectedDate || isSkeletonView) {
      setIsEvaluating(false);
      return;
    }

    setIsEvaluating(true);

    const validationTimer = setTimeout(async () => {
      try {
        // Construct the full proposed schedule (the untouched days + the newly edited day)
        const otherDays = currentDraftData.assignments.filter(a => a.date !== selectedDate);
        const fullProposedSchedule = [...otherDays, ...dayAssignments];

        const payloadAssignments = fullProposedSchedule.map(shift => {
          // Handle unassigned skeleton shifts
          if (shift.watchstander.id === 0) {
            return {
              ...shift,
              watchstander: { ...shift.watchstander, watchstations: [], offset: 0 }
            };
          }

          // Ensure existing shifts have watchstations and offset
          const emp = employees.find(e => e.id === shift.watchstander.id);
          return {
            ...shift,
            watchstander: {
              ...shift.watchstander,
              watchstations: shift.watchstander.watchstations || (emp ? emp.positions.map(p => p.id) : []),
              offset: shift.watchstander.offset ?? 0
            }
          };
        });

        // Send to backend to grade the schedule
        const result = await validateScheduleDraft({
          params: scheduleParams,
          assignments: payloadAssignments,
          target_date: selectedDate!,
          target_person_names: relevantPeopleNames,
          is_global_audit: false
        });

        setIsValid(result.is_valid);
        setHardErrors(result.hard_error);
        setSoftWarnings(result.soft_warnings);
      } catch (error) {
        console.error("Failed to validate schedule:", error);
        // Fail-safe
        setIsValid(false);
        setHardErrors(["Lost connection to validation server."]);
      } finally {
        setIsEvaluating(false);
      }
    }, 100); // 200ms debounce delay

    // Cleanup function cancels the timer if the user makes another change before 400ms is up
    return () => clearTimeout(validationTimer);
  }, [dayAssignments, open, currentDraftData, selectedDate, isSkeletonView, scheduleParams, relevantPeopleNames, employees]);

  /**
   * Handle replacing an employee for the specified shift
   */
  const handleEmployeeChange = (index: number, employeeId: string) => {
    const emp = employees.find(e => e.id.toString() === employeeId);
    if (!emp) return;

    const updated = [...dayAssignments];
    updated[index].watchstander = {
      id: emp.id,
      name: `${emp.last_name}, ${emp.first_name}`,
      watchstations: emp.positions.map(p => p.id),
      offset: 0
    };
    setDayAssignments(updated);
  };

  /**
   * Handle replacing the position for a specified employee
   */
  const handlePositionChange = (index: number, positionId: string) => {
    const pos = positions.find(p => p.id.toString() === positionId);
    if (!pos) return;

    const updated = [...dayAssignments];
    updated[index].watchstation = {
      id: pos.id,
      name: pos.name,
      color: pos.color
    };
    setDayAssignments(updated);
  };

  /**
   * Handle changing the template for the specified shift
   */
  const handleTemplateChange = (index: number, templateId: string, positionId: string) => {
    const pos = positions.find(p => p.id.toString() === positionId);
    const tem = templates.find(t => t.id.toString() === templateId);

    if (!pos || !tem) return;

    const updated = [...dayAssignments];
    updated[index].watchstation = {id: pos.id, name: `${pos.name} (${tem.name})`, color: pos.color};
    updated[index].start_time = tem.start_time;
    updated[index].end_time = tem.end_time;
    setDayAssignments(updated);
  };

  if (!selectedDate || !currentDraftData) return null;

  /**
   * Handle adding a new shift to the day
   */
  const handleAddShift = () => {
    if (positions.length === 0 || employees.length === 0) return;

    // Default to the first qualified person for the new shift.
    let qualifiedIndex: number = 0;
    for (let i = 0; i < employees.length; i++) {
      if (employees[i].positions.includes(positions[0])) {
        qualifiedIndex = i;
        break;
      }
    }

    const defaultEmp = employees[qualifiedIndex];
    const defaultTemplate = templates.length > 0 ? templates[0] : null;

    const newShift: Assignment = {
      date: selectedDate,
      start_time: defaultTemplate?.start_time,
      end_time: defaultTemplate?.end_time,
      watchstation: { id: positions[0].id, name: positions[0].name, color: positions[0].color },
      watchstander: {
        id: defaultEmp.id,
        name: `${defaultEmp.last_name}, ${defaultEmp.first_name}`,
        watchstations: defaultEmp.positions.map(p => p.id),
        offset: 0
      }
    };

    setDayAssignments([...dayAssignments, newShift]);
  };

  /**
   * Handle adding a shift for the skeleton. (This will not display assignments
   * but instead creates an unassigned shift)
   */
  const handleAddTemplateShift = () => {
    if (positions.length === 0 || templates.length === 0) return;

    const firstTemplate = templates[0];
    const firstPosition = positions[0];

    const newShift: Assignment = {
      date: selectedDate,
      start_time: firstTemplate.start_time,
      end_time: firstTemplate.end_time,
      watchstander: {
        id: 0,
        name: "Unassigned",
        offset: 0,
        watchstations: []
      },
      watchstation: {
        id: firstPosition.id,
        name: `${firstPosition.name} (${firstTemplate.name})`,
        color: firstPosition.color
      }
    }

    setDayAssignments([...dayAssignments, newShift]);
  }

  /**
   * Handle automatically finding the fairest, valid employee for a shift
   */
  const handleAutoAssign = (index: number, positionId: number) => {
    if (!currentDraftData) return;

    // Get all employees qualified for this role
    let validCandidates = employees.filter(emp =>
      emp.positions.map(p => p.id).includes(positionId)
    );

    // Filter out constraints (Double Booking, Leave, Min Days Off)
    validCandidates = validCandidates.filter(emp => {
      // Check if they're already working today
      const workingToday = dayAssignments.some(shift => shift.watchstander.id === emp.id);
      if (workingToday) return false;

      // Check if they have a time off request
      const onLeave = emp.time_off_requests?.some(req =>
        req.status !== "Denied" && req.start_date <= selectedDate! && req.end_date >= selectedDate!
      );

      if (onLeave) return false;

      // Check to see if the minDaysOff constraint isn't violated.
      const parts = selectedDate!.split("-").map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const forbiddenDates: string[] = [];

      for (let i = 1; i <= minDaysOff; i++) {
        const past = new Date(dateObj); past.setDate(past.getDate() - i);
        const future = new Date(dateObj); future.setDate(future.getDate() + i);
        forbiddenDates.push(toSimpleDate(past), toSimpleDate(future));
      }

      const workingInWindow = currentDraftData.assignments.some(
        a => a.watchstander.id === emp.id && forbiddenDates.includes(a.date)
      );

      return !workingInWindow;
    });

    if (validCandidates.length === 0) {
      toaster.create({
          title: "No valid candidates found",
          description: "No employees can be found that would not violate the schedule constraints.",
          type: "error"
        });
      return;
    }

    // Check the fairness of adding this person against all shifts
    const shiftCounts: Record<number, number> = {};
    validCandidates.forEach(emp => shiftCounts[emp.id] = 0);

    currentDraftData.assignments.forEach(shift => {
      if (shiftCounts[shift.watchstander.id] !== undefined) {
        shiftCounts[shift.watchstander.id]++;
      }
    });

    // Sort by the candidate with the lowest fairness score (lower is better)
    validCandidates.sort((a, b) => shiftCounts[a.id] - shiftCounts[b.id]);

    const winner = validCandidates[0];

    // Add them to the schedule
    const updated = [...dayAssignments];
    updated[index].watchstander = {
      id: winner.id,
      name: `${winner.last_name}, ${winner.first_name}`,
      watchstations: winner.positions.map(p => p.id),
      offset: 0
    };
    setDayAssignments(updated);
  };

  /**
   * Handle removing a shift from the specified day.
   */
  const handleRemoveShift = (index: number) => {
    const updated = dayAssignments.filter((_, i) => i !== index);
    setDayAssignments(updated);
  };

  /**
   * Apply changes and update the current draft data.
   */
  const handleSave = () => {
    const otherDays = currentDraftData.assignments.filter(a => a.date !== selectedDate);

    onCurrentDraftData({
      ...currentDraftData,
      assignments: [...otherDays, ...dayAssignments]
    });

    onOpenChange({ open: false });
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange} placement="center" size="xl">
      <DialogBackdrop />
      <DialogContent>
        <DialogCloseTrigger />

        <DialogHeader borderBottomWidth="1px">
          <DialogTitle>Manage Shifts: {selectedDate}</DialogTitle>
        </DialogHeader>

        <DialogBody pt={4} pb={6}>
          <VStack gap={4} align="stretch">
            {dayAssignments.length === 0 && (
              <Text color="gray.500" textAlign="center" py={4}>
                No shifts scheduled for this day.
              </Text>
            )}

            {!isSkeletonView && (
              <Box>
                {/* Hard Errors (Red) */}
                {!isValid && hardErrors.length > 0 && (
                  <Box p={3} bg="red.100" color="red.800" _dark={{ bg: "red.900", color: "red.200" }} borderRadius="md" border="1px solid" borderColor="red.300" mb={3}>
                    <Text fontWeight="bold" mb={1}>Invalid Schedule Action:</Text>
                    <VStack align="start" gap={0}>
                      {hardErrors.map((err, i) => (
                        <Text key={i} fontSize="sm">• {err}</Text>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* Soft Warnings (Yellow) */}
                {isValid && softWarnings.length > 0 && (
                  <Box p={3} bg="yellow.100" color="yellow.800" _dark={{ bg: "yellow.900", color: "yellow.200" }} borderRadius="md" border="1px solid" borderColor="yellow.300" mb={3}>
                    <Text fontWeight="bold" mb={1}>Sub-Optimal Changes:</Text>
                    <VStack align="start" gap={0}>
                      {softWarnings.map((warn, i) => (
                        <Text key={i} fontSize="sm">• {warn}</Text>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* No Errors (Green) */}
                {isValid && softWarnings.length === 0 && !isEvaluating && dayAssignments.length > 0 && (
                  <Box p={2} bg="green.50" color="green.700" _dark={{ bg: "green.900", color: "green.200" }} borderRadius="md" border="1px solid" borderColor="green.300" mb={3}>
                    <Text fontSize="sm" fontWeight="medium">No errors found.</Text>
                  </Box>
                )}
              </Box>
            )}

            {dayAssignments.map((shift, index) => (
              <Box key={index} p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="gray.50" _dark={{ bg: "gray.800", borderColor: "gray.700" }}>
                <Flex gap={4} align="flex-end">
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="bold" mb={1}>Role</Text>
                    <NativeSelectRoot bg="white" _dark={{ bg: "gray.900" }}>
                      <NativeSelectField
                        value={shift.watchstation.id.toString()}
                        onChange={(e) => handlePositionChange(index, e.currentTarget.value)}
                      >
                        {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Box>

                  <Box flex="2">
                    <Text fontSize="sm" fontWeight="bold" mb={1}>Template</Text>
                    <NativeSelectRoot bg="white" _dark={{ bg: "gray.900" }}>
                      <NativeSelectField
                        value={templates.find(t => t.start_time === shift.start_time && t.end_time === shift.end_time)?.id.toString() || ""}
                        onChange={(e) => handleTemplateChange(index, e.currentTarget.value, shift.watchstation.id.toString())}
                      >
                        <option value="" disabled>Select a template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.start_time}-{t.end_time})</option>)
                        )}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Box>

                  {!isSkeletonView && (
                    <>
                      <Box flex="2">
                        <Text fontSize="sm" fontWeight="bold" mb={1}>Assignee</Text>
                        <NativeSelectRoot bg="white" _dark={{ bg: "gray.900" }}>
                          <NativeSelectField
                            value={shift.watchstander.id.toString()}
                            onChange={(e) => handleEmployeeChange(index, e.currentTarget.value)}
                          >
                            {employees.filter(emp => emp.positions.map(p => p.id).includes(shift.watchstation.id)).map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.last_name}, {emp.first_name}</option>)
                            )}
                          </NativeSelectField>
                        </NativeSelectRoot>
                      </Box>

                      <Button
                      colorPalette="purple"
                      variant="surface"
                      onClick={() => handleAutoAssign(index, shift.watchstation.id)}
                      title="Auto-assign fairest available member"
                      >
                        <LuShuffle />
                      </Button>
                    </>
                  )}

                  <Button colorPalette="red" variant="outline" onClick={() => handleRemoveShift(index)}>
                    Remove
                  </Button>
                </Flex>
              </Box>
            ))}

            <Button colorPalette="green" variant="surface" mt={2} onClick={isSkeletonView ? handleAddTemplateShift : handleAddShift}>
              + Add Additional Shift
            </Button>
          </VStack>
        </DialogBody>

        <DialogFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={() => onOpenChange({ open: false })}>Cancel</Button>

          {/* Save Button */}
          <Button
            colorPalette="blue"
            onClick={handleSave}
            disabled={isEvaluating}
            opacity={(!isValid || isEvaluating) ? 0.6 : 1}
          >
            {isEvaluating ? <><Spinner size="sm" mr={2} /> Evaluating...</> : "Save Day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}