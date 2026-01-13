/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * CalendarPage.tsx
 *
 * Content page for displaying calendar.
 * TODO: Break out into modules for eventual use with builder page.
 */

import "./Calendar.css";
import {useState} from "react";
import {Box, Button, Grid, GridItem, Heading, Stack, Text} from "@chakra-ui/react";
import {useColorModeValue} from "../components/ui/color-mode.tsx";

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Temporary data for testing.
const SHIFT_ASSIGNMENTS = {
  "2025-12-25": [{ station: "Security", name: "John Doe" }],
  "2025-12-27": [{ station: "Lead", name: "Jane Smith" }, { station: "Radio", name: "Alex R." }, { station: "Radio", name: "Alex R." }],
};

/**
 * Layout for displaying schedule calendar.
 * Retrieves data from backend about schedule and displays on calendar for end user.
 */
const CalendarPage = () => {
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const selectedMonth = currentViewDate.getMonth()
  const selectedYear = currentViewDate.getFullYear()

  const emptyBackground = useColorModeValue("gray.100", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  /**
   * Update the selected month when user uses prev/next month buttons.
   */
  const updateSelectedMonth = (change: number) => {
    const newDate = new Date(currentViewDate)

    newDate.setMonth(newDate.getMonth() + change)
    setCurrentViewDate(newDate)
  }

  /**
   * Get data start and end date and generate array that aligns with corresponding day of week headers.
   */
  const generateCalendarDays = () => {
    const startOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1);
    const endOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 0);

    const days = [];
    // Padding for days from previous month to align start of week
    for (let i = 0; i < startOfMonth.getDay(); i++) {
      days.push({ day: null, dateKey: null });
    }
    // Current month days
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const dateKey = `2025-12-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, dateKey });
    }
    return days;
  };

  return(
    <Box>
      {/* Create prev/next month buttons and label for month and year */}
      <Stack direction="row" justify="space-between" paddingBottom="5">
        <Button aria-label="Previous Month" onClick={() => updateSelectedMonth(-1)}>Previous Month</Button>
        <Heading>{MONTH_LABELS[selectedMonth]}, {selectedYear}</Heading>
        <Button aria-label="Next Month" onClick={() => updateSelectedMonth(1)}>Next Month</Button>
      </Stack>

      {/* Generate day of week labels at top of calendar */}
      <Grid templateColumns="repeat(7, 1fr)" border="1px solid" borderColor={borderColor}>
        {DAY_LABELS.map(day => (
          <GridItem textAlign="center" padding="3">
            <Text fontSize="0.9rem" fontWeight="bold">{day}</Text>
          </GridItem>
        ))}
      </Grid>

      {/* Generate calendar cells day cells */}
      <Grid templateColumns="repeat(7, 1fr)" autoRows="minmax(120px, 1fr)">
        {generateCalendarDays().map((item) => (
          !item.day ? <Box backgroundColor={emptyBackground} border="1px solid" borderColor={borderColor}/> :
            <Box border="1px solid" borderColor={borderColor}>
              <Stack direction="row" justify="center">
                <Text fontSize="0.8rem" fontWeight="bold" color="#666">{item.day}</Text>
              </Stack>

              {item.dateKey && SHIFT_ASSIGNMENTS[item.dateKey]?.map((shift: any, i: number) => (
                <Box paddingLeft="1" paddingRight="1" paddingBottom="1">
                  <div key={i} className="calendar-shift-badge">
                    <strong>{shift.station.charAt(0)}:</strong> {shift.name}
                  </div>
                </Box>
              ))}
            </Box>
        ))}
      </Grid>
    </Box>
  )
};

export default CalendarPage;