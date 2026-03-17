/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * EmployeeTimelineModal.tsx
 *
 * Creates a view of a single employees timeline dataset for a period
 */

import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {useMemo} from "react";
import {
  DialogBackdrop, DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle
} from "@/components/ui/dialog.tsx";
import { Box } from "@chakra-ui/react";

interface EmployeeTimelineModalProps {
  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  employee: number | null;
  timelineItems: TimelineItem[];
  timelineRows: TimelineRow[];

  year?: number;
  month?: number;
  rangeStart?: string;
  rangeEnd?: string;
}

const EmployeeTimelineModal = ({
   open,
   onOpenChange,
   employee,
   timelineItems,
   timelineRows,
   year,
   month,
   rangeStart,
   rangeEnd
}: EmployeeTimelineModalProps) => {

  /**
   * Filter to only show the rows for the selected employee
   */
  const employeeTimelineRow = useMemo(() => {
    return timelineRows.filter((item) => item.id === employee);
  }, [employee, timelineRows]);

  /**
   * Filter to only show the items for the selected employee
   */
  const employeeTimelineItems = useMemo(() => {
    return timelineItems.filter(item => item.rowId === employee);
  }, [employee, timelineItems]);

  if (!employee) return null;

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange} placement="center">
      <DialogBackdrop />
      <DialogContent maxWidth="90%">
        <DialogCloseTrigger />

        <DialogHeader borderBottomWidth="1px">
          <DialogTitle>{employeeTimelineRow[0]?.label}'s Timeline</DialogTitle>
        </DialogHeader>

        <DialogBody pt={4} pb={6}>
          {/* Wrap the grid to handle horizontal scrolling gracefully inside a modal */}
          <Box overflowX="auto">
            <TimelineGrid
               rows={employeeTimelineRow}
               items={employeeTimelineItems}
               showConflicts={false}
               year={year}
               month={month}
               rangeStart={rangeStart}
               rangeEnd={rangeEnd}
               enableEmployeeModal={false}
               enableHighlight={false}
            />
          </Box>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}

export default EmployeeTimelineModal;