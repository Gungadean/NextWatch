/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import { Button, Dialog } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { deleteRequest } from "../requestsApi";
import { getErrorMessage } from "@/utils/errorUtils";

interface ConfirmRequestCancelModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  requestId: number | null;
  onCancelSuccess: () => void;
}

const ConfirmRequestCancelModal = ({ isOpen, onOpenChange, requestId, onCancelSuccess }: ConfirmRequestCancelModalProps) => {
  const handleConfirm = async () => {
    if (!requestId) return;
    try {
      await deleteRequest(requestId);
      onCancelSuccess();
      onOpenChange({ open: false });
      toaster.create({ title: "Request canceled", type: "info" });
    } catch (error: unknown) {
      toaster.create({
        title: "Cancellation Failed",
        description: getErrorMessage(error, "Unable to cancel request."),
        type: "error"
      });
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange} placement="center">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header><Dialog.Title>Cancel Request</Dialog.Title></Dialog.Header>
          <Dialog.Body>
            Are you sure you want to cancel this pending time-off request? This action cannot be undone.
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.ActionTrigger asChild><Button variant="outline">No, keep it</Button></Dialog.ActionTrigger>
            <Button colorPalette="red" onClick={handleConfirm}>Yes, cancel it</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default ConfirmRequestCancelModal;