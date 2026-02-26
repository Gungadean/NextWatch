/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * DayEditModal.tsx
 *
 * Modal for modifying a specific calendar day of a draft.
 */

import { Button, Text, Box, Flex, VStack } from "@chakra-ui/react";
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

import type { ScheduleResponse, ScheduleDraft, Assignment } from "@/features/schedule/scheduleApi";
import type { EmployeeWithTimeOff, Position } from "@/features/personnel/personnelApi";
import {useMemo} from "react";
import {toSimpleDate} from "@/utils/timeUtils.ts";

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
  positions: Position[];
  minDaysOff: number;
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
  minDaysOff
}: DayEditModalProps) {

  const warnings = useMemo(() => {
    const newWarnings: string[] = [];

    if (!selectedDate || !currentDraftData) return newWarnings;

    const parts = selectedDate.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    // Create a list of dates that the employee is already working or is within min days off.
    const forbiddenDates: string[] = [];
    for (let i = 1; i <= minDaysOff; i++) {
      const pastDate = new Date(dateObj);
      pastDate.setDate(pastDate.getDate() - i);
      forbiddenDates.push(toSimpleDate(pastDate));

      const futureDate = new Date(dateObj);
      futureDate.setDate(futureDate.getDate() + i);
      forbiddenDates.push(toSimpleDate(futureDate));
    }

    // Grab ALL shifts in the global schedule that fall on those forbidden dates
    const windowShifts = currentDraftData.assignments.filter(a => forbiddenDates.includes(a.date));

    // Track how many times each employee is working TODAY (for double booking)
    const employeeCounts: Record<string, number> = {};
    dayAssignments.forEach(shift => {
      const empId = shift.watchstander.id.toString();
      employeeCounts[empId] = (employeeCounts[empId] || 0) + 1;
    });

    // Check every currently selected shift for rules
    dayAssignments.forEach(shift => {
      const empName = shift.watchstander.name;
      const empId = shift.watchstander.id;
      const employee = employees.find(e => e.id === empId);

      // Check to make sure they aren't already scheduled for this day.
      if (employeeCounts[empId.toString()] > 1) {
        const msg = `${empName} is assigned to multiple watchstations today.`;
        if (!newWarnings.includes(msg)) newWarnings.push(msg);
      }

      // Make sure that the employee isn't scheduled for leave for this date.
      if (employee && employee.time_off_requests) {
        const hasTimeOff = employee.time_off_requests.some(req =>
          req.status !== "Denied" && req.start_date <= selectedDate && req.end_date >= selectedDate
        );
        if (hasTimeOff) {
          const msg = `${empName} has requested time off for this day.`;
          if (!newWarnings.includes(msg)) newWarnings.push(msg);
        }
      }

      // Check if they have any conflicting shifts in the time period
      const conflictingShifts = windowShifts.filter(a => a.watchstander.id === empId);

      if (conflictingShifts.length > 0) {
        const datesWorking = Array.from(new Set(conflictingShifts.map(s => s.date))).sort().join(", ");
        const msg = `${empName} violates the ${minDaysOff} Min Days Off constraint. They are also scheduled on: ${datesWorking}.`;
        if (!newWarnings.includes(msg)) newWarnings.push(msg);
      }
    });

      return newWarnings;
  }, [dayAssignments, selectedDate, currentDraftData, employees, minDaysOff]);

  // Handle replacing an employee for the specified shift
  const handleEmployeeChange = (index: number, employeeId: string) => {
    const emp = employees.find(e => e.id.toString() === employeeId);
    if (!emp) return;

    const updated = [...dayAssignments];
    updated[index].watchstander = { id: emp.id, name: `${emp.last_name}, ${emp.first_name}` };
    setDayAssignments(updated);
  };

  // Handle replacing the position for a specified employee
  const handlePositionChange = (index: number, positionId: string) => {
    const pos = positions.find(p => p.id.toString() === positionId);
    if (!pos) return;

    const updated = [...dayAssignments];
    updated[index].watchstation = { id: pos.id, name: pos.name, color: pos.color };
    setDayAssignments(updated);
  };

  if (!selectedDate || !currentDraftData) return null;

  // Handle adding a new shift to the day.
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

    const newShift: Assignment = {
      date: selectedDate,
      watchstation: { id: positions[0].id, name: positions[0].name, color: positions[0].color },
      watchstander: { id: employees[qualifiedIndex].id, name: `${employees[qualifiedIndex].last_name}, ${employees[qualifiedIndex].first_name}` }
    };

    setDayAssignments([...dayAssignments, newShift]);
  };

  // Handle removing a shift from the specified day.
  const handleRemoveShift = (index: number) => {
    const updated = dayAssignments.filter((_, i) => i !== index);
    setDayAssignments(updated);
  };

  // Apply changes and update the current draft data.
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

            {warnings.length > 0 && (
              <Box
                p={3}
                bg="yellow.100"
                color="yellow.800"
                _dark={{ bg: "yellow.900", color: "yellow.200" }}
                borderRadius="md"
                border="1px solid"
                borderColor="yellow.300"
              >
                <Text fontWeight="bold" mb={1}>Schedule Constraint Warnings:</Text>
                <VStack align="start" gap={0}>
                  {warnings.map((warn, i) => (
                    <Text key={i} fontSize="sm">• {warn}</Text>
                  ))}
                </VStack>
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
                    <Text fontSize="sm" fontWeight="bold" mb={1}>Assignee</Text>
                    <NativeSelectRoot bg="white" _dark={{ bg: "gray.900" }}>
                      <NativeSelectField
                        value={shift.watchstander.id.toString()}
                        onChange={(e) => handleEmployeeChange(index, e.currentTarget.value)}
                      >
                        {/* Ensure that only people qualified for this shift will show up. */}
                        {employees.filter(emp => emp.positions.map(p => p.id).includes(shift.watchstation.id)).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.last_name}, {emp.first_name}</option>)
                        )}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Box>

                  <Button colorPalette="red" variant="outline" onClick={() => handleRemoveShift(index)}>
                    Remove
                  </Button>
                </Flex>
              </Box>
            ))}

            <Button colorPalette="green" variant="surface" mt={2} onClick={handleAddShift}>
              + Add Additional Shift
            </Button>
          </VStack>
        </DialogBody>

        <DialogFooter borderTopWidth="1px">
          <Button variant="outline" mr={3} onClick={() => onOpenChange({ open: false })}>Cancel</Button>
          <Button colorPalette="blue" onClick={handleSave}>Save Day</Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}