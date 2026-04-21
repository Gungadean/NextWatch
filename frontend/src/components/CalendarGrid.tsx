/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarGrid.tsx
 *
 * Renders a calendar month layout for displaying events.
 */

import {Box, Grid, Text, Flex, Stack, VStack, Icon} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {parseISODate, toSimpleDate} from "@/utils/timeUtils.ts";
import type {Assignment} from "@/features/schedule/scheduleApi.ts";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {memo} from "react";
import React from "react";
import { LuCircleAlert, LuTriangleAlert } from "react-icons/lu";
import {Tooltip} from "@/components/ui/tooltip.tsx";

/**
 * Represents a single item to be displayed on the calendar.
 */
export interface CalendarEvent {
  id: string | number;
  date: string;
  label: string;
  text: string;
  initials?: string;
  color?: string;
  startTime?: string;
  endTime?: string;
  rawAssignment?: Assignment;
}

/**
 * Props for the CalendarGrid component.
 */
interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: CalendarEvent[];

  onDayClick?: (dateStr: string) => void;
  selectedRegenDates?: string[];
  onToggleRegenDate?: (dateStr: string) => void;

  globalHardErrors?: string[];
  globalSoftWarnings?: string[];
}

/**
 * A responsive CSS Grid-based Calendar component.
 *
 * Renders a standard 7-column month view, automatically handling
 * padding days for the start of the month.
 */
export const CalendarGrid = memo(({
   year,
   month,
   events,
   onDayClick,
   selectedRegenDates = [],
   onToggleRegenDate,
   globalHardErrors = [],
   globalSoftWarnings = []
}: CalendarGridProps) => {

  // Dynamic colors for light/dark mode
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cellBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const emptyBg = useColorModeValue("gray.50", "gray.900");
  const tooltipBg = useColorModeValue("white", "gray.800");
  const tooltipBorder = useColorModeValue("gray.200", "gray.700");
  const hardErrorText = useColorModeValue("red.600", "red.300");
  const softWarningText = useColorModeValue("yellow.600", "yellow.300");

  // Calculate the number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate the first day of the month
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Group Events by Day (1-31) and sort them by start time
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach((evt) => {
    const d = parseISODate(evt.date);
    if (d.year === year && d.month === month) {
      if (!eventsByDay[d.day]) eventsByDay[d.day] = [];
      eventsByDay[d.day].push(evt);
    }
  });

  // Sort events based on their start time
  Object.keys(eventsByDay).forEach((day) => {
    eventsByDay[Number(day)].sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
  });

  const totalCells = firstDayOfMonth + daysInMonth;
  const trailingPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  // Create grid cells with different formatting for their types
  const gridCells = [
    ...Array.from({ length: firstDayOfMonth }, (_, i) => {
      const d = new Date(year, month - 1, 1 - (firstDayOfMonth - i));
      return { type: "padding" as const, dayNumber: null, dateStr: toSimpleDate(d) };
    }),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { type: "day" as const, dayNumber: day, dateStr: `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}` };
    }),
    ...Array.from({ length: trailingPadding }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return { type: "padding" as const, dayNumber: null, dateStr: toSimpleDate(d) };
    })
  ];

  /**
   * Handle logic for clicking on cells
   */
  const handleCellClick = (e: React.MouseEvent, dateStr?: string) => {
    // Toggle status in regen list if ctrl is being held down
    if (e.ctrlKey && dateStr && onToggleRegenDate) {
      onToggleRegenDate(dateStr);
      return;
    }

    // If the day exists, open the day editor.
    if (onDayClick && dateStr) {
      onDayClick(dateStr);
    }
  };

  /**
   *
   * @param dateStr
   */
  const getPythonDateString = (dateStr: string) => {
    // Assuming dateStr is "YYYY-MM-DD"
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const month = monthNames[d.getMonth()];
    const day = d.getDate().toString().padStart(2, '0');
    return `${month} ${day}`;
  };

  return (
    <Grid
      templateColumns="repeat(7, 1fr)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={cellBg}
      overflow="hidden"
    >
      {/* Weekday Headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <Box
          key={d}
          p={2}
          borderBottom="1px solid"
          borderColor={borderColor}
          bg={headerBg}
          fontWeight="bold"
          textAlign="center"
          fontSize="sm"
        >
          {d}
        </Box>
      ))}

      {/* Generate Grid Cells */}
      {gridCells.map((cell, index) => {

        {/* Create Padding Cells */}
        if (cell.type === "padding") {
          return (
            <Box
              key={index}
              minH="120px"
              transition="background 0.2s"
              borderRight="1px solid"
              borderBottom="1px solid"
              borderColor={borderColor}
              bg={emptyBg}
              p={2}
              _hover={{ bg: hoverBg }}
            >
                <Text fontSize="sm" color="gray.400" fontWeight="bold">
                  {cell.dateStr ? parseInt(cell.dateStr.split('-')[2], 10) : ''}
                </Text>
            </Box>
          )
        }

        {/* Create Day Cells */}
        const day = cell.dayNumber!;
        const dateStr = cell.dateStr!;
        const isSelected = selectedRegenDates.includes(dateStr);

        const dayEvents = eventsByDay[day] || [];

        const pythonDateStr = getPythonDateString(dateStr); // e.g., "2026-03-01" -> "Mar 01"

        // Filter the global arrays for errors belonging to this day
        const dayHardErrors = globalHardErrors.filter(err => err.includes(pythonDateStr));
        const daySoftWarnings = globalSoftWarnings.filter(warn => warn.includes(pythonDateStr));

        const hasErrors = dayHardErrors.length > 0;
        const hasWarnings = daySoftWarnings.length > 0;

        return (
          <Box
            key={index}
            position="relative"
            minH="120px"
            transition="background 0.2s"
            borderRight="1px solid"
            borderBottom="1px solid"
            borderColor={isSelected ? "blue.500" : borderColor}
            bg={isSelected ? "blue.50" : cellBg}
            _dark={{ bg: isSelected ? "blue.900" : cellBg }}
            outline={isSelected ? "2px solid" : "none"}
            outlineColor={isSelected ? "blue.500" : "transparent"}
            outlineOffset="-2px"
            zIndex={isSelected ? 1 : 0}
            p={2}
            cursor="pointer"
            onClick={(e) => handleCellClick(e, dateStr)}
            _hover={{ bg: isSelected ? "blue.100" : hoverBg }}
          >
            <Flex justify="space-between" align="center" mb={1} position="relative" minH="24px">
              {/* Left: Date */}
              <Text fontSize="sm" color={isSelected ? "blue.600" : "gray.500"} fontWeight="bold">
                {day}
              </Text>

              {/* Center: Validation Icon (Absolute Centered) */}
              {(hasErrors || hasWarnings) && (
                <Box position="absolute" left="50%" transform="translateX(-50%)" zIndex={2}>
                  <Tooltip
                    content={
                      <VStack align="start" gap={1} p={2} maxW="250px">
                        {dayHardErrors.map((err, i) => (
                          <Text key={`hard-${i}`} color={hardErrorText} fontSize="xs" fontWeight="bold">• {err}</Text>
                        ))}
                        {daySoftWarnings.map((warn, i) => (
                          <Text key={`soft-${i}`} color={softWarningText} fontSize="xs">• {warn}</Text>
                        ))}
                      </VStack>
                    }
                    openDelay={100}
                    positioning={{ placement: "top" }}
                    showArrow
                    contentProps={{
                      bg: tooltipBg,
                      borderColor: tooltipBorder,
                      borderWidth: "1px",
                      shadow: "xl",
                      borderRadius: "md",
                      p: 2
                    }}
                  >
                    <Box cursor="help" display="flex" alignItems="center">
                      <Icon color={hasErrors ? "red.500" : "yellow.500"} size="md">
                        {hasErrors ? <LuCircleAlert /> : <LuTriangleAlert />}
                      </Icon>
                    </Box>
                  </Tooltip>
                </Box>
              )}

              {/* Right: Checkbox - Set blue color palette for cells selected for regen. */}
              {onToggleRegenDate && (
                <Box onClick={(e) => e.stopPropagation()} zIndex={2}>
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleRegenDate(dateStr)} colorPalette="blue" size="sm" />
                </Box>
              )}
            </Flex>

            <Stack gap={1}>
              {/* Handle creating shift rows and columns for shifts */}
              {(() => {
                /**
                 * Extract the time from an ISO datetime string.
                 */
                const extractTime = (timeStr?: string): string => {
                  if (!timeStr) return "00:00";
                  return timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
                };

                /**
                 * Convert timeStr to minutes
                 */
                const parseTimeToMinutes = (timeStr?: string): number => {
                  const timeOnly = extractTime(timeStr);
                  const [hours, minutes] = timeOnly.split(':').map(Number);
                  return hours * 60 + minutes;
                };

                /**
                 * Get the total minute duration of the shift
                 */
                const getShiftDuration = (shift: CalendarEvent): number => {
                  if (shift.startTime === shift.endTime || extractTime(shift.startTime) === extractTime(shift.endTime)) return 1440;
                  const startMinutes = parseTimeToMinutes(shift.startTime);
                  const endMinutes = parseTimeToMinutes(shift.endTime);
                  if (endMinutes < startMinutes) return (1440 - startMinutes) + endMinutes;
                  return endMinutes - startMinutes;
                };

                /**
                 * Check if a shift is for 24hrs
                 */
                const isFullDayShift = (shift: CalendarEvent): boolean => {
                  return shift.startTime === shift.endTime || extractTime(shift.startTime) === extractTime(shift.endTime);
                };

                /**
                 * Group shifts by positions
                 */
                const groupedByPosition = dayEvents.reduce((acc, event) => {
                  const baseName = event.label.split(' (')[0];
                  if (!acc[baseName]) acc[baseName] = [];
                  acc[baseName].push(event);
                  return acc;
                }, {} as Record<string, typeof dayEvents>);

                /**
                 * Process each group of positions
                 */
                return Object.entries(groupedByPosition).map(([positionName, shifts]) => {
                  const finalRenderRows: (CalendarEvent | null)[][] = [];
                  const fullDayShifts = shifts.filter(isFullDayShift);
                  const partialDayShifts = shifts.filter(s => !isFullDayShift(s));

                  // Each full-day shift gets its own row.
                  fullDayShifts.forEach(shift => finalRenderRows.push([shift]));

                  // Group partial shifts by their duration to separate patterns
                  if (partialDayShifts.length > 0) {
                    const shiftsByDuration = partialDayShifts.reduce((acc, shift) => {
                      const duration = getShiftDuration(shift);
                      if (!acc[duration]) acc[duration] = [];
                      acc[duration].push(shift);
                      return acc;
                    }, {} as Record<string, CalendarEvent[]>);

                    // For each duration, create the necessary rows and slots.
                    for (const duration in shiftsByDuration) {
                      const patternShifts = shiftsByDuration[duration];
                      const numSlots = Math.round(1440 / parseInt(duration)) || 1;
                      const slotDuration = 1440 / numSlots;

                      // Place shifts of the same duration into non-overlapping rows
                      const patternRows: CalendarEvent[][] = [];
                      patternShifts.sort((a, b) => extractTime(a.startTime).localeCompare(extractTime(b.startTime)));
                      patternShifts.forEach(shift => {
                        let placed = false;
                        for (const row of patternRows) {
                          const lastShiftInRow = row[row.length - 1];

                          if (extractTime(shift.startTime) >= extractTime(lastShiftInRow.endTime)) {
                            row.push(shift);
                            placed = true;
                            break;
                          }
                        }
                        if (!placed) {
                          patternRows.push([shift]);
                        }
                      });

                      // For each created row, generate the final slotted layout
                      patternRows.forEach(row => {
                        const displaySlots: (CalendarEvent | null)[] = Array(numSlots).fill(null);
                        row.forEach(shift => {
                          const startMinutes = parseTimeToMinutes(shift.startTime);
                          const slotIndex = Math.floor(startMinutes / slotDuration);
                          if (slotIndex >= 0 && slotIndex < numSlots) {
                            displaySlots[slotIndex] = shift;
                          }
                        });
                        finalRenderRows.push(displaySlots);
                      });
                    }
                  }

                  return finalRenderRows.map((row, rowIndex) => {
                    if (row.length === 0) return null;

                    // Determine if this row is a single, full-day shift
                    const isFullDay = row.length === 1 && row[0] && isFullDayShift(row[0]);

                    // Set columns: 1 column for full day, or evenly divided for partial days
                    const gridColumns = isFullDay ? "1fr" : `repeat(${row.length}, 1fr)`;

                    return (
                      <Grid key={`${positionName}-row-${rowIndex}`} w="100%" templateColumns={gridColumns} gap="2px">
                        {row.map((shift, colIndex) => {
                          // Handle empty slots in partial-day rows
                          if (!shift) {
                              return <Box key={`spacer-${rowIndex}-${colIndex}`} />;
                          }

                          const formatDisplay = (ts?: string) => extractTime(ts).substring(0, 5);

                          // Set the time text based on the shift type
                          const timeText = isFullDay ? "(24 Hr)" : `(${formatDisplay(shift.startTime)} - ${formatDisplay(shift.endTime)})`;
                          const tooltipContent = `${shift.label}: ${shift.text} ${timeText}`;

                          const c = shift.color || "blue";
                          const isHex = c.startsWith("#");

                          const fullName = shift.text || "Unassigned";
                          const lastName = fullName.split(',')[0] || fullName;
                          const firstName = fullName.split(',')[1]?.trim().split(' ')[0] || "";

                          let displayText = shift.initials || "UN"; // Default to initials

                          if (fullName !== "Unassigned") {
                            if (isFullDay) {
                              displayText = firstName ? `${lastName}, ${firstName}` : lastName;
                            } else if (row.length === 2) {
                              displayText = lastName;
                            }
                          }

                          return (
                            <Tooltip key={`${shift.id || 'shift'}-${rowIndex}-${colIndex}`} content={tooltipContent} showArrow>
                              <Flex
                                bg={isHex ? `${c}44` : `${c}.100`}
                                border="1px solid"
                                borderColor={isHex ? `${c}55` : `${c}.300`}
                                _dark={{ bg: isHex ? `${c}66` : `${c}.800`, borderColor: isHex ? `${c}88` : `${c}.600` }}
                                borderRadius="sm"
                                px={1}
                                py={0.5}
                                align="center"
                                justify="center"
                                _hover={{ bg: isHex ? `${c}66` : `${c}.200`, _dark: { bg: isHex ? `${c}88` : `${c}.700` }}}
                                transition="background 0.2s"
                                overflow="hidden"
                              >
                                <Text
                                  fontSize="2xs"
                                  fontWeight="bold"
                                  whiteSpace="nowrap"
                                  textOverflow="ellipsis"
                                  overflow="hidden"
                                >
                                  {displayText}
                                </Text>
                              </Flex>
                            </Tooltip>
                          );
                        })}
                      </Grid>
                    );
                  });
                });
              })()}
            </Stack>
          </Box>
        );
      })}
    </Grid>
  );
}, (prevProps: CalendarGridProps, nextProps: CalendarGridProps) => {
  return (
    prevProps.month === nextProps.month &&
    prevProps.year === nextProps.year &&
    prevProps.events === nextProps.events &&
    JSON.stringify(prevProps.selectedRegenDates) === JSON.stringify(nextProps.selectedRegenDates) &&
    JSON.stringify(prevProps.globalHardErrors) === JSON.stringify(nextProps.globalHardErrors) &&
    JSON.stringify(prevProps.globalSoftWarnings) === JSON.stringify(nextProps.globalSoftWarnings) &&

    // Check if the toggle prop switched between undefined (view mode) and defined (edit mode)
    !!prevProps.onToggleRegenDate === !!nextProps.onToggleRegenDate
  );
});