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

import { List } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster.tsx";
import { useState, type Dispatch, type SetStateAction } from "react";
import { deleteEmployees, type Employee, type EmployeeDeleteRequest } from "../personnelApi.ts";
import { getErrorMessage } from "@/utils/errorUtils.ts";
import ConfirmModal from "@/components/ConfirmModal.tsx";

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
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle call to backend for deleting one or a list of employees.
   */
  const handleClick = async () => {
    setIsProcessing(true);
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
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={selection.length === 1 ? "Delete Employee?" : "Delete Employees?"}
      confirmText="Delete"
      confirmColorPalette="red"
      onConfirm={handleClick}
      isProcessing={isProcessing}
    >
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
    </ConfirmModal>
  );
}

export default ConfirmEmployeeDeletionModal;