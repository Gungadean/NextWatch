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

import {Button, CloseButton, Dialog, List, Portal} from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster.tsx";
import {deletePositions, type PositionDeleteRequest, type PositionQueryResponse} from "../positionApi.ts";
import type {Dispatch, SetStateAction} from "react";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Props for the Position Deletion Modal.
 */
interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  positions: PositionQueryResponse[];
  onPositionsChange: Dispatch<SetStateAction<PositionQueryResponse[]>>
}

/**
 * Modal that prompts the user to confirm they want to delete the selected positions.
 */
const ConfirmPositionDeletionModal = ({ isOpen, onOpenChange, selection, positions, onPositionsChange }: ConfirmDeletionModalProps) => {

  // Handle call to backend for deleting one or a list of positions.
  const handleClick = async () => {
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
              <Dialog.Title>{selection.length === 1 ? "Delete Position?" : "Delete Positions?"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
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

export default ConfirmPositionDeletionModal;