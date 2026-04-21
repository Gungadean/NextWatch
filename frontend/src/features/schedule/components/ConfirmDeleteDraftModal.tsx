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

import { toaster } from "@/components/ui/toaster.tsx";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  deleteDraft,
  type DraftSummary,
  type ScheduleDraft,
  type ScheduleResponse
} from "@/features/schedule/scheduleApi.ts";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import ConfirmModal from "@/components/ConfirmModal.tsx";

/**
 * Props for the Draft Deletion Modal.
 */
interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  draft_id: string;
  drafts: DraftSummary[];
  onDraftChange: Dispatch<SetStateAction<DraftSummary[]>>
  onDraftViewChange: Dispatch<SetStateAction<ScheduleResponse | ScheduleDraft | null>>
  onSelectedChange: Dispatch<SetStateAction<string | null>>
  onSetViewChange: Dispatch<SetStateAction<string>>
}

/**
 * Modal that prompts the user to confirm they want to delete a specific schedule draft.
 */
const ConfirmDeleteDraftModal = ({ isOpen, onOpenChange, draft_id, drafts, onDraftChange, onDraftViewChange, onSelectedChange, onSetViewChange }: ConfirmDeletionModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle submitting form data.
   */
  const handleClick = async () => {
    setIsProcessing(true);
    try {
      await deleteDraft(draft_id);

      onOpenChange({ open: false });
      onSelectedChange(null);
      onSetViewChange("calendar");

      toaster.create({
        title: "Draft Deleted",
        type: "success"
      });
    } catch (error: unknown) {
      toaster.create({
        title: "Draft Deletion Failed",
        description: getErrorMessage(error, "Unable to delete draft"),
        type: "error"
      })
    } finally {
      // Delete published draft.
      onDraftChange(drafts.filter(item => item.public_id !== draft_id))
      onDraftViewChange(null);
      setIsProcessing(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Delete Draft?"
      confirmText="Delete"
      confirmColorPalette="red"
      onConfirm={handleClick}
      isProcessing={isProcessing}
    >
      <p>Are you sure you would like to delete this draft? This action is irreversible.</p>
    </ConfirmModal>
  );
}

export default ConfirmDeleteDraftModal;