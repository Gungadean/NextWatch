/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useScheduleViewData.ts
 *
 * Unified hook for generating CalendarEvents, TimelineItems, and TimelineRows
 * from Shift/Assignment lists
 */

import { useMemo } from "react";
import type { CalendarEvent } from "@/components/CalendarGrid.tsx";
import type { TimelineItem, TimelineRow } from "@/components/TimelineGrid.tsx";
import type { EmployeeWithTimeOff } from "@/features/personnel/personnelApi.ts";
import type { Assignment, Shift } from "@/features/schedule/scheduleApi.ts";

export const useScheduleViewData = (
  employees: EmployeeWithTimeOff[],
  scheduleItems: (Shift | Assignment)[]
) => {

  /**
   * Normalize Shifts/Assignments into a shared dataset
   */
  const normalizedData = useMemo(() => {
    return scheduleItems.map((item, index) => {
      // Determine if this is a draft (Assignment) or a published schedule (Shift)
      const isDraft = 'watchstation' in item;

      return {
        id: isDraft ? `draft-${item.date}-${item.watchstation.id}-${index}` : item.id,
        date: isDraft ? item.date : item.shift_date,
        startTime: item.start_time,
        endTime: item.end_time,
        roleName: isDraft ? item.watchstation.name : (item.position?.name || "?"),
        roleColor: isDraft ? item.watchstation.color : (item.position?.color || "blue"),
        employeeId: isDraft ? (item.watchstander.id === 0 ? null : item.watchstander.id) : item.employee?.id,
        employeeName: isDraft
          ? item.watchstander.name
          : (item.employee ? `${item.employee.last_name}, ${item.employee.first_name} ${item.employee.middle_name ? item.employee.middle_name.charAt(0) + '.' : ''}` : "Unassigned")
      };
    });
  }, [scheduleItems]);

  /**
   * Convert to CalendarEvents (Month View)
   */
  const events: CalendarEvent[] = useMemo(() => {
    return normalizedData.map(data => {
      // Generate initials for compact view
      let initials = "UN";
      if (data.employeeName !== "Unassigned") {
        const cleanName = data.employeeName.replace(/,/g, '');
        const parts = cleanName.split(' ').filter(Boolean);
        if (parts.length >= 2) {
          initials = `${parts[1][0]}${parts[0][0]}`.toUpperCase();
        } else if (parts.length === 1) {
          initials = parts[0].substring(0, 2).toUpperCase();
        }
      }

      return {
        id: data.id,
        date: data.date,
        label: data.roleName,
        text: data.employeeName,
        initials: initials,
        color: data.roleColor,
        startTime: data.startTime,
        endTime: data.endTime
      };
    });
  }, [normalizedData]);

  /**
   * Convert employee data into timeline rows for the expanded week view.
   */
  const timelineRows: TimelineRow[] = useMemo(() => {
    return employees.map(emp => ({
      id: emp.id,
      label: `${emp.last_name}, ${emp.first_name.charAt(0)}.`,
    }));
  }, [employees]);

  /**
   * Convert schedule data and time-off requests into timeline blocks.
   */
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add time off requests/leave
    employees.forEach(emp => {
      (emp.time_off_requests || [])
        .filter(req => req.status !== "Denied")
        .forEach((req, i) => {
          items.push({
            id: `time-off-${emp.id}-${i}`,
            rowId: emp.id,
            start: req.start_date,
            end: req.end_date,
            label: `Time-Off: ${req.request_type} ${req.status}`,
            shortLabel: req.request_type,
            color: req.status === "Approved" ? "green" : "gray"
          });
      });
    });

    // Add standard shifts
    normalizedData.forEach((data) => {
      if (data.employeeId !== null && data.employeeId !== undefined) {
        // Build the string that goes into the centered label
        let timePeriod = "Shift";

        if (data.startTime && data.endTime) {
          // Split the strings and convert to numbers (handles "08:00:00" or "08:00")
          const [sHours, sMins] = data.startTime.split(':').map(Number);
          const [eHours, eMins] = data.endTime.split(':').map(Number);

          // Convert to decimal hours
          const startDec = sHours + (sMins / 60);
          const endDec = eHours + (eMins / 60);

          let duration = Math.round(endDec - startDec);

          // If duration is <= 0, the shift crosses midnight or is exactly 24 hours
          if (duration <= 0) {
            duration += 24;
          }

          timePeriod = `${duration}`;
        }

        items.push({
          id: `shift-${data.id}`,
          rowId: data.employeeId,
          start: data.date,
          end: data.date,
          label: `${data.roleName}: (${data.startTime} - ${data.endTime})`,
          shortLabel: timePeriod,
          color: data.roleColor
        });
      }
    });

      return items;
    }, [employees, normalizedData]);

  return { events, timelineRows, timelineItems };
};