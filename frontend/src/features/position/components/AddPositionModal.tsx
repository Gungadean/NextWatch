/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AddPositionModal.tsx
 *
 * Modal interface for creating new Position (Watch Station) definitions.
 * Features a Color Picker to assign visual indicators for the schedule.
 */

import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  ColorPicker,
  HStack,
  parseColor,
  Stack
} from "@chakra-ui/react";
import {Field} from "@/components/ui/field.tsx";
import {
  addPosition,
  type PositionAddRequest,
  type PositionWithRequirementsRead,
} from "../positionApi.ts";
import {toaster} from "@/components/ui/toaster.tsx";
import {useForm} from "@/hooks/useForm.ts";
import React, {type Dispatch, type SetStateAction} from "react";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Props for the AddPositionModal.
 */
interface AddPositionModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  positions: PositionWithRequirementsRead[];
  onPositionsChange: Dispatch<SetStateAction<PositionWithRequirementsRead[]>>;
}

/**
 * Modal that allows the user to create a new position.
 * This form allows setting the Name, Description, and a distinct Color
 * used to represent the position on the Schedule/Calendar views.
 */
const AddPositionModal = ({ isOpen, onOpenChange, positions, onPositionsChange }: AddPositionModalProps) => {
  // Initialize initial form state.
  const { formData, handleChange, resetForm } = useForm<PositionAddRequest>({
    name: '',
    description: '',
    color: '#3256a8'
  });

  // Handle submission of the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addPosition({
        name: formData.name,
        description: formData.description,
        color: formData.color
      });

      onPositionsChange([...positions, { ...result, requirements: [] }]);

      onOpenChange({ open: false });
      resetForm();

      toaster.create({
        title: "Position Created",
        type: "success"
      });
    } catch (error: unknown) {
      toaster.create({
        title: "Position Creation Failed",
        description: getErrorMessage(error, "Unable to add position"),
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
              <Dialog.Title>Add Position</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-position-form" onSubmit={handleSubmit}>
                <Stack gap={5} pb={5}>
                  <Field label="Name" required>
                    <Input
                    name="name"
                    onChange={handleChange}
                    value={formData.name}
                    placeholder="Position name" />
                  </Field>
                  <Field label="Description" required>
                    <Input
                      name="description"
                      onChange={handleChange}
                      value={formData.description}
                      placeholder="Enter a description here..." />
                  </Field>
                  <Field label="Color" required>
                    <ColorPicker.Root
                      name="color"
                      onValueChange={(details) => {
                        const hexValue = details.value.toString("hex")
                         handleChange({
                           target: {
                             name: "color",
                             value: hexValue
                           }
                         } as never)
                      }}
                      value={parseColor(formData.color)}
                    >
                      <ColorPicker.HiddenInput />
                      <ColorPicker.Control>
                        <ColorPicker.Input />
                        <ColorPicker.Trigger />
                      </ColorPicker.Control>
                      <ColorPicker.Positioner>
                        <ColorPicker.Content>
                          <ColorPicker.Area />
                          <HStack>
                            <ColorPicker.EyeDropper size="sm" variant="outline" />
                            <ColorPicker.Sliders />
                          </HStack>
                        </ColorPicker.Content>
                      </ColorPicker.Positioner>
                    </ColorPicker.Root>
                  </Field>
                </Stack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form="add-position-form">Add</Button>
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

export default AddPositionModal;