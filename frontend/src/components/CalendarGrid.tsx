/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarGrid.tsx
 *
 * Renders a calendar month layout for displaying events.
 */

import {Box, Grid, Text, Stack, Badge, Flex} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {parseISODate} from "@/utils/timeUtils.ts";
import type {Assignment} from "@/features/schedule/scheduleApi.ts";
import {Checkbox} from "@/components/ui/checkbox.tsx";

/**
 * Represents a single item to be displayed on the calendar.
 */
export interface CalendarEvent {
  id: string | number;
  date: string;
  label: string;
  text: string;
  color?: string;
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
}

/**
 * A responsive CSS Grid-based Calendar component.
 *
 * Renders a standard 7-column month view, automatically handling
 * padding days for the start of the month.
 */
export const CalendarGrid = ({ year, month, events, onDayClick, selectedRegenDates = [], onToggleRegenDate }: CalendarGridProps) => {
  // Dynamic colors for light/dark mode
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cellBg = useColorModeValue("white", "gray.900");
  const headerBg = useColorModeValue("gray.100", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const emptyBg = useColorModeValue("gray.50", "gray.900");

  // Calculate the number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();

  // Calculate the first day of the month
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Generate arrays for iteration
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Group Events by Day (1-31)
  const eventsByDay: Record<number, CalendarEvent[]> = {};

  events.forEach((evt) => {
    const d = parseISODate(evt.date);

    // Ensure event belongs to the currently displayed month/year
    if (d.year === year && d.month === month) {
      if (!eventsByDay[d.day]) eventsByDay[d.day] = [];
      eventsByDay[d.day].push(evt);
    }
  });

  return (
    <Grid
      templateColumns="repeat(7, 1fr)"
      templateRows="auto"
      autoRows="minmax(120px, auto)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={cellBg}
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
        >
          {d}
        </Box>
      ))}

      {/* Padding Cells (Empty boxes for days belonging to previous month) */}
      {paddingDays.map((i) => (
        <Box
          key={`pad-${i}`}
          borderRight="1px solid"
          borderBottom="1px solid"
          borderColor={borderColor}
          bg={emptyBg}
        />
      ))}

      {/* Actual Day Cells */}
      {days.map((day) => {
        const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
        const isSelected = selectedRegenDates.includes(dateStr);

        return (
          <Box
            key={day}
            minH="120px"
            h="100%"
            border="1px solid"
            borderColor={isSelected ? "blue.500" : borderColor}
            bg={isSelected ? "blue.50" : cellBg}
            _dark={{ bg: isSelected ? "blue.900" : cellBg }}
            p={2}
            cursor={onDayClick ? "pointer" : "default"}
            onClick={(e) => e.ctrlKey ?
              (onToggleRegenDate && onToggleRegenDate(dateStr)) : (onDayClick && onDayClick(dateStr))}
            _hover={{ bg: isSelected ? "blue.100" : hoverBg }}
          >
            <Flex justify="space-between" align="start" mb={1}>
              {/* Day Number */}
              <Text fontSize="sm" color="gray.500" fontWeight="bold">
                {day}
              </Text>

              {onToggleRegenDate && (
                <Box
                  onClick={(e) => e.stopPropagation()} // Stops the modal from opening when clicking the checkbox itself
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleRegenDate(dateStr)}
                    colorPalette="blue"
                  />
                </Box>
              )}
            </Flex>

            {/* Event List Stack */}
            <Stack gap={1}>
              {eventsByDay[day]?.map((evt, i) => (
                <Badge key={`${day}-${i}`} bg={evt.color} variant="subtle" w="100%" p={1} borderRadius="md" whiteSpace="normal" textAlign="left">
                  <Text as="span" fontWeight="800" mr={1}>{evt.label}:</Text>
                  {evt.text}
                </Badge>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Grid>
  );
};