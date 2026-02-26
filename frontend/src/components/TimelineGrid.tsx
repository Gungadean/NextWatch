/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * TimelineGrid.tsx
 *
 * Renders a timeline view of the calendar. Supports infinite scrolling or
 * single month view.
 */

import { Box, Flex, Text } from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {Tooltip} from "@/components/ui/tooltip.tsx";
import {parseDate, toSimpleDate} from "@/utils/timeUtils";
import React, {useMemo, useState} from "react";
import EmployeeTimelineModal from "@/components/EmployeeTimelineModal.tsx";

/**
 * Represents a single block on the timeline (e.g., a shift or leave request).
 */
export interface TimelineItem {
  id: string | number;
  rowId: string | number;
  start: string;
  end: string;
  label: string;
  color: string;
}

/**
 * Represents a horizontal row in the timeline (e.g., an Employee).
 */
export interface TimelineRow {
  id: string | number;
  label: string;
  subLabel?: string;
}

/**
 * Props for configuring the Timeline Grid.
 * Can be controlled via Year/Month OR specific Start/End dates.
 */
interface TimelineGridProps {
  year?: number;
  month?: number; // 1-12
  rangeStart?: string;
  rangeEnd?: string;
  rows: TimelineRow[];
  items: TimelineItem[];
  showConflicts: boolean;
  onDayClick?: (dateStr: string) => void;
  enableEmployeeModal?: boolean;
  enableHighlight?: boolean;
}

/**
 * Helper: Generates an array of Date objects for every day between start and end.
 * Used to render the grid columns.
 */
const getDaysArray = (start: Date, end: Date) => {
  const dayArray = [];
  const newDate = new Date(start);
  while (newDate <= end) {
    dayArray.push(new Date(newDate));
    newDate.setDate(newDate.getDate() + 1);
  }
  return dayArray;
}

/**
 * A horizontal scrolling Timeline component (Gantt-chart style).
 *
 * Features:
 * - Sticky left column for Row Headers (Personnel names).
 * - Dynamic percentage-based positioning for timeline items.
 * - Handles both specific date ranges and full-month views.
 */
export const TimelineGrid = ({
  year,
  month,
  rangeStart,
  rangeEnd,
  rows,
  items,
  showConflicts,
  onDayClick,
  enableEmployeeModal = false,
  enableHighlight = false
}: TimelineGridProps) => {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const stickyBg = useColorModeValue("white", "gray.900");

  const dayLineColor = useColorModeValue("gray.100", "gray.700");
  const monthLineColor = useColorModeValue("gray.300", "gray.600");

  const [isEmployeeModalOpen, setEmployeeModalOpen] = useState<boolean>(false);
  const [modalEmployee, setModalEmployee] = useState<number | null>(null);

  const [highlight, setHighlightedList] = useState<string[]>([]);

  let startDate: Date, endDate: Date;

  /**
   * Calculate conflict count on initial load to prevent unnecessary
   * operations in the tsx.
   */
  const dailyItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (showConflicts) {
      items.forEach(item => {
        const current = parseDate(item.start);
        const end = parseDate(item.end);

        while (current <= end) {
          const dStr = toSimpleDate(current);
          counts[dStr] = (counts[dStr] || 0) + 1;
          current.setDate(current.getDate() + 1);
        }
      });
    }
    return counts;
  }, [items, showConflicts]);

  /**
   * Group items by row ID for more performant lookups during rendering.
   */
  const itemsByRow = useMemo(() => {
    const grouped: Record<string | number, TimelineItem[]> = {};
    items.forEach(item => {
      if (!grouped[item.rowId]) grouped[item.rowId] = [];
      grouped[item.rowId].push(item);
    });
    return grouped;
  }, [items]);

  // Determine grid boundaries based on props
  if (rangeStart && rangeEnd) {
   startDate = parseDate(rangeStart);
   endDate = parseDate(rangeEnd);
  } else if (year && month) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0)
  } else {
    return null; // Invalid boundaries.
  }

  const allDays = getDaysArray(startDate, endDate);
  const totalDays = allDays.length;

  /**
   * Calculates the LEFT offset (%) for a specific date.
   */
  const getPosition = (dateStr: string) => {
      const d = parseDate(dateStr);

      if (d < startDate) return 0;
      if (d > endDate) return 100;

      const diffTime = d.getTime() - startDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return (diffDays / totalDays) * 100;
  };

  /**
   * Calculates the exact day clicked inside a multi-day timeline bar based on mouse position.
   */
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>, itemStart: string, itemEnd: string) => {
    // Stop the click from passing through
    e.stopPropagation();

    // Calculate bounds of the date range.
    const visibleStart = parseDate(itemStart) < startDate ? startDate : parseDate(itemStart);
    const visibleEnd = parseDate(itemEnd) > endDate ? endDate : parseDate(itemEnd);

    // Get the physical width
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width; // e.g., 0.5 means they clicked exactly in the middle

    // Determine how many days the bar represents
    const diffTime = visibleEnd.getTime() - visibleStart.getTime();
    const visibleDaysSpanned = Math.round(diffTime / (1000 * 3600 * 24)) + 1;

    // Use the percentage of each day to determine index of clicked day
    const dayOffset = Math.floor(percentage * visibleDaysSpanned);

    // Get the starting day, add the index and open the modal for the clicked day.
    const clickedDate = new Date(visibleStart);
    clickedDate.setDate(clickedDate.getDate() + dayOffset);

    if (onDayClick) {
      onDayClick(toSimpleDate(clickedDate));
    }
  };

  /**
   * Calculates the WIDTH (%) for a duration.
   */
  const getWidth = (startStr: string, endStr: string) => {
      const start = parseDate(startStr) < startDate ? startDate : parseDate(startStr);
      const end = parseDate(endStr) > endDate ? endDate : parseDate(endStr);

      if (start > end) return 0;

      const diffTime = end.getTime() - start.getTime();
      const diffDays = (diffTime / (1000 * 3600 * 24)) + 1; // +1 to include the last day
      return (diffDays / totalDays) * 100;
  };

  /**
   * Toggle the highlighting for an employees row.
   */
  const setEmployeeModalView = (empId: number) => {
    if (!enableEmployeeModal) return;

    setModalEmployee(empId);
    setEmployeeModalOpen(true);
  }

  /**
   * Set if day is highlighted.
   */
  const setHighlight = (currentDate: string) => {
    if (!enableHighlight) return;

    if(isHighlighted(currentDate)) {
      setHighlightedList(prev => prev.filter(d => d !== currentDate));
    } else {
      setHighlightedList(prev => [...prev, currentDate]);
    }
  }

  /**
   * Check if an employee's row is highlighted.
   */
  const isHighlighted = (currentDate: string) => {
    return highlight.includes(currentDate);
  }

return (
    <Box overflowX="auto" border="1px solid" borderColor={borderColor} borderRadius="md" shadow="sm">
      <Box minW={`${Math.max(800, totalDays * 40)}px`}>

        {/* Header Row (Dates) */}
        <Flex borderBottom="1px solid" borderColor={borderColor} bg={headerBg} align="stretch">
          {/* Sticky Corner Box */}
          <Box
            w="200px"
            fontWeight="bold"
            pl={4}
            py={2}
            position="sticky"
            left={0}
            bg={headerBg}
            zIndex={30}
            borderRight="1px solid"
            borderColor={borderColor}
            shadow="sm"
          >
             Personnel
          </Box>

          {/* Date Columns */}
          <Flex flex="1">
            {allDays.map((d, i) => {
              const isMonthStart = d.getDate() === 1;

              let dayBackground = isMonthStart ? "blackAlpha.50" : "transparent";
              let textColor = "gray.500";
              let fontWeight = "normal";

              const currentDateString = toSimpleDate(d);

              const isHi = isHighlighted(currentDateString);

              if (showConflicts) {
                const conflictCount: number = dailyItemCounts[currentDateString] || 0;

                if (conflictCount > 2) {
                  dayBackground = "yellow.300";
                  textColor = "yellow.800";
                  fontWeight = "bold";
                }
                if (conflictCount > 4) {
                  dayBackground = "red.300";
                  textColor = "red.800";
                  fontWeight = "bold";
                }
            }

              return (
                <Box
                    key={i}
                    flex="1"
                    textAlign="center"
                    fontSize="xs"
                    color={textColor}
                    fontWeight={fontWeight}
                    py={2}
                    borderLeft={isMonthStart && i !== 0 ? "2px solid" : "1px solid"}
                    borderLeftColor={isHi ? "blue.500" : borderColor}
                    borderRight="1px solid"
                    borderRightColor={isHi ? "blue.500" : "transparent"}
                    borderTop="2px solid"
                    borderTopColor={isHi ? "blue.500" : "transparent"}
                    bg={isHi ? "blue.50" : dayBackground}
                    _dark={{ bg: isHi ? "blue.900" : dayBackground }}
                    position="relative"
                    cursor={enableHighlight ? "pointer" : "default"}
                    onClick={enableHighlight ? () => setHighlight(currentDateString) : undefined}
                >
                  {isMonthStart ? (
                      <Text fontWeight="800" color="blue.600">{d.toLocaleString('default', { month: 'short' })}</Text>
                  ) : d.getDate()}
                </Box>
              )
            })}
          </Flex>
        </Flex>

        {/* Data Rows */}
        {rows.map((row, index) => (
          <Flex
            key={row.id}
            borderBottom="1px solid"
            borderColor={borderColor}
            align="stretch"
            _hover={{ bg: "blackAlpha.50" }}
          >
            {/* Sticky Row Label (Name) */}
            <Box
              w="200px"
              px={4}
              py={3}
              position="sticky"
              left={0}
              bg={stickyBg}
              zIndex={10}
              borderRight="1px solid"
              borderColor={borderColor}
              shadow="sm"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              cursor={enableEmployeeModal ? "pointer" : "default"}
              _hover={{ bg: "gray.100", _dark: { bg: "gray.800" } }}
              onClick={enableEmployeeModal ? () => setEmployeeModalView(Number(row.id)) : undefined}
            >
                <Box
                  fontWeight="bold"
                  fontSize="sm"
                  truncate
                >{row.label}</Box>
                {row.subLabel && <Box fontSize="xs" color="gray.500">{row.subLabel}</Box>}
            </Box>

            {/* Timeline Track Area */}
            <Box flex="1" position="relative" py={3}>

               {/* Background Grid Lines (matches header columns) */}
               <Flex h="100%" position="absolute" top={0} left={0} w="100%" zIndex={0}>
                {allDays.map((d, i) => {
                  const isHi = isHighlighted(toSimpleDate(d));
                  const isMonthStart = d.getDate() === 1;

                  return (
                    <Box
                      key={i}
                      flex="1"
                      borderLeft={isMonthStart && i !== 0 ? "2px solid" : "1px solid"}
                      borderLeftColor={isHi ? "blue.500" : (isMonthStart ? monthLineColor : dayLineColor)}

                      borderRight="1px solid"
                      borderRightColor={isHi ? "blue.500" : "transparent"}

                      borderBottom="1px solid"
                      borderBottomColor={isHi && index === rows.length - 1 ? "blue.500" : "transparent"}
                      bg={isHi ? "blue.50" : (isMonthStart ? "blackAlpha.50" : "transparent")}
                      _dark={{ bg: isHi ? "blue.900" : (isMonthStart ? "whiteAlpha.100" : "transparent") }}
                      zIndex={isHi ? 5 : 1}

                      cursor={onDayClick ? "pointer" : "default"}
                      onClick={() => onDayClick && onDayClick(toSimpleDate(d))}
                    />
                )})}
              </Flex>

              {/* Render Items (Bars) for this Row */}
              {(itemsByRow[row.id] || []).map((item, i) => {
                const left = getPosition(item.start);
                const width = getWidth(item.start, item.end);

                if (width <= 0) return null;

                return (
                  <Tooltip key={i} content={item.label}>
                    <Box
                      position="absolute"
                      left={`calc(${left}% + 1px)`}
                      width={`calc(${width}% - 1px)`}
                      top="20%"
                      height="60%"
                      bg={item.color}
                      opacity={0.8}
                      zIndex={1}
                      borderRadius="sm"
                      cursor="pointer"
                      border="1px solid white"
                      _hover={{ filter: "brightness(0.9)", zIndex: 2 }}
                      onClick={(e) => handleBarClick(e, item.start, item.end)}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          </Flex>
        ))}
      </Box>

      <EmployeeTimelineModal
        open={isEmployeeModalOpen}
        onOpenChange={details => (setEmployeeModalOpen(details.open))}
        employee={modalEmployee}
        timelineItems={items}
        timelineRows={rows}
        year={year}
        month={month}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />
    </Box>
  );
};