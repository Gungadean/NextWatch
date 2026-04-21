/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmPositionDeletionModal.tsx
 *
 * A confirmation dialog for handling the deletion of positions.
 * It gives a summary of the items to be deleted to prevent accidental data loss.
 */

import { List } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster.tsx";
import {
  deletePositions,
  type PositionDeleteRequest,
  type PositionWithRequirementsRead
} from "../positionApi.ts";
import { useState, type Dispatch, type SetStateAction } from "react";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import ConfirmModal from "@/components/ConfirmModal.tsx";

/**
 * Props for the Position Deletion Modal.
 */
interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  positions: PositionWithRequirementsRead[];
  onPositionsChange: Dispatch<SetStateAction<PositionWithRequirementsRead[]>>
}

/**
 * Modal that prompts the user to confirm they want to delete the selected positions.
 */
const ConfirmPositionDeletionModal = ({ isOpen, onOpenChange, selection, positions, onPositionsChange }: ConfirmDeletionModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle call to backend for deleting one or a list of positions.
  const handleClick = async () => {
    setIsProcessing(true);
    try {
      const selectionList: PositionDeleteRequest[] = selection.map(id => ({ id }));

      await deletePositions(selectionList);

      onPositionsChange(positions.filter(item => !selection.includes(item.id)));
      onOpenChange({ open: false });

      toaster.create({
        title: selection.length === 1 ? "Position Deleted" : "Positions Deleted",
        type: "success"
      });
    } catch (error: unknown) {
      toaster.create({
        title: "Position Deletion Failed",
        description: getErrorMessage(error, "Unable to delete position"),
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
      title={selection.length === 1 ? "Delete Position?" : "Delete Positions?"}
      confirmText="Delete"
      confirmColorPalette="red"
      onConfirm={handleClick}
      isProcessing={isProcessing}
    >
      <p>Are you sure you would like to delete the following position(s)? This action is irreversible.</p>
      {/* List of positions to be deleted. */}
      <List.Root paddingTop={3} paddingLeft={5}>
        {selection.map((selectionId) => {
          const item = positions.find((item) => item.id === selectionId);

          return item ? (
            <List.Item key={item.id}>{item.name}</List.Item>
          ): null;
        })}
      </List.Root>
    </ConfirmModal>
  );
}

export default ConfirmPositionDeletionModal;