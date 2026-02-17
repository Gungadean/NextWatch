/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmDeleteDraftModal.tsx
 *
 * A specialized confirmation dialog for deleting schedule drafts.
 * Handles the API call and cleans up the parent state upon success.
 */

import {Button, CloseButton, Dialog, Portal} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster.tsx";
import type {Dispatch, SetStateAction} from "react";
import {
  deleteDraft,
  type DraftSummary,
  type ScheduleDraft,
  type ScheduleResponse
} from "@/features/schedule/scheduleApi.ts";

/**
 * Props for the Draft Deletion Modal.
 */
interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  draft_id: string;
  drafts: DraftSummary[];
  onDraftChange: Dispatch<SetStateAction<DraftSummary[]>>
  onDraftViewChange: Dispatch<SetStateAction<ScheduleResponse | ScheduleDraft | null | undefined>>
  onSelectedChange: Dispatch<SetStateAction<string | null>>
  onSetViewChange: Dispatch<SetStateAction<string>>
}

/**
 * Modal that prompts the user to confirm they want to delete a specific schedule draft.
 */
const ConfirmDeletionModalProps = ({ isOpen, onOpenChange, draft_id, drafts, onDraftChange, onDraftViewChange, onSelectedChange, onSetViewChange }: ConfirmDeletionModalProps) => {
  /**
   * Handle submitting form data.
   */
  const handleClick = async () => {
    try {
      await deleteDraft(draft_id);

      onOpenChange({ open: false });
      onSelectedChange(null);
      onSetViewChange("calendar");

      toaster.create({
        title: "Draft Deleted",
        type: "success"
      });
    } catch (err: any) {
      toaster.create({
        title: "Draft Deletion Failed",
        description: err.message,
        type: "error"
      })
    } finally {
      // Delete published draft.
      onDraftChange(drafts.filter(item => item.public_id !== draft_id))
      onDraftViewChange(null);
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
              <Dialog.Title>Delete Draft?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>Are you sure you would like to delete this draft? This action is irreversible.</p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button onClick={handleClick} colorPalette="red">Delete</Button>
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

export default ConfirmDeletionModalProps;