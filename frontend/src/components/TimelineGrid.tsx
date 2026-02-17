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
import { parseDate } from "@/utils/timeUtils";

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
export const TimelineGrid = ({ year, month, rangeStart, rangeEnd, rows, items }: TimelineGridProps) => {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("gray.50", "gray.800");
  const stickyBg = useColorModeValue("white", "gray.900");

  const dayLineColor = useColorModeValue("gray.100", "gray.700");
  const monthLineColor = useColorModeValue("gray.300", "gray.600");

  let startDate: Date, endDate: Date;

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
            zIndex={20}
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
              return (
                <Box
                    key={i}
                    flex="1"
                    textAlign="center"
                    fontSize="xs"
                    color="gray.500"
                    py={2}
                    borderLeft={isMonthStart && i !== 0 ? "2px solid" : "1px solid"}
                    borderColor={isMonthStart ? monthLineColor : dayLineColor}
                    bg={isMonthStart ? "blackAlpha.50" : "transparent"}
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
        {rows.map((row) => (
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
            >
                <Box fontWeight="bold" fontSize="sm" truncate>{row.label}</Box>
                {row.subLabel && <Box fontSize="xs" color="gray.500">{row.subLabel}</Box>}
            </Box>

            {/* Timeline Track Area */}
            <Box flex="1" position="relative" py={3}>

               {/* Background Grid Lines (matches header columns) */}
               <Flex h="100%" position="absolute" top={0} left={0} w="100%" zIndex={0}>
                {allDays.map((d, i) => (
                    <Box
                      key={i}
                      flex="1"
                      borderLeft={d.getDate() === 1 && i !== 0 ? "2px solid" : "1px solid"}
                      borderColor={d.getDate() === 1 ? monthLineColor : dayLineColor}
                      bg={d.getDate() === 1 ? "blackAlpha.50" : "transparent"}
                    />
                ))}
              </Flex>

              {/* Render Items (Bars) for this Row */}
              {items.filter(item => item.rowId === row.id).map((item, i) => {
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
                    />
                  </Tooltip>
                );
              })}
            </Box>
          </Flex>
        ))}
      </Box>
    </Box>
  );
};