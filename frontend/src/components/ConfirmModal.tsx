/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * Base ConfirmModal for building other modals.
 */

import { Button } from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { type ReactNode } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  title: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColorPalette?: string;
  onConfirm: () => void | Promise<void>;
  isProcessing?: boolean;
}

const ConfirmModal = ({
  isOpen,
  onOpenChange,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColorPalette = "blue",
  onConfirm,
  isProcessing = false,
}: ConfirmModalProps) => {
  return (
    <DialogRoot open={isOpen} onOpenChange={onOpenChange} placement="center">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {children}
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" disabled={isProcessing}>
              {cancelText}
            </Button>
          </DialogActionTrigger>
          <Button
            colorPalette={confirmColorPalette}
            onClick={onConfirm}
            loading={isProcessing}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default ConfirmModal;