/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmPublishDraftModal.tsx
 *
 * A specialized confirmation dialog for promoting a Draft Schedule to the Official Schedule.
 * Warns the user about potential data overwrites.
 */

import {Button, CloseButton, Dialog,Portal} from "@chakra-ui/react";
import {toaster} from "@/components/ui/toaster.tsx";
import {
  type DraftSummary,
  publishDraft,
  type ScheduleDraft,
  type ScheduleResponse
} from "@/features/schedule/scheduleApi.ts";
import type {Dispatch, SetStateAction} from "react";

/**
 * Props for the Publish Confirmation Modal.
 */
interface ConfirmPublishModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  draft_id: string;
  drafts: DraftSummary[];
  onDraftChange: Dispatch<SetStateAction<DraftSummary[]>>
  onDraftViewChange: Dispatch<SetStateAction<ScheduleResponse | ScheduleDraft | null | undefined>>
}

/**
 * Modal that confirms publishing a draft.
 * WARNING: This commits the draft to the active schedule and
 * overwrites any existing shifts for the target date range.
 */
const ConfirmPublishDraftModal = ({ isOpen, onOpenChange, draft_id, drafts, onDraftChange, onDraftViewChange }: ConfirmPublishModalProps) => {
  // Handle call to backend for deleting one or a list of qualifications.
  const handleClick = async () => {
    try {
      await publishDraft(draft_id);

      onDraftChange(drafts.filter(item => item.public_id !== draft_id))
      onDraftViewChange(null);
      onOpenChange({ open: false });

      toaster.create({
        title: "Schedule Published",
        description: "The draft has been successfully committed to the official schedule.",
        type: "success"
      });
    } catch (err: any) {
      toaster.create({
        title: "Draft Publishing Failed",
        description: err.message,
        type: "error"
      })
    }
  };

  return (
    <Dialog.Root
      role="alertdialog"
      open={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      motionPreset="slide-in-top">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Publish Draft?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>Are you sure you would like to publish this draft?
                This action will overwrite any existing shifts during this time period.</p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleClick} colorPalette="blue">Confirm</Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default ConfirmPublishDraftModal;