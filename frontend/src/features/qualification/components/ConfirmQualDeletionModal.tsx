/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmQualDeletionModal.tsx
 *
 * Modal for deleting selected qualifications.
 */

import {Button, CloseButton, Dialog, List, Portal} from "@chakra-ui/react";
import { toaster } from "../../../components/ui/toaster";
import {deleteQuals, type QualificationDeleteRequest, type QualificationQueryResponse} from "../qualApi.ts";
import type {Dispatch, SetStateAction} from "react";

/**
 * Modal props for items to be passed from parent component.
 */
interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  quals: QualificationQueryResponse[];
  onQualsChange: Dispatch<SetStateAction<QualificationQueryResponse[]>>
}

/**
 * Delete qualification(s) modal
 * Modal that prompts the user to confirm they want to delete the selected qualifications
 */
const ConfirmQualDeletionModal = ({ isOpen, onOpenChange, selection, quals, onQualsChange }: ConfirmDeletionModalProps) => {
  // Handle call to backend for deleting one or a list of qualifications.
  const handleClick = async () => {
    try {
      const selectionList: QualificationDeleteRequest[] = selection.map(id => {
        return {
          id: id,
        }
      });

      await deleteQuals(selectionList);

      onQualsChange(quals.filter(item => !selection.includes(item.id)));

      onOpenChange({ open: false });
    } catch (err: any) {
      toaster.create({
        title: "Qualification Deletion Failed",
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
              <Dialog.Title>{selection.length === 1 ? "Delete Qualification?" : "Delete Qualifications?"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>Are you sure you would like to delete the following qualification(s)? This action is irreversible.</p>
              {/* List of qualifications to be deleted. */}
              <List.Root paddingTop={3} paddingLeft={5}>
                {selection.map((selectionId) => {
                  const item = quals.find((item) => item.id === selectionId);

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

export default ConfirmQualDeletionModal;