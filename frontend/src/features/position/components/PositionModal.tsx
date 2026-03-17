/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * PositionModal.tsx
 *
 * Modal interface for creating and editing Position (Watch Station) definitions.
 * Features a Color Picker to assign visual indicators for the schedule.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Input,
  Stack,
  Text,
  ColorPicker,
  HStack,
  parseColor,
  Dialog,
  Portal,
  CloseButton,
} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode.tsx";
import type { PositionAddRequest, PositionWithRequirementsRead } from "../positionApi.ts";

/**
 * Props for the PositionModal.
 */
interface PositionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  position?: PositionWithRequirementsRead | null;
  onSave: (payload: PositionAddRequest, positionId?: number) => Promise<void>;
  onDelete?: (positionId: number) => void;
}

/**
 * Modal that allows the user to create and edit positions.
 * This form allows setting the Name, Description, and a distinct Color
 * used to represent the position on the Schedule/Calendar views.
 */
function PositionModal({
  isOpen,
  onOpenChange,
  position,
  onSave,
  onDelete,
}: PositionModalProps) {
  // If a position exists, then we are editing
  const isEditMode = !!position;

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("black", "white");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const inputBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const inputFocusBg = useColorModeValue("white", "gray.800");

  const [formData, setFormData] = useState<Partial<PositionAddRequest>>({ color: '#3256a8' });
  const [isSaving, setIsSaving] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      if (isEditMode && position) {
        setFormData({
            name: position.name,
            description: position.description,
            color: position.color
        });
      } else {
        // Reset to default blue
        setFormData({ color: '#3256a8' });
      }
      hasInitialized.current = true;
    } else if (!isOpen && hasInitialized.current) {
      setFormData({ color: '#3256a8' });
      hasInitialized.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, position]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: PositionAddRequest = {
      name: formData.name || "",
      description: formData.description || "",
      color: formData.color || "#3256a8"
    };

    await onSave(payload, position?.id);

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
          <Dialog.Content maxW="500px" bg={cardBg} borderColor={borderColor} borderWidth="1px" shadow="xl" borderRadius="lg">

            <Dialog.Header pb={2}>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>
                {isEditMode ? `Edit ${position.name}` : "Add New Position"}
              </Text>
              <Text fontSize="sm" color={mutedText} mt={1}>
                {isEditMode ? "Update the details and color marker for this watch station." : "Define a new watch station and assign its schedule color."}
              </Text>
            </Dialog.Header>

            <Dialog.Body>
              <form id="position-form" onSubmit={handleSaveClick}>
                <Stack gap={5} pb={2} pt={2}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Name</Text>
                    <Input
                        name="name"
                        required
                        onChange={handleChange}
                        value={formData.name || ""}
                        placeholder="e.g. CDO"
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Description</Text>
                    <Input
                        name="description"
                        required
                        onChange={handleChange}
                        value={formData.description || ""}
                        placeholder="Command Duty Officer"
                        borderColor={borderColor}
                        bg={inputBg}
                        _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                        transition="all 0.2s"
                    />
                  </Box>

                  <Box>
                    <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Timeline Color</Text>
                    <ColorPicker.Root
                      name="color"
                      onValueChange={(details) => {
                        const hexValue = details.value.toString("hex");
                        setFormData((prev) => ({ ...prev, color: hexValue }));
                      }}
                      value={parseColor(formData.color || "#3256a8")}
                    >
                      <ColorPicker.HiddenInput />
                      <ColorPicker.Control>
                        <ColorPicker.Input
                            borderColor={borderColor}
                            bg={inputBg}
                            color={textColor}
                            _focus={{ bg: inputFocusBg, borderColor: "blue.400", shadow: "sm" }}
                            transition="all 0.2s"
                        />
                        <ColorPicker.Trigger />
                      </ColorPicker.Control>
                      <ColorPicker.Positioner>
                        <ColorPicker.Content bg={cardBg} borderColor={borderColor} shadow="md">
                          <ColorPicker.Area />
                          <HStack>
                            <ColorPicker.EyeDropper size="sm" variant="outline" color={textColor} borderColor={borderColor} />
                            <ColorPicker.Sliders />
                          </HStack>
                        </ColorPicker.Content>
                      </ColorPicker.Positioner>
                    </ColorPicker.Root>
                  </Box>
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer justifyContent={isEditMode ? "space-between" : "flex-end"} mt={4}>
              {isEditMode && onDelete && (
                <Button colorPalette="red" onClick={() => { onDelete(position.id); onOpenChange(false); }}>
                  Delete
                </Button>
              )}
              <Stack direction="row" gap={3}>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" borderColor={borderColor} color={textColor}>Cancel</Button>
                </Dialog.ActionTrigger>
                <Button type="submit" form="position-form" loading={isSaving} colorPalette="blue">
                  {isEditMode ? "Save Changes" : "Add Position"}
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

export default PositionModal;