/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * ConfirmEmployeeDeletionModal.tsx
 *
 * A confirmation dialog for handling the deletion of employees.
 * It lists the names of the employees to be removed so the user can verify their selection.
 */

import {Button, CloseButton, Dialog, List, Portal} from "@chakra-ui/react";
import {toaster} from "@/components/ui/toaster.tsx";
import type {Dispatch, SetStateAction} from "react";
import {deleteEmployees, type Employee, type EmployeeDeleteRequest} from "../personnelApi.ts";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Props for the Deletion Confirmation Modal.
 */
interface ConfirmEmployeeDeletionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  selection: number[];
  employees: Employee[];
  onEmployeesChange: Dispatch<SetStateAction<Employee[]>>
}

/**
 * Modal that prompts the user to confirm they want to delete the selected employees.
 */
const ConfirmEmployeeDeletionModal = ({ isOpen, onOpenChange, selection, employees, onEmployeesChange }: ConfirmEmployeeDeletionModalProps) => {
  /**
   * Handle call to backend for deleting one or a list of employees.
   */
  const handleClick = async () => {
    try {
      const selectionList: EmployeeDeleteRequest[] = selection.map(id => {
        return {
          id: id,
        }
      });

      await deleteEmployees(selectionList);

      onEmployeesChange(employees.filter(item => !selection.includes(item.id)));
      onOpenChange({ open: false });

      toaster.create({
        title: selection.length === 1 ? "Employee Deleted" : "Employees Deleted",
        type: "success"
      });
    } catch (error: unknown) {
      toaster.create({
        title: "Employee Deletion Failed",
        description: getErrorMessage(error, "Unable to delete employee"),
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
              <Dialog.Title>{selection.length === 1 ? "Delete Employee?" : "Delete Employees?"}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>Are you sure you would like to delete the following employee(s)? This action is irreversible.</p>
              {/* List of employees to be deleted. */}
              <List.Root paddingTop={3} paddingLeft={5}>
                {selection.map((selectionId) => {
                  const deleteItem = employees.find((item) => item.id === selectionId);

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

export default ConfirmEmployeeDeletionModal;