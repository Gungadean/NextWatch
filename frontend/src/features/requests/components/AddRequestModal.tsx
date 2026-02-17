/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AddRequestModal.tsx
 *
 * Modal interface for submitting new Time Off Requests.
 * Features an autocomplete Employee picker and smart date-range inputs.
 */

import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  Box,
  Text,
  HStack,
  createListCollection,
  Combobox,
  Stack
} from "@chakra-ui/react";
import {Field} from "@/components/ui/field.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {useForm} from "@/hooks/useForm.ts";
import React, {type Dispatch, type SetStateAction, useMemo, useState} from "react";
import {addRequest, type TimeOffAddRequest, type TimeOffResponse} from "@/features/requests/requestsApi.ts";
import type {Employee} from "@/features/personnel/personnelApi.ts";
import {toSimpleDate} from "@/utils/timeUtils.ts";

/**
 * Props for the AddRequestModal.
 */
interface AddRequestModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  employees: Employee[];
  requests: TimeOffResponse[];
  onRequestsChange: Dispatch<SetStateAction<TimeOffResponse[]>>;
}

/**
 * Modal that allows the user to create a new time off request.
 */
const AddRequestModal = ({ isOpen, onOpenChange, employees, requests, onRequestsChange }: AddRequestModalProps) => {
  // Initialize initial form state.
  const {formData, handleChange, resetForm, setFormData} = useForm<TimeOffAddRequest>({
    employee_id: -1,
    start_date: toSimpleDate(new Date()),
    end_date: toSimpleDate(new Date()),
    request_type: 'Leave'
  });

  const [inputFilter, setInputFilter] = useState("");

  // Memoize the collection to prevent rebuilding on every render
  const collection = useMemo(() => {
    const filteredEmployees = employees.filter((emp) => {
      const fullName = `${emp.last_name}, ${emp.first_name} ${emp.middle_name}`;
      return fullName.toLowerCase().includes(inputFilter.toLowerCase());
    });

    return createListCollection({
      items: filteredEmployees,
      itemToString: (item) => `${item.last_name}, ${item.first_name} ${item.middle_name}`,
      itemToValue: (item) => item.id.toString(),
    });
  }, [employees, inputFilter]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.employee_id === -1) {
      toaster.create({ title: "Validation Error", description: "Please select an employee", type: "error" });
      return;
    }

    try {
      const result = await addRequest(formData);
      onRequestsChange([...requests, result]);
      onOpenChange({ open: false });
      resetForm();
      setInputFilter("");

      toaster.create({
        title: "Request Created",
        type: "success"
      });
    } catch (err: any) {
      toaster.create({ title: "Request Creation Failed", description: err.message, type: "error" });
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
              <Dialog.Title>Add Time Off Request</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-request-form" onSubmit={handleSubmit}>
                <Stack gap={5} pb={5}>
                  <Field label="Employees" required>
                    <Combobox.Root
                      collection={collection}
                      selectionBehavior="replace"
                      openOnClick
                      value={formData.employee_id === -1 ? [] : [formData.employee_id.toString()]}
                      onValueChange={(e) => {
                         const newId = e.value[0] ? parseInt(e.value[0]) : -1;
                         setFormData(prev => ({ ...prev, employee_id: newId }));
                      }}
                      onInputValueChange={(e) => {
                        setInputFilter(e.inputValue);
                        if (e.inputValue === "") {
                           setFormData(prev => ({ ...prev, employee_id: -1 }));
                        }
                      }}
                    >
                      <Combobox.Control>
                        <Combobox.Input
                          placeholder="Select employee..."
                        />
                      </Combobox.Control>

                      <Combobox.Positioner>
                        <Combobox.Content>
                           {collection.items.length === 0 && (
                             <Box p={2} color="gray.500" fontSize="sm">No employees found</Box>
                           )}

                           {collection.items.map((item) => (
                              <Combobox.Item item={item} key={item.id}>
                                <Combobox.ItemText>
                                  {item.last_name}, {item.first_name} {item.middle_name.charAt(0).toUpperCase() + "."}
                                </Combobox.ItemText>
                              </Combobox.Item>
                            ))}
                        </Combobox.Content>
                      </Combobox.Positioner>
                    </Combobox.Root>
                  </Field>
                  <Text fontSize="xs" fontWeight="bold" mb={1}>Date Range</Text>
                  <HStack>
                    <Input
                      type="date"
                      size="sm"
                      value={formData.start_date}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, start_date: e.target.value }));
                        if (formData.start_date > formData.end_date) {
                          setFormData(prev => ({ ...prev, end_date: e.target.value }));
                        }
                      }}
                    />
                    <Text>-</Text>
                    <Input
                      type="date"
                      size="sm"
                      value={formData.end_date}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, end_date: e.target.value }));
                        if (formData.end_date < formData.start_date) {
                          setFormData(prev => ({ ...prev, start_date: e.target.value }));
                        }
                      }}
                    />
                  </HStack>
                  <Field label="Request Type" required>
                    <Input
                    name="request_type"
                    onChange={handleChange}
                    value={formData.request_type}
                    placeholder="Request type" />
                  </Field>
                </Stack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form="add-request-form">Add</Button>
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

export default AddRequestModal;