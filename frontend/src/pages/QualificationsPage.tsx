/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * QualificationsPage.tsx
 *
 * Content page for display qualifications list.
 */

import {Button, Center, Checkbox, HStack, Spinner, Stack, Table} from "@chakra-ui/react";
import {getQualList, type QualificationQueryResponse} from "../features/qualification/qualApi.ts";
import {useEffect, useState} from "react";
import AddQualModal from "../features/qualification/components/AddQualModal.tsx";
import {convertToLocalTime} from "../utils/timeUtils.ts";
import ConfirmDeletionModal from "../features/qualification/components/ConfirmDeletionModal.tsx";

/**
 * Layout for qualifications page.
 * Lists all qualifications and allows adding/deleting qualifications from the list.
 */
const QualificationsPage = () => {
  const [items, setItems ] = useState<QualificationQueryResponse[]>([]);
  const [selection, setSelection] = useState<number[]>([]);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isConfirmDeletionModalOpen, setConfirmDeletionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch qual list on page load.
  useEffect(() => {
    const fetchQuals = async () => {
      try {
        const data = await getQualList();
        setItems(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuals();
  }, []);

  // Handle opening the modal to add quals
  const handleAddModalOpen = () => {
    setAddModalOpen(!isAddModalOpen);
  }

  // Handle opening the modal to delete quals
  const handleDeleteQual = () => {
    setConfirmDeletionModalOpen(!isConfirmDeletionModalOpen);
  }

  // Display a loading spinner while qual list is being fetched
  if (isLoading) {
    return (
      <Center height="200px">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Stack paddingTop="2" width="full" gap="5">
      <HStack justify="space-between">
        <Button onClick={handleAddModalOpen}>Add Qualification</Button>
        <Button onClick={handleDeleteQual} disabled={selection.length === 0}>Delete Qualification</Button>
      </HStack>
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader />
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader>Created</Table.ColumnHeader>
            <Table.ColumnHeader>Created By</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {items.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell>
                <Checkbox.Root
                  size="sm"
                  mt="0.5"
                  aria-label="Select row"
                  checked={selection.includes(item.id)}
                  onCheckedChange={(changes) => {
                    setSelection((prev) =>
                      changes.checked ? [...prev, item.id] : selection.filter((id) => id !== item.id))
                    }
                  }>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                </Checkbox.Root>
              </Table.Cell>
              <Table.Cell>{item.name}</Table.Cell>
              <Table.Cell>{item.description}</Table.Cell>
              <Table.Cell>{convertToLocalTime(item.created_at)}</Table.Cell>
              <Table.Cell>{item.created_by}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      <AddQualModal
        isOpen={isAddModalOpen}
        onOpenChange={(e) => setAddModalOpen(e.open)}
        items={items}
        onItemsChange={setItems}/>

      <ConfirmDeletionModal
        isOpen={isConfirmDeletionModalOpen}
        onOpenChange={(e) => setConfirmDeletionModalOpen(e.open)}
        selection={selection}
        items={items}
        onItemsChange={setItems}/>
    </Stack>
  );
}

export default QualificationsPage;