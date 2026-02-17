/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AddEmployeeModal.tsx
 *
 * Modal interface for creating new personnel records.
 * Features a multi-select autocomplete (Combobox + Tags) for assigning positions.
 */

import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  TagsInput,
  useFilter,
  useListCollection,
  useTagsInput,
  useCombobox,
  Combobox,
  Stack
} from "@chakra-ui/react";
import {Field} from "@/components/ui/field.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {useForm} from "@/hooks/useForm.ts";
import React, {type Dispatch, type SetStateAction, useId, useRef} from "react";
import {addEmployee, type Employee, type EmployeeAddRequest} from "../personnelApi.ts";
import type {PositionQueryResponse} from "../../position/positionApi.ts";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Props for the AddEmployeeModal.
 */
interface AddEmployeeModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  employees: Employee[];
  positions: PositionQueryResponse[];
  onEmployeesChange: Dispatch<SetStateAction<Employee[]>>;
}

/**
 * Modal component that allows the user to create a new employee.
 */
const AddEmployeeModal = ({ isOpen, onOpenChange, employees, positions, onEmployeesChange }: AddEmployeeModalProps) => {
  // Initialize initial form state.
  const {formData, handleChange, resetForm} = useForm<EmployeeAddRequest>({
    last_name: '',
    first_name: '',
    middle_name: '',
    email: '',
    positions: []
  });

  const {contains} = useFilter({sensitivity: "base"})
  const {collection, filter} = useListCollection({
    initialItems: positions,
    itemToString: (item) => item.name,
    itemToValue: (item) => item.id.toString(),
    filter: contains,
  })

  const uid = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);

  const tags = useTagsInput({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
  })

  // Combobox that will be passed to the root provider
  const combobox = useCombobox({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    collection,
    onInputValueChange(e) {
      filter(e.inputValue)
    },
    value: [],
    allowCustomValue: false,
    onValueChange: (e) => {
      if(e.items.length > 0) {
        tags.addValue(e.items[0].name)
      }
    },
    selectionBehavior: "clear",
    openOnClick: true
  })

  /**
   * Handle form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Map string tags to their numeric ids
    const selectedPositions = positions
      .filter(p => tags.value.includes(p.name))
      .map(p => p.id);

    try {
      const result = await addEmployee({
        last_name: formData.last_name,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        email: formData.email,
        positions: selectedPositions
      });

      // Optimistically update the employee list
      onEmployeesChange([...employees, result]);

      // Clean and reset form
      tags.setValue([]);
      onOpenChange({open: false});
      resetForm();

      toaster.create({ title: "Employee Added", type: "success" });
    } catch (error: unknown) {
      toaster.create({
        title: "Employee Creation Failed",
        description: getErrorMessage(error, "Unable to add employee"),
        type: "error"
      });
    }
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      motionPreset="slide-in-top">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Add Employee</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-employee-form" onSubmit={handleSubmit}>
                <Stack gap={5} pb={4}>
                  <Field label="First Name" required>
                    <Input
                    name="first_name"
                    onChange={handleChange}
                    value={formData.first_name}
                    placeholder="First name" />
                  </Field>

                  <Field label="Last Name" required>
                    <Input
                    name="last_name"
                    onChange={handleChange}
                    value={formData.last_name}
                    placeholder="Last name" />
                  </Field>

                  <Field label="Middle Name" required>
                    <Input
                    name="middle_name"
                    onChange={handleChange}
                    value={formData.middle_name}
                    placeholder="Middle name" />
                  </Field>

                  <Field label="Email" required>
                    <Input
                    name="email"
                    onChange={handleChange}
                    value={formData.email}
                    placeholder="email" />
                  </Field>

                  {/* Position Selector */}
                  <Field label="Positions" required>
                    <Combobox.RootProvider value={combobox}>
                      <TagsInput.RootProvider value={tags}>
                        <TagsInput.Control ref={controlRef}>
                          {tags.value.map((tag, index) => (
                            <TagsInput.Item key={index} index={index} value={tag}>
                              <TagsInput.ItemPreview>
                                <TagsInput.ItemText>{tag}</TagsInput.ItemText>
                                <TagsInput.ItemDeleteTrigger />
                              </TagsInput.ItemPreview>
                            </TagsInput.Item>
                          ))}

                          <Combobox.Input unstyled asChild>
                            <TagsInput.Input placeholder="Add position..." />
                          </Combobox.Input>
                        </TagsInput.Control>

                        <Combobox.Positioner>
                          <Combobox.Content>
                            {collection.items.map((item) => (
                              <Combobox.Item item={item} key={item.id}>
                                <Combobox.ItemText>{item.name}</Combobox.ItemText>
                                <Combobox.ItemIndicator />
                              </Combobox.Item>
                            ))}
                          </Combobox.Content>
                        </Combobox.Positioner>
                      </TagsInput.RootProvider>
                    </Combobox.RootProvider>
                  </Field>
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form="add-employee-form">Add</Button>
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

export default AddEmployeeModal;