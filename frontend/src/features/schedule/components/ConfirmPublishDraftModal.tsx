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

import { toaster } from "@/components/ui/toaster.tsx";
import {
  type DraftSummary,
  publishDraft,
  type ScheduleDraft,
  type ScheduleResponse
} from "@/features/schedule/scheduleApi.ts";
import { useState, type Dispatch, type SetStateAction } from "react";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import ConfirmModal from "@/components/ConfirmModal.tsx";

/**
 * Props for the Publish Confirmation Modal.
 */
interface ConfirmPublishModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  draft_id: string;
  drafts: DraftSummary[];
  onDraftChange: Dispatch<SetStateAction<DraftSummary[]>>
  onDraftViewChange: Dispatch<SetStateAction<ScheduleResponse | ScheduleDraft | null>>
}

/**
 * Modal that confirms publishing a draft.
 * WARNING: This commits the draft to the active schedule and
 * overwrites any existing shifts for the target date range.
 */
const ConfirmPublishDraftModal = ({ isOpen, onOpenChange, draft_id, drafts, onDraftChange, onDraftViewChange }: ConfirmPublishModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle call to backend for deleting one or a list of qualifications.
  const handleClick = async () => {
    setIsProcessing(true);
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
    } catch (error: unknown) {
      toaster.create({
        title: "Draft Publishing Failed",
        description: getErrorMessage(error, "Unable to publish draft"),
        type: "error"
      })
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Publish Draft?"
      confirmText="Confirm"
      confirmColorPalette="blue"
      onConfirm={handleClick}
      isProcessing={isProcessing}
    >
      <p>Are you sure you would like to publish this draft?
        This action will overwrite any existing shifts during this time period.</p>
    </ConfirmModal>
  );
}

export default ConfirmPublishDraftModal;