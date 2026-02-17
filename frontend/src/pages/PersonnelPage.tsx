/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * PersonnelPage.tsx
 *
 * The primary management interface for Employee records.
 * Displays a searchable, selectable table of all personnel and provides
 * access to Add/Delete workflows.
 */

import {useEffect, useState} from "react";
import {getEmployees, type Employee} from "../features/personnel/personnelApi.ts";
import {getPositionList, type PositionQueryResponse} from "../features/position/positionApi.ts";
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  Heading,
  HStack, Input,
  Separator,
  Spinner,
  Table,
  VStack,
  Text
} from "@chakra-ui/react";
import AddEmployeeModal from "../features/personnel/components/AddEmployeeModal.tsx";
import ConfirmEmployeeDeletionModal from "../features/personnel/components/ConfirmEmployeeDeletionModal.tsx";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";

/**
 * Main Personnel Management Page.
 */
const PersonnelPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<PositionQueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selection, setSelection] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isConfirmDeletionModalOpen, setConfirmDeletionModalOpen] = useState(false);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const rowBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  /**
   * Initialization Effect.
   * Fetches both Employees and Positions in parallel.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employees_data, positions_data] = await Promise.all([
          getEmployees(),
          getPositionList()
        ]);
        setEmployees(employees_data);
        setPositions(positions_data);
      } catch (error: unknown) {
        console.error("Data Load Error:", error);
        toaster.create({
          title: "Failed to load personnel data",
          description: getErrorMessage(error, "Unable to retrieve data from backend."),
          type: "error"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Client-side filtering logic
  const filteredEmployees = employees.filter(e =>
    e.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.first_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Toggles the selection state of a specific employee row.
   */
  const handleSelectionChange = (id: number, isChecked: boolean) => {
    setSelection((prev) => {
      if (isChecked) {
        return [...prev, id];
      } else {
        return prev.filter((itemId) => itemId !== id);
      }
    });
  };

  // Loading State View
  if (isLoading) {
    return (
      <Center height="100vh">
        <VStack>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">Loading Roster...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box borderRadius="md" bg={pageBg} h="calc(100vh - 64px)" p={6} overflow="hidden">
      <VStack gap={4} h="100%" align="stretch">

        {/* Header Toolbar */}
        <Flex
          justify="space-between"
          align="center"
          bg={cardBg}
          p={4}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <HStack gap={4}>
            <Heading size="md">Personnel Management</Heading>
            <Separator orientation="vertical" height="20px" />
            <Text color="gray.500" fontSize="sm">
              {filteredEmployees.length} record{filteredEmployees.length !== 1 && 's'} found
            </Text>
          </HStack>

          <HStack gap={3}>
            {/* Search Input */}
            <Input
              placeholder="Search employees..."
              size="sm"
              w="250px"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              border="1px solid" borderColor={borderColor} shadow="sm"
            />

            {/* Action Buttons */}
            <Button
                size="sm"
                colorPalette="red"
                variant="surface"
                disabled={selection.length === 0}
                onClick={() => setConfirmDeletionModalOpen(true)}
            >
              Delete ({selection.length})
            </Button>
            <Button
                size="sm"
                colorPalette="blue"
                onClick={() => setAddModalOpen(true)}
            >
              Add Employee
            </Button>
          </HStack>
        </Flex>

        {/* Data Table */}
        <Box
          flex="1"
          bg={cardBg}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
          shadow="sm"
        >
          <Table.ScrollArea h="100%">
            <Table.Root size="sm" stickyHeader interactive>
              <Table.Header>
                <Table.Row bg={rowBg}>
                  <Table.ColumnHeader w="50px" /> {/* Checkbox Column */}
                  <Table.ColumnHeader>Last Name</Table.ColumnHeader>
                  <Table.ColumnHeader>First Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Middle</Table.ColumnHeader>
                  <Table.ColumnHeader>Positions</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredEmployees.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6} textAlign="center" color="gray.500" py={10}>
                      No employees found.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  filteredEmployees.map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <Checkbox.Root
                          size="sm"
                          aria-label={`Select ${item.last_name}`}
                          checked={selection.includes(item.id)}
                          onCheckedChange={(e) => handleSelectionChange(item.id, !!e.checked)}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control />
                        </Checkbox.Root>
                      </Table.Cell>

                      <Table.Cell fontWeight="medium">{item.last_name}</Table.Cell>
                      <Table.Cell>{item.first_name}</Table.Cell>
                      <Table.Cell>{item.middle_name}</Table.Cell>

                      {/* Positions Column (Tags) */}
                      <Table.Cell>
                        <HStack wrap="wrap" gap={1.5}>
                          {item.positions.length > 0 ? (
                              item.positions.map((position) => (
                                <Badge key={position.id} colorPalette="blue" variant="subtle" size="xs">
                                  {position.name}
                                </Badge>
                              ))
                          ) : (
                              <Text fontSize="xs" color="gray.400" fontStyle="italic">None</Text>
                          )}
                        </HStack>
                      </Table.Cell>

                      <Table.Cell color="gray.500">{item.email}</Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>
      </VStack>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onOpenChange={(e) => setAddModalOpen(e.open)}
        employees={employees}
        positions={positions}
        onEmployeesChange={setEmployees}
      />

      <ConfirmEmployeeDeletionModal
        isOpen={isConfirmDeletionModalOpen}
        onOpenChange={(e) => setConfirmDeletionModalOpen(e.open)}
        selection={selection}
        employees={employees}
        onEmployeesChange={(newEmployees) => {
            setEmployees(newEmployees);
            setSelection([]);
        }}
      />
    </Box>
  );
};

export default PersonnelPage;