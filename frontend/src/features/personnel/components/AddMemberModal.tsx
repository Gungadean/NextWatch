/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AddMemberModal.tsx
 *
 * Modal for adding members.
 */

import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Input,
  Box,
  TagsInput,
  useFilter,
  useListCollection, useTagsInput, useCombobox,
  Combobox
} from "@chakra-ui/react";
import {Field} from "../../../components/ui/field.tsx";
import {toaster} from "../../../components/ui/toaster.tsx";
import {useForm} from "../../../hooks/useForm.ts";
import React, {type Dispatch, type SetStateAction, useId, useRef} from "react";
import {addMember, type MemberAddRequest, type MemberQueryResponse} from "../personnelApi.ts";
import type {QualificationQueryResponse} from "../../qualification/qualApi.ts";

/**
 * Modal props for items to be passed from parent component.
 */
interface AddMemberModalProps {
  isOpen: boolean;
  onOpenChange: (details: { open: boolean }) => void;
  members: MemberQueryResponse[];
  quals: QualificationQueryResponse[];
  onMembersChange: Dispatch<SetStateAction<MemberQueryResponse[]>>;
}

/**
 * Add member modal
 * Modal that allows the user to create a new member.
 */
const AddMemberModal = ({ isOpen, onOpenChange, members, quals, onMembersChange }: AddMemberModalProps) => {
  const {formData, handleChange, resetForm} = useForm<MemberAddRequest>({
    last_name: '',
    first_name: '',
    middle_name: '',
    email: '',
    quals: []
  });

  const {contains} = useFilter({sensitivity: "base"})
  const {collection, filter} = useListCollection({
    initialItems: quals,
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

  // Handle call to backend for adding qualification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedQauls = quals
      .filter(q => tags.value.includes(q.name))
      .map(q => q.id);

    try {
      const result = await addMember({
        last_name: formData.last_name,
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        email: formData.email,
        quals: selectedQauls
      });

      onMembersChange([...members, result]);
      tags.setValue([]);
      onOpenChange({open: false});
      resetForm();
    } catch (err: any) {
      toaster.create({
        title: "Member Creation Failed",
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
              <Dialog.Title>Add Member</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-member-form" onSubmit={handleSubmit}>
                <Box paddingBottom={5}>
                  <Field label="First Name" required>
                    <Input
                    name="first_name"
                    onChange={handleChange}
                    value={formData.first_name}
                    placeholder="First name" />
                  </Field>
                </Box>
                <Box paddingBottom={5}>
                  <Field label="Last Name" required>
                    <Input
                    name="last_name"
                    onChange={handleChange}
                    value={formData.last_name}
                    placeholder="Last name" />
                  </Field>
                </Box>
                <Box paddingBottom={5}>
                  <Field label="Middle Name" required>
                    <Input
                    name="middle_name"
                    onChange={handleChange}
                    value={formData.middle_name}
                    placeholder="Middle name" />
                  </Field>
                </Box>
                <Box paddingBottom={5}>
                  <Field label="Email" required>
                    <Input
                    name="email"
                    onChange={handleChange}
                    value={formData.email}
                    placeholder="email" />
                  </Field>
                </Box>
                <Box paddingBottom={5}>
                  <Field label="Qualifications" required>
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
                            <TagsInput.Input placeholder="Add qualification..." />
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
                </Box>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.ActionTrigger>
              <Button type="submit" form="add-member-form">Add</Button>
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

export default AddMemberModal;