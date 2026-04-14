/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmRequestDenialModal.tsx
 *
 * Modal to confirm rescinding an approved leave request.
 */

import { Button, Text, VStack } from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { toaster } from "@/components/ui/toaster.tsx";
import { useState } from "react";
import { denyRequest } from "../requestsApi";
import {getErrorMessage} from "@/utils/errorUtils.ts";

interface ConfirmRequestDenialModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  requestId: number | null;
  employeeName: string;
  onDenialSuccess: () => void;
}

const ConfirmRequestDenialModal = ({
  isOpen,
  onOpenChange,
  requestId,
  employeeName,
  onDenialSuccess
}: ConfirmRequestDenialModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeny = async () => {
    if (!requestId) return;

    setIsProcessing(true);
    try {
      await denyRequest(requestId);
      toaster.create({
        title: "Request Rescinded",
        description: "The time-off request has been rescinded and marked as Denied.",
        type: "success",
      });
      onDenialSuccess();
      onOpenChange({ open: false });
    } catch (error: unknown) {
      toaster.create({
        title: "Action Failed",
        description: getErrorMessage(error, "Unable to add request"),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={onOpenChange} placement="center">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rescind Time-Off Request</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <VStack align="flex-start" gap={3}>
            <Text>
              Are you sure you want to rescind the approved time-off request for <strong>{employeeName}</strong>?
            </Text>
            <Text color="orange.500" fontSize="sm" fontWeight="bold">
              This will change the status to "Denied" and instantly free up this employee to be scheduled on all drafts.
            </Text>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" disabled={isProcessing}>Cancel</Button>
          </DialogActionTrigger>
          <Button
            colorPalette="orange"
            onClick={handleDeny}
            loading={isProcessing}
          >
            Rescind Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default ConfirmRequestDenialModal;