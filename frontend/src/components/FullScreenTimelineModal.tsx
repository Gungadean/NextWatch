/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * FullScreenTimelineModal.tsx
 *
 * Creates fullscreen view of large timeline datasets
 */

import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {Dialog, Portal} from "@chakra-ui/react";
import {CloseButton} from "@/components/ui/close-button.tsx";

interface FullScreenTimelineModalProps {
  mainBg: string;
  borderColor: string;

  open: boolean;
  onOpenChange: (details: { open: boolean }) => void;

  timelineItems: TimelineItem[];
  timelineRows: TimelineRow[];

  rangeStart?: string;
  rangeEnd?: string;

  onDayClick?: (dateStr: string) => void;
}

const FullScreenTimelineModal = ({
  mainBg,
  borderColor,
  open,
  onOpenChange,
  timelineItems,
  timelineRows,
  rangeStart,
  rangeEnd,
  onDayClick,
}: FullScreenTimelineModalProps) => {

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      size="cover"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <Dialog.Positioner p={4}>
          <Dialog.Content
            bg={mainBg}
            h="100dvh"
            display="flex"
            flexDirection="column"
            borderRadius="0"
            shadow="none"
            position="relative"
          >
            <Dialog.Header borderBottom="1px solid" borderColor={borderColor} py={3}>
                <Dialog.Title>Full Timeline View ({rangeStart} to {rangeEnd})</Dialog.Title>
                <Dialog.CloseTrigger
                  asChild
                  position="absolute"
                  top="1"
                  right="4"
                  zIndex="100"
                >
                  <CloseButton
                    size="lg"
                    variant="subtle"
                    bg="blackAlpha.100"
                    _hover={{ bg: "red.500", color: "white" }}
                    borderRadius="full"
                  />
                </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={4} flex="1" overflowY="auto">
              <TimelineGrid
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                rows={timelineRows}
                items={timelineItems}
                showConflicts={false}
                onDayClick={onDayClick}
                enableEmployeeModal={false}
                enableHighlight={true}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default FullScreenTimelineModal;