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
import {toSimpleDate} from "@/utils/timeUtils";
import React, {useCallback, useMemo, useState} from "react";
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

  /**
   * Handle getting start, end, and days inbetween for displaying.
   */
  const gridData = useMemo(() => {
    let start: Date, end: Date;
    if (rangeStart && rangeEnd) {
      const [sy, sm, sd] = rangeStart.split('T')[0].split('-').map(Number);
      start = new Date(sy, sm - 1, sd, 12, 0, 0);
      const [ey, em, ed] = rangeEnd.split('T')[0].split('-').map(Number);
      end = new Date(ey, em - 1, ed, 12, 0, 0);
    } else if (year && month) {
      start = new Date(year, month - 1, 1, 12, 0, 0);
      end = new Date(year, month, 0, 12, 0, 0);
    } else {
      return null;
    }

    const days = getDaysArray(start, end);
    const base = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());

    return { startDate: start, endDate: end, allDays: days, totalDays: days.length, utcBase: base };
  }, [rangeStart, rangeEnd, year, month]);

  /**
   * Get the day's index from the dateStr
   */
  const getDayIndex = useCallback((dateStr: string) => {
    if (!gridData) return 0;
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 0;

    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);

    const utcItem = Date.UTC(y, m - 1, d);
    return Math.round((utcItem - gridData.utcBase) / 86400000);
  }, [gridData]);

  /**
   * Calculate the dimensions for the box based on the start and end strings.
   */
 const getBoxDimensions = useCallback((startStr: string, endStr: string) => {
    if (!gridData) return { left: 0, width: 0 };

    const startIdx = getDayIndex(startStr);
    const hasTime = startStr.includes("T") || startStr.includes(":");

    // Determine if the date has time included in the date
    if (!hasTime) {
      const endIdx = getDayIndex(endStr);

      // Safely clip the dates to the visible boundaries of the grid
      const visibleStart = Math.max(0, startIdx);
      const visibleEnd = Math.min(gridData.totalDays - 1, endIdx);

      // Calculate how many days actually survive the clip
      const visibleSpan = visibleEnd - visibleStart + 1;

      if (visibleSpan <= 0) return { left: 0, width: 0 };

      return {
          left: (visibleStart / gridData.totalDays) * 100,
          width: (visibleSpan / gridData.totalDays) * 100
      };
    }

    // If the single-day shift is outside the viewing window, hide it
    if (startIdx < 0 || startIdx >= gridData.totalDays) {
        return { left: 0, width: 0 };
    }

    const sMatch = startStr.match(/(\d{2}):(\d{2})/);
    const eMatch = endStr.match(/(\d{2}):(\d{2})/);
    if (!sMatch || !eMatch) return { left: 0, width: 0 };

    const sH = parseInt(sMatch[1], 10) + parseInt(sMatch[2], 10) / 60;
    const eH = parseInt(eMatch[1], 10) + parseInt(eMatch[2], 10) / 60;
    let dur = Math.round(eH - sH);
    if (dur <= 0) dur += 24;

    let offsetPct = 0;
    let widthPct = 100;

    if (dur >= 20) {
        // 24 Hour Shift
        offsetPct = 0; widthPct = 100;
    } else if (dur >= 10 && dur <= 14) {
        // 12 Hour Shifts
        widthPct = 50; offsetPct = (sH < 12) ? 0 : 50;
    } else if (dur >= 6 && dur <= 10) {
        // 8 Hour Shifts
        widthPct = 33.333;
        if (sH < 8) offsetPct = 0;
        else if (sH < 16) offsetPct = 33.333;
        else offsetPct = 66.666;
    } else {
        widthPct = (dur / 24) * 100;
        offsetPct = (sH / 24) * 100;
    }

    const left = ((startIdx + (offsetPct / 100)) / gridData.totalDays) * 100;
    const width = ((widthPct / 100) / gridData.totalDays) * 100;

    return { left, width };
  }, [getDayIndex, gridData]);

  /**
   * Group items into rows based on position and type of shift (i.e. 24hr shifts
   * on their own line, grouping 12hr shifts, etc)
   */
  const { groupedItems, maxLanesPerRow } = useMemo(() => {
    const grouped: Record<string | number, { item: TimelineItem, lane: number }[]> = {};
    const maxLanes: Record<string | number, number> = {};

    items.forEach(item => {
      if (!grouped[item.rowId]) grouped[item.rowId] = [];
      grouped[item.rowId].push({ item, lane: 0 });
    });

    Object.keys(grouped).forEach(rowId => {
      const sorted = grouped[rowId].sort((a, b) => getBoxDimensions(a.item.start, a.item.end).left - getBoxDimensions(b.item.start, b.item.end).left);
      const laneEnds: number[] = [];

      sorted.forEach(obj => {
        const { left, width } = getBoxDimensions(obj.item.start, obj.item.end);

        // Skip the rest calculation for this time if the width is less than or
        // equal to 0 (This happens if there are time off requests not for
        // the current displayed month.)
        if (width <= 0) {
            obj.lane = 0;
            return;
        }

        const endPct = left + width;

        let placedLane = -1;
        for (let i = 0; i < laneEnds.length; i++) {
          if (laneEnds[i] <= left + 0.001) {
            placedLane = i;
            laneEnds[i] = endPct;
            break;
          }
        }

        if (placedLane === -1) {
          placedLane = laneEnds.length;
          laneEnds.push(endPct);
        }

        obj.lane = placedLane;
      });

      maxLanes[rowId] = laneEnds.length;
    });

    return { groupedItems: grouped, maxLanesPerRow: maxLanes };
  }, [items, getBoxDimensions]);

  /**
   * Calculates the exact day clicked inside a multi-day timeline bar based on mouse position.
   */
  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>, itemStart: string, itemEnd: string) => {
    e.stopPropagation();
    if (!gridData) return;

    const startIdx = getDayIndex(itemStart);
    const hasTime = itemStart.includes(":");

    let span = 1;
    if (!hasTime) {
        span = Math.max(1, getDayIndex(itemEnd) - startIdx + 1);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const dayOffset = Math.floor(percentage * span);

    const clickedDate = new Date(gridData.startDate);
    clickedDate.setDate(clickedDate.getDate() + startIdx + dayOffset);

    if (onDayClick) {
      onDayClick(toSimpleDate(clickedDate));
    }
  }, [getDayIndex, gridData, onDayClick]);

  /**
   * Count the number of overlapping events for each day
   */
  const dailyItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!gridData || !showConflicts) return counts;

    items.forEach(item => {
      const sMatch = item.start.match(/(\d{4})-(\d{2})-(\d{2})/);
      const eMatch = item.end.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!sMatch || !eMatch) return;

      const current = new Date(Number(sMatch[1]), Number(sMatch[2])-1, Number(sMatch[3]), 12, 0, 0);
      const hasTime = item.start.includes("T") || item.start.includes(":");
      const end = hasTime ? new Date(current) : new Date(Number(eMatch[1]), Number(eMatch[2])-1, Number(eMatch[3]), 12, 0, 0);

      while (current <= end) {
        const dStr = toSimpleDate(current);
        counts[dStr] = (counts[dStr] || 0) + 1;
        current.setDate(current.getDate() + 1);
      }
    });
    return counts;
  }, [items, showConflicts, gridData]);

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

  if (!gridData) return null;

  const { allDays, totalDays } = gridData;

return (
    <Box overflowX="auto" border="1px solid" borderColor={borderColor} borderRadius="md" shadow="sm">
      <Box minW={`${Math.max(1000, totalDays * 50)}px`}>

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
        {rows.map((row, index) => {
          const rowLanes = maxLanesPerRow[row.id] || 1;
          const rowHeight = Math.max(48, rowLanes * 36 + 12);

          return (
          <Flex key={row.id} borderBottom="1px solid" borderColor={borderColor} align="stretch" minH={`${rowHeight}px`} _hover={{ bg: "blackAlpha.50" }}>
            <Box w="200px" px={4} py={1.5} position="sticky" left={0} bg={stickyBg} zIndex={10} borderRight="1px solid" borderColor={borderColor} shadow="sm" display="flex" flexDirection="column" justifyContent="center" cursor={enableEmployeeModal ? "pointer" : "default"} _hover={{ bg: "gray.100", _dark: { bg: "gray.800" } }} onClick={enableEmployeeModal ? () => setEmployeeModalView(Number(row.id)) : undefined}>
                <Box fontWeight="bold" fontSize="sm" truncate>{row.label}</Box>
                {row.subLabel && <Box fontSize="xs" color="gray.500">{row.subLabel}</Box>}
            </Box>

            <Box flex="1" position="relative" py={3}>
               {/* Background Grid Lines */}
               <Flex h="100%" position="absolute" top={0} left={0} w="100%" zIndex={0}>
                {allDays.map((d, i) => {
                  const isHi = isHighlighted(toSimpleDate(d));
                  const isMonthStart = d.getDate() === 1;
                  return (
                    <Box key={i} flex="1" borderLeft={isMonthStart && i !== 0 ? "2px solid" : "1px solid"} borderLeftColor={isHi ? "blue.500" : (isMonthStart ? monthLineColor : dayLineColor)} borderRight="1px solid" borderRightColor={isHi ? "blue.500" : "transparent"} borderBottom="1px solid" borderBottomColor={isHi && index === rows.length - 1 ? "blue.500" : "transparent"} bg={isHi ? "blue.50" : (isMonthStart ? "blackAlpha.50" : "transparent")} _dark={{ bg: isHi ? "blue.900" : (isMonthStart ? "whiteAlpha.100" : "transparent") }} zIndex={isHi ? 5 : 1} cursor={onDayClick ? "pointer" : "default"} onClick={() => onDayClick && onDayClick(toSimpleDate(d))} />
                  )
                })}
              </Flex>

              {/* Mapped Timeline Blocks */}
              {(groupedItems[row.id] || []).map(({ item, lane }, i) => {
                // Call the abstract dimension engine once!
                const { left, width } = getBoxDimensions(item.start, item.end);
                if (width <= 0) return null;

                const topOffset = 6 + (lane * 36);

                return (
                  <Tooltip key={i} content={item.label}>
                    <Box
                      position="absolute"
                      left={`calc(${left}% + 1px)`}
                      width={`calc(${width}% - 1px)`}
                      top={`${topOffset}px`}
                      height="28px"
                      bg={item.color}
                      opacity={0.9}
                      zIndex={1}
                      borderRadius="sm"
                      cursor="pointer"
                      _hover={{ filter: "brightness(0.8)", zIndex: 2 }}
                      onClick={(e) => handleBarClick(e, item.start, item.end)}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          </Flex>
        )})}
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