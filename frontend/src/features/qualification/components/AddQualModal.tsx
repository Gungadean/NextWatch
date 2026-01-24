/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AddQualModal.tsx
 *
 * Modal for adding qualifications.
 */

import {Button, CloseButton, Dialog, Portal, Input, Box} from "@chakra-ui/react";
import {Field} from "../../../components/ui/field.tsx";
import {addQual, type QualificationAddRequest, type QualificationQueryResponse} from "../qualApi.ts";
import {toaster} from "../../../components/ui/toaster.tsx";
import {useForm} from "../../../hooks/useForm.ts";
import React, {type Dispatch, type SetStateAction} from "react";

/**
 * Modal props for items to be passed from parent component.
 */
interface AddQualModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  quals: QualificationQueryResponse[];
  onQualsChange: Dispatch<SetStateAction<QualificationQueryResponse[]>>;
}

/**
 * Add qualification modal
 * Modal that allows the user to create a new qualification.
 */
const AddQualModal = ({ isOpen, onOpenChange, quals, onQualsChange }: AddQualModalProps) => {
  const { formData, handleChange, resetForm } = useForm<QualificationAddRequest>({
    name: '',
    description: ''
  });

  // Handle call to backend for adding qualification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await addQual({
        name: formData.name,
        description: formData.description
      });

      onQualsChange([...quals, result]);

      onOpenChange({ open: false });
      resetForm();
    } catch (err: any) {
      toaster.create({
        title: "Qualification Creation Failed",
        description: err.message,
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
              <Dialog.Title>Add Qualification</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-qual-form" onSubmit={handleSubmit}>
                <Box paddingBottom={5}>
                  <Field label="Name" required>
                    <Input
                    name="name"
                    onChange={handleChange}
                    value={formData.name}
                    placeholder="Qualfication name" />
                  </Field>
                </Box>
                <Field label="Description" required>
                  <Input
                    name="description"
                    onChange={handleChange}
                    value={formData.description}
                    placeholder="Enter a description here..." />
                </Field>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form="add-qual-form">Add</Button>
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

export default AddQualModal;