/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import {Button, CloseButton, Dialog, List, Portal} from "@chakra-ui/react";
import { toaster } from "../../../components/ui/toaster";
import {deleteQuals, type QualificationDeleteRequest, type QualificationQueryResponse} from "../qualApi.ts";
import type {Dispatch, SetStateAction} from "react";

interface ConfirmDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  items: QualificationQueryResponse[];
  onItemsChange: Dispatch<SetStateAction<QualificationQueryResponse[]>>
}

const ConfirmDeletionModal = ({ isOpen, onOpenChange, selection, items, onItemsChange }: ConfirmDeletionModalProps) => {
  const handleClick = async () => {
    try {
      const selectionList: QualificationDeleteRequest[] = selection.map(id => {
        return {
          id: id,
        }
      });

      await deleteQuals(selectionList);

      onItemsChange(items.filter(item => !selection.includes(item.id)));

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
              <List.Root paddingTop={3} paddingLeft={5}>
                {selection.map((selectionId) => {
                  const item = items.find((item) => item.id === selectionId);

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

export default ConfirmDeletionModal;