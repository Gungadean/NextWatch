/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * PersonnelPage.tsx
 *
 * Content page for displaying personnel page.
 */

import {useEffect, useState} from "react";
import {getMemberList, type MemberQueryResponse} from "../features/personnel/personnelApi.ts";
import {getQualList, type QualificationQueryResponse} from "../features/qualification/qualApi.ts";
import {Button, Center, Checkbox, HStack, Spinner, Stack, Table} from "@chakra-ui/react";
import AddMemberModal from "../features/personnel/components/AddMemberModal.tsx";
import ConfirmMemberDeletionModal from "../features/personnel/components/ConfirmMemberDeletionModal.tsx";

/**
 * Layout for personnel page.
 * Lists all personnel and allows adding/deleting of new users.
 */
const PersonnelPage = () => {
  const [members, setMembers] = useState<MemberQueryResponse[]>([]);
  const [quals, setQuals] = useState<QualificationQueryResponse[]>([]);
  const [selection, setSelection] = useState<number[]>([]);

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isConfirmDeletionModalOpen, setConfirmDeletionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const members_data = await getMemberList();
        const qual_data = await getQualList();
        setMembers(members_data);
        setQuals(qual_data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle opening the modal to add quals
  const handleAddModalOpen = () => {
    setAddModalOpen(!isAddModalOpen);
  }

  // Handle opening the modal to delete quals
  const handleDeleteQual = () => {
    setConfirmDeletionModalOpen(!isConfirmDeletionModalOpen);
  }

  const getQualNames = (qual_ids: number[] | undefined) => {
    if (!qual_ids || qual_ids.length === 0) {
      return "None";
    }

    return quals.filter((item) =>
      qual_ids.includes(item.id)).map((qual) => qual.name).join(", ");
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
    <Stack paddingTop="2" height="full" width="full" gap="5">
      <HStack justify="space-between">
        <Button onClick={handleAddModalOpen}>Add Member</Button>
        <Button onClick={handleDeleteQual} disabled={selection.length === 0}>Delete Member</Button>
      </HStack>
      <Table.ScrollArea borderWidth="1px" rounded="md" flex="1" overflowY="auto">
        <Table.Root size="sm" variant="outline" stickyHeader interactive>
          <Table.Header>
            <Table.Row background="bg.subtle">
              <Table.ColumnHeader />
              <Table.ColumnHeader>Last Name</Table.ColumnHeader>
              <Table.ColumnHeader>First Name</Table.ColumnHeader>
              <Table.ColumnHeader>Middle Name</Table.ColumnHeader>
              <Table.ColumnHeader>Qualifications</Table.ColumnHeader>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {members.map((item) => (
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
                <Table.Cell>{item.first_name}</Table.Cell>
                <Table.Cell>{item.last_name}</Table.Cell>
                <Table.Cell>{item.middle_name}</Table.Cell>
                <Table.Cell>{getQualNames(item.quals)}</Table.Cell>
                <Table.Cell>{item.email}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onOpenChange={(e) => setAddModalOpen(e.open)}
        members={members}
        quals={quals}
        onMembersChange={setMembers}/>

      <ConfirmMemberDeletionModal
        isOpen={isConfirmDeletionModalOpen}
        onOpenChange={(e) => setConfirmDeletionModalOpen(e.open)}
        selection={selection}
        members={members}
        onMembersChange={setMembers}/>
    </Stack>
  );
};

export default PersonnelPage;