/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarGrid.tsx
 *
 * Renders a calendar month layout for displaying events.
 */

import {Box, Grid, Text, Flex, Stack} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {parseISODate, toSimpleDate} from "@/utils/timeUtils.ts";
import type {Assignment} from "@/features/schedule/scheduleApi.ts";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {useEffect, useRef, useState} from "react";
import React from "react";
import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
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

  timelineRows?: TimelineRow[];
  timelineItems?: TimelineItem[];
  isSkeletonView?: boolean;

  onDayClick?: (dateStr: string) => void;
  selectedRegenDates?: string[];
  onToggleRegenDate?: (dateStr: string) => void;
}

/**
 * A responsive CSS Grid-based Calendar component.
 *
 * Renders a standard 7-column month view, automatically handling
 * padding days for the start of the month.
 */
export const CalendarGrid = ({
   year,
   month,
   events,
   timelineRows = [],
   timelineItems = [],
   isSkeletonView = false,
   onDayClick,
   selectedRegenDates = [],
   onToggleRegenDate,
}: CalendarGridProps) => {
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Dynamic colors for light/dark mode
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cellBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const emptyBg = useColorModeValue("gray.50", "gray.900");
  const expandedBg = useColorModeValue("gray.50", "gray.800");

  // Calculate the number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate the first day of the month
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Handle transition when expanding a week drawer
  useEffect(() => {
    if (expandedWeekIndex !== null && drawerRef.current) {
      setTimeout(() => {
        drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [expandedWeekIndex]);

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

  // Handle logic for clicking on cells
  const handleCellClick = (e: React.MouseEvent, weekIndex: number, dateStr?: string) => {
    // Toggle status in regen list if ctrl is being held down
    if (e.ctrlKey && dateStr && onToggleRegenDate) {
      onToggleRegenDate(dateStr);
      return;
    }

    // If is skeleton view, show day editor, otherwise expand week.
    if (onDayClick && isSkeletonView) {
      if (dateStr) onDayClick(dateStr);
    } else {
      setExpandedWeekIndex(expandedWeekIndex === weekIndex ? null : weekIndex);
    }
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
        const weekIndex = Math.floor(index / 7);
        const isEndOfRow = (index + 1) % 7 === 0;

        const isExpanded = expandedWeekIndex === weekIndex;
        const isCompressed = expandedWeekIndex !== null && !isExpanded;

        const cellHeight = isCompressed ? "40px" : "120px";

        let CellContent;
        {/* Create Padding Cells */}
        if (cell.type === "padding") {
          CellContent = (
            <Box
              minH={cellHeight}
              transition="min-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s"
              borderRight="1px solid"
              borderBottom={isExpanded ? "none" : "1px solid"}
              borderColor={borderColor}
              bg={isExpanded ? hoverBg : emptyBg}
              p={2}
              cursor="pointer"
              onClick={(e) => handleCellClick(e, weekIndex, cell.dateStr)}
              _hover={{ bg: hoverBg }}
            >
                <Text fontSize={isCompressed ? "xs" : "sm"} color="gray.400" fontWeight="bold" transition="font-size 0.3s">
                  {cell.dateStr ? parseInt(cell.dateStr.split('-')[2], 10) : ''}
                </Text>
            </Box>
          )
        } else {
          {/* Create Day Cells */}
          const day = cell.dayNumber!;
          const dateStr = cell.dateStr!;
          const isSelected = selectedRegenDates.includes(dateStr);

          const dayEvents = eventsByDay[day] || [];

          CellContent = (
            <Box
              minH={cellHeight}
              transition="min-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s"
              borderRight="1px solid" borderBottom={isExpanded ? "none" : "1px solid"}
              borderColor={isSelected ? "blue.500" : borderColor}
              bg={isSelected ? "blue.50" : (isExpanded ? hoverBg : cellBg)}
              _dark={{ bg: isSelected ? "blue.900" : (isExpanded ? hoverBg : cellBg) }}
              p={2} cursor="pointer"
              onClick={(e) => handleCellClick(e, weekIndex, dateStr)}
              _hover={{ bg: isSelected ? "blue.100" : hoverBg }}
            >
              <Flex justify="space-between" align="center" mb={isCompressed ? 0 : 1}>
                <Text fontSize={isCompressed ? "xs" : "sm"} color={isSelected ? "blue.600" : "gray.500"} fontWeight="bold" transition="font-size 0.3s">
                  {day}
                </Text>

                {/* Set blue color palette for cells selected for regen. */}
                {!isCompressed && onToggleRegenDate && (
                  <Box onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => onToggleRegenDate(dateStr)} colorPalette="blue" size="sm" />
                  </Box>
                )}
              </Flex>

              {/* Hide shifts when the view is compressed to save space. */}
              {isCompressed ? (
                <Flex gap="2px" mt={1} wrap="wrap" justify="flex-start" overflow="hidden" maxH="16px" px={1}>
                  {dayEvents.slice(0, 8).map((evt, i) => (
                    <Box key={i} w="6px" h="6px" borderRadius="full" bg={evt.color ? `${evt.color}.500` : "blue.500"} opacity={0.8} />
                  ))}
                  {dayEvents.length > 8 && <Text fontSize="7px" color="gray.400" lineHeight="6px">+{dayEvents.length - 8}</Text>}
                </Flex>
              ) : (
                <Stack gap={1} opacity={isCompressed ? 0 : 1} transition="opacity 0.2s">
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
                                  >
                                    <Text fontSize="2xs" fontWeight="bold" lineClamp={1}>
                                      {shift.initials || "UN"}
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
              )}
            </Box>
          );
        }

        // Calculate bounds for the embedded timeline
        let rowStartStr = null;
        let rowEndStr = null;

        if (isEndOfRow && isExpanded) {
           const sundayObj = new Date(year, month - 1, 1 - firstDayOfMonth + (weekIndex * 7));
           const saturdayObj = new Date(year, month - 1, 1 - firstDayOfMonth + (weekIndex * 7) + 6);

           rowStartStr = toSimpleDate(sundayObj);
           rowEndStr = toSimpleDate(saturdayObj);
        }

        return (
          <React.Fragment key={index}>
            {CellContent}

            {/* Create Timeline View when a week is expanded. */}
            {isEndOfRow && isExpanded && rowStartStr && rowEndStr && (
              <Box
                ref={drawerRef}
                gridColumn="1 / -1"
                bg={expandedBg}
                borderBottom="1px solid"
                borderColor={borderColor}
                p={4}
                boxShadow="inset 0px 4px 6px -4px rgba(0, 0, 0, 0.1)"
                animation="fadeIn 1s ease-in-out"
              >
                <Flex justify="space-between" align="center" mb={4}>
                  <Text fontWeight="bold" fontSize="lg">Detailed Week View</Text>
                  <Text fontSize="sm" color="gray.500">
                    {rowStartStr} to {rowEndStr}
                  </Text>
                </Flex>

                <Box border="1px solid" borderColor={borderColor} borderRadius="md" overflow="hidden">
                  <TimelineGrid
                    rangeStart={rowStartStr}
                    rangeEnd={rowEndStr}
                    rows={timelineRows}
                    items={timelineItems}
                    showConflicts={false}
                    enableHighlight={false}
                    onDayClick={onDayClick}
                  />
                </Box>
              </Box>
            )}
          </React.Fragment>
        );
      })}
    </Grid>
  );
};