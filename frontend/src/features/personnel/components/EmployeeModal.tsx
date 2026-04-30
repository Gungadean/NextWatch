/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * EmployeeModal.tsx
 *
 * Modal interface for creating new personnel records.
 * Features a multi-select autocomplete (Combobox + Tags) for assigning positions.
 */

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Input,
  Stack,
  Text,
  useTagsInput,
  useCombobox,
  useListCollection,
  useFilter,
  TagsInput,
  Combobox,
  Dialog,
  Portal,
  CloseButton,
  Separator
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode.tsx";
import type { Employee, EmployeeAddRequest } from "../personnelApi.ts";
import type { PositionQueryResponse } from "../../position/positionApi.ts";
import {NativeSelectField, NativeSelectRoot} from "@/components/ui/native-select.tsx";

interface EmployeeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  positions: PositionQueryResponse[];
  onSave: (payload: EmployeeAddRequest, employeeId?: number) => Promise<void>;
  onDelete?: (employeeId: number) => void;
}

/**
 * Unified modal component that handles creating and editing employees.
 */
function EmployeeModal({
  isOpen,
  onOpenChange,
  employee,
  positions,
  onSave,
  onDelete,
}: EmployeeModalProps) {
  // If employee is present, then we are editing.
  const isEditMode = !!employee;

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("black", "white");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const inputFocusBg = useColorModeValue("white", "gray.800");

  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  const { contains } = useFilter({ sensitivity: "base" });
  const { collection, filter } = useListCollection({
    initialItems: positions,
    itemToString: (item) => item.name,
    itemToValue: (item) => item.id.toString(),
    filter: contains,
  });

  const uid = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);

  const tags = useTagsInput({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
  });

  // Combobox that will be passed to the root provider
  const combobox = useCombobox({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    collection,
    onInputValueChange(e) { filter(e.inputValue); },
    value: [],
    allowCustomValue: false,
    onValueChange: (e) => {
      if (e.items.length > 0 && !tags.value.includes(e.items[0].name)) {
        tags.addValue(e.items[0].name);
      }
    },
    selectionBehavior: "clear",
    openOnClick: true,
  });

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      if (isEditMode && employee) {
        // Populate for Editing
        setFormData({ ...employee });
        tags.setValue(employee.positions.map(p => p.name));
      } else {
        // Clear for Adding
        setFormData({});
        tags.setValue([]);
      }
      hasInitialized.current = true;
    } else if (!isOpen && hasInitialized.current) {
      // Clean up when modal closes
      setFormData({});
      tags.setValue([]);
      hasInitialized.current = false;
    }
    // Ignore tags dependency which can cause infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee]);

  if (!isOpen) return null;

  /**
   * Handle changing the format data
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number | null = value;

    // Parse to int, or set to null if "Unlimited" (empty string) is selected
    if (name === 'max_shift_length' || name === 'target_weekly_hours') {
        parsedValue = value === "" ? null : parseInt(value, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  /**
   * Generate payload for updating/adding the employee
   */
  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const positionIds = positions
      .filter(p => tags.value.includes(p.name))
      .map(p => p.id);

    const payload: EmployeeAddRequest = {
      first_name: formData.first_name || "",
      last_name: formData.last_name || "",
      middle_name: formData.middle_name || "",
      email: formData.email || "",
      max_shift_length: formData.max_shift_length ?? null,
      target_weekly_hours: formData.target_weekly_hours ?? null,
      positions: positionIds
    };

    await onSave(payload, employee?.id);

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="center"
      motionPreset="slide-in-top"
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content maxW="550px" bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="xl" borderRadius="lg">

            <Dialog.Header pb={2}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {isEditMode ? `Edit ${employee.first_name} ${employee.last_name}` : "Add New Employee"}
              </Text>
              <Text fontSize="sm" color={mutedText} mt={1}>
                {isEditMode ? "Update personal details and assigned positions." : "Enter details and assign positions to the new employee."}
              </Text>
            </Dialog.Header>

            <Dialog.Body>
              <form id="employee-form" onSubmit={handleSaveClick}>
                <Stack gap={5} pb={2} pt={2}>
                  <Grid templateColumns="2fr 1fr 2fr" gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>First Name</Text>
                      <Input
                        name="first_name"
                        required
                        onChange={handleChange}
                        value={formData.first_name || ""}
                        placeholder="First name"
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>M.I.</Text>
                      <Input
                        name="middle_name"
                        onChange={handleChange}
                        value={formData.middle_name || ""}
                        placeholder="M.I."
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Last Name</Text>
                      <Input
                        name="last_name"
                        required
                        onChange={handleChange}
                        value={formData.last_name || ""}
                        placeholder="Last name"
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                      />
                    </Box>
                  </Grid>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Email Address</Text>
                    <Input
                      name="email"
                      type="email"
                      required
                      onChange={handleChange}
                      value={formData.email || ""}
                      placeholder="Email address"
                      borderColor={borderColor}
                      bg={inputBg}
                      _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                      transition="all 0.2s"
                    />
                  </Box>

                  <Separator borderColor={borderColor} my={2} />

                  <Grid templateColumns="2fr 1fr 1fr" gap={4}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Email Address</Text>
                      <Input
                        name="email"
                        type="email"
                        required
                        onChange={handleChange}
                        value={formData.email || ""}
                        placeholder="Email address"
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                      />
                    </Box>
                  </Grid>

                  <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Max Daily Hours</Text>
                      <NativeSelectRoot>
                        <NativeSelectField
                          name="max_shift_length"
                          value={formData.max_shift_length === null ? "" : formData.max_shift_length}
                          onChange={handleChange}
                          bg={inputBg}
                          borderColor={borderColor}
                          color={textColor}
                          _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                          transition="all 0.2s"
                        >
                          <option value="">Unrestricted</option>
                          <option value={8}>8 Hours</option>
                          <option value={12}>12 Hours</option>
                          <option value={16}>16 Hours</option>
                          <option value={24}>24 Hours</option>
                        </NativeSelectField>
                      </NativeSelectRoot>
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Target Weekly Hours</Text>
                      <NativeSelectRoot>
                        <NativeSelectField
                          name="target_weekly_hours"
                          value={formData.target_weekly_hours === null ? "" : formData.target_weekly_hours}
                          onChange={handleChange}
                          bg={inputBg}
                          borderColor={borderColor}
                          color={textColor}
                          _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                          transition="all 0.2s"
                        >
                          <option value="">Unrestricted</option>
                          <option value={20}>20 Hours (Part Time)</option>
                          <option value={40}>40 Hours (Full Time)</option>
                        </NativeSelectField>
                      </NativeSelectRoot>
                    </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Qualified Positions</Text>
                    <Combobox.RootProvider value={combobox}>
                      <TagsInput.RootProvider value={tags}>
                        <TagsInput.Control
                          ref={controlRef}
                          bg={inputBg}
                          borderColor={borderColor}
                          _focusWithin={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                          transition="all 0.2s"
                        >
                          {tags.value.map((tag, index) => (
                            <TagsInput.Item key={index} index={index} value={tag}>
                              <TagsInput.ItemPreview>
                                <TagsInput.ItemText>{tag}</TagsInput.ItemText>
                                <TagsInput.ItemDeleteTrigger />
                              </TagsInput.ItemPreview>
                            </TagsInput.Item>
                          ))}
                          <Combobox.Input unstyled asChild>
                            <TagsInput.Input placeholder="Assign positions..." color={textColor} />
                          </Combobox.Input>
                        </TagsInput.Control>
                        <Combobox.Positioner>
                          <Combobox.Content bg={cardBg} borderColor={borderColor} shadow="md">
                            {collection.items.map((item) => (
                              <Combobox.Item item={item} key={item.id} _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }}>
                                <Combobox.ItemText color={textColor}>{item.name}</Combobox.ItemText>
                                <Combobox.ItemIndicator />
                              </Combobox.Item>
                            ))}
                          </Combobox.Content>
                        </Combobox.Positioner>
                      </TagsInput.RootProvider>
                    </Combobox.RootProvider>
                  </Box>
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer justifyContent={isEditMode ? "space-between" : "flex-end"} mt={4}>
              {isEditMode && onDelete && (
                <Button colorPalette="red" onClick={() => { onDelete(employee.id); onOpenChange(false); }}>
                  Delete
                </Button>
              )}
              <Stack direction="row" gap={3}>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" borderColor={borderColor} color={textColor}>Cancel</Button>
                </Dialog.ActionTrigger>
                <Button type="submit" form="employee-form" loading={isSaving} colorPalette="blue">
                  {isEditMode ? "Save Changes" : "Add Employee"}
                </Button>
              </Stack>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" color={mutedText} _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }} />
            </Dialog.CloseTrigger>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export default EmployeeModal;