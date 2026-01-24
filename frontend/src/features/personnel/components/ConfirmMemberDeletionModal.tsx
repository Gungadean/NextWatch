/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmMemberDeletionModal.tsx
 *
 * Modal for deleting selected members.
 */

import {Button, CloseButton, Dialog, List, Portal} from "@chakra-ui/react";
import {toaster} from "../../../components/ui/toaster";
import type {Dispatch, SetStateAction} from "react";
import {deleteMembers, type MemberDeleteRequest, type MemberQueryResponse} from "../personnelApi.ts";

/**
 * Modal props for items to be passed from parent component.
 */
interface ConfirmMemberDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  members: MemberQueryResponse[];
  onMembersChange: Dispatch<SetStateAction<MemberQueryResponse[]>>
}

/**
 * Delete members(s) modal
 * Modal that prompts the user to confirm they want to delete the selected members.
 */
const ConfirmMemberDeletionModal = ({ isOpen, onOpenChange, selection, members, onMembersChange }: ConfirmMemberDeletionModalProps) => {
  // Handle call to backend for deleting one or a list of qualifications.
  const handleClick = async () => {
    try {
      const selectionList: MemberDeleteRequest[] = selection.map(id => {
        return {
          id: id,
        }
      });

      await deleteMembers(selectionList);

      onMembersChange(members.filter(item => !selection.includes(item.id)));

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
              <Dialog.Title>{selection.length === 1 ? "Delete Member?" : "Delete Members?"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>Are you sure you would like to delete the following member(s)? This action is irreversible.</p>
              {/* List of qualifications to be deleted. */}
              <List.Root paddingTop={3} paddingLeft={5}>
                {selection.map((selectionId) => {
                  const deleteItem = members.find((item) => item.id === selectionId);

                  return deleteItem ? (
                    <List.Item key={deleteItem.id}>{deleteItem.last_name}, {deleteItem.first_name} {deleteItem.middle_name}</List.Item>
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

export default ConfirmMemberDeletionModal;