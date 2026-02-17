/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * PositionsPage.tsx
 *
 * Content page for displaying the list of Watch Stations (Positions).
 * Allows users to create, view, and delete positions.
 */

import {
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
  Text, ColorSwatch
} from "@chakra-ui/react";
import {getPositionList, type PositionQueryResponse} from "../features/position/positionApi.ts";
import {useEffect, useState} from "react";
import AddPositionModal from "../features/position/components/AddPositionModal.tsx";
import {convertToLocalTime} from "../utils/timeUtils.ts";
import ConfirmPositionDeletionModal from "../features/position/components/ConfirmPositionDeletionModal.tsx";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {toaster} from "@/components/ui/toaster.tsx";

/**
 * Main Layout for the Positions (Watch Stations) Management Page.
 */
const PositionsPage = () => {
  const [positions, setPositions] = useState<PositionQueryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selection, setSelection] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isConfirmDeletionModalOpen, setConfirmDeletionModalOpen] = useState(false);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const headerBg = useColorModeValue("gray.50", "gray.700");

  /**
   * Initialization Effect.
   * Loads the position list on mount.
   */
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const data = await getPositionList();
        setPositions(data);
      } catch (error: any) {
        console.error("Failed to load positions:", error);
        toaster.create({
            title: "Data Load Error",
            description: error.message || "Could not retrieve positions.",
            type: "error"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPositions();
  }, []);

  // Client-side filtering logic
  const filteredPositions = positions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Toggles selection for a specific row.
   */
  const handleSelectionChange = (id: number, isChecked: boolean) => {
    setSelection((prev) => {
        if (isChecked) return [...prev, id];
        return prev.filter(itemId => itemId !== id);
    });
  };

  // Loading View
  if (isLoading) {
    return (
      <Center height="100vh">
        <VStack>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">Loading Positions...</Text>
        </VStack>
      </Center>
    );
  }

return (
    <Box bg={pageBg} h="calc(100vh - 64px)" p={6} overflow="hidden">
      <VStack gap={4} h="100%" align="stretch">

        {/* Toolbar Header */}
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
            <Heading size="md">Positions</Heading>
            <Separator orientation="vertical" height="20px" />
            <Text color="gray.500" fontSize="sm">{positions.length} Items</Text>
          </HStack>

          <HStack gap={3}>
            {/* Search Input */}
            <Input
              placeholder="Search positions..."
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
            <Button size="sm" colorPalette="blue" onClick={() => setAddModalOpen(true)}>
              Add Position
            </Button>
          </HStack>
        </Flex>

        {/* Data Card */}
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
                <Table.Row bg={headerBg}>
                  <Table.ColumnHeader w="50px" /> {/* Checkbox Column */}
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Color</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader>Created</Table.ColumnHeader>
                  <Table.ColumnHeader>Created By</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {filteredPositions.length === 0 ? (
                     <Table.Row>
                        <Table.Cell colSpan={6} textAlign="center" color="gray.500" py={10}>
                            No positions found.
                        </Table.Cell>
                     </Table.Row>
                ) : (
                    filteredPositions.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <Checkbox.Root
                            size="sm"
                            aria-label={`Select ${item.name}`}
                            checked={selection.includes(item.id)}
                            onCheckedChange={(e) => handleSelectionChange(item.id, !!e.checked)}
                          >
                              <Checkbox.HiddenInput />
                              <Checkbox.Control />
                          </Checkbox.Root>
                        </Table.Cell>

                        <Table.Cell fontWeight="bold">{item.name}</Table.Cell>

                        <Table.Cell>
                            <HStack>
                                <ColorSwatch value={item.color} size="sm" />
                                <Text fontSize="xs" color="gray.500">{item.color}</Text>
                            </HStack>
                        </Table.Cell>

                        <Table.Cell color="gray.600" maxW="300px" truncate>{item.description}</Table.Cell>
                        <Table.Cell color="gray.500">{convertToLocalTime(item.created_at)}</Table.Cell>
                        <Table.Cell color="gray.500">{item.created_by}</Table.Cell>
                      </Table.Row>
                    ))
                )}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </Box>
      </VStack>

      {/* Modals */}
      <AddPositionModal
        isOpen={isAddModalOpen}
        onOpenChange={(e) => setAddModalOpen(e.open)}
        positions={positions}
        onPositionsChange={setPositions}
      />
      <ConfirmPositionDeletionModal
        isOpen={isConfirmDeletionModalOpen}
        onOpenChange={(e) => setConfirmDeletionModalOpen(e.open)}
        selection={selection}
        positions={positions}
        onPositionsChange={(newPositions) => {
            setPositions(newPositions);
            setSelection([]);
        }}
      />
    </Box>
  );
};

export default PositionsPage;