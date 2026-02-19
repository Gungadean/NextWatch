/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import {
  Badge,
  Box,
  Button,
  createListCollection,
  Flex,
  Heading,
  HStack,
  Input, Portal,
  Progress,
  Select,
  Separator,
  Stack,
  Text,
  VStack
} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {type DraftSummary} from "@/features/schedule/scheduleApi.ts";
import {convertToLocalTime} from "@/utils/timeUtils.ts";
import {LuChevronDown, LuChevronUp, LuSettings2} from "react-icons/lu";
import {useMemo, useState} from "react";
import type {Position} from "@/features/personnel/personnelApi.ts";

/**
 * BuilderSidebar.tsx
 *
 * Configuration sidebar for builder component.
 */

/**
 *
 */
const optimizationEfforts = createListCollection({
  items: [
    { label: "Quick Draft (Faster)", value: "10000" },
    { label: "Standard", value: "50000" },
    { label: "Deep Search (Better Score)", value: "100000" },
  ],
});

/**
 * Props for the Builder Sidebar.
 */
interface BuilderSidebarProps {
  mainBg: string;
  borderColor: string;

  minDaysOff: number | string;
  maxSteps: number | string;
  positions: Position[];
  selectAllPositions: boolean;
  selectedPositions: string[];

  onMaxStepsChange: (rawSteps: string) => void;
  onMinDaysOffChange: (rawDays: string) => void;
  onSelectAllPositionsChange: (isSelected: boolean) => void;
  onSelectedPositionsChange: (position_strings: string[]) => void;

  draftSummaries: DraftSummary[];
  selectedDraftId: string | null;
  startDate: string;
  endDate: string;

  isGenerating: boolean;
  genProgress: number;


  onStartDateChange: (start: string) => void;
  onEndDateChange: (end: string) => void;
  onGenerate: () => void;
  onDraftSelect: (draftId: string) => void;
}

/**
 * Configuration sidebar component for schedule builder page.
 */
const BuilderSidebar = ({
  mainBg,
  borderColor,
  minDaysOff,
  maxSteps,
  positions,
  selectAllPositions,
  selectedPositions,
  onSelectAllPositionsChange,
  onSelectedPositionsChange,
  onMinDaysOffChange,
  onMaxStepsChange,
  draftSummaries,
  selectedDraftId,
  startDate,
  endDate,
  isGenerating,
  genProgress,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onDraftSelect
}: BuilderSidebarProps) => {
  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.700");
  const activeCardBorder = "blue.500";

  // State to toggle the advanced configuration menu
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const positionCollection = useMemo(() => createListCollection({
    items: positions.map(p => ({ label: p.name, value: String(p.id) }))
  }), [positions]);

  return (
    <Box w="350px" bg={sidebarBg} borderRight="1px solid" borderColor={borderColor} p={4} overflowY="auto" flexShrink={0}>
        <VStack gap={6} align="stretch">

          {/* Configuration Section */}
          <Box>
            <Heading size="sm" mb={3} textTransform="uppercase" color="gray.500">Configuration</Heading>
            <Stack gap={3}>
              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1}>Date Range</Text>
                <HStack>
                  <Input
                    type="date"
                    size="sm"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    bg={mainBg}/>
                  <Text>-</Text>
                  <Input
                    type="date"
                    size="sm"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    bg={mainBg} />
                </HStack>
              </Box>

              {/* Advanced Configuration Accordion Toggle */}
              <Box border="1px solid" borderColor={borderColor} borderRadius="md" bg={mainBg} overflow="hidden">
                <Flex
                  p={2}
                  cursor="pointer"
                  align="center"
                  justify="space-between"
                  bg={useColorModeValue("gray.100", "gray.800")}
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  _hover={{ bg: useColorModeValue("gray.200", "gray.700") }}
                >
                  <HStack gap={2}>
                    <LuSettings2 size="14px" />
                    <Text fontSize="xs" fontWeight="bold">Advanced Configuration</Text>
                  </HStack>
                  {isAdvancedOpen ? <LuChevronUp size="14px" /> : <LuChevronDown size="14px" />}
                </Flex>

                {/* Collapsible Content */}
                {isAdvancedOpen && (
                  <Stack p={3} gap={3} borderTop="1px solid" borderColor={borderColor}>
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={2}>Included Positions</Text>
                      <VStack align="stretch" gap={2}>
                        {/* Select All Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={selectAllPositions}
                            onChange={(e) => onSelectAllPositionsChange(e.target.checked)}
                            style={{ marginRight: '8px', cursor: 'pointer' }}
                          />
                          Generate for ALL positions
                        </label>

                        {/* Multi-Select Dropdown */}
                        <Select.Root
                          multiple
                          size="sm"
                          collection={positionCollection}
                          value={selectedPositions}
                          onValueChange={(e) => onSelectedPositionsChange(e.value)}
                          disabled={selectAllPositions}
                          border="2px solid"
                          borderColor={borderColor}
                          borderRadius="sm"
                          opacity={selectAllPositions ? 0.5 : 1} // Visually dim when disabled
                        >
                          <Select.Trigger>
                            <Select.ValueText placeholder="Select specific positions..." />
                          </Select.Trigger>
                          <Portal>
                            <Select.Positioner>
                              <Select.Content>
                                {positionCollection.items.map((item) => (
                                  <Select.Item item={item} key={item.value}>
                                    {item.label}
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Portal>
                        </Select.Root>
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">Min Days Off Between Duty</Text>
                      <Input
                        type="number"
                        size="sm"
                        min={0}
                        max={10}
                        value={minDaysOff}
                        onChange={(e) => onMinDaysOffChange(e.target.value)}
                        border="2px solid"
                        borderColor={borderColor}
                        borderRadius="sm"
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">Optimization Effort</Text>
                      <Select.Root
                        size="sm"
                        collection={optimizationEfforts}
                        value={[String(maxSteps)]}
                        onValueChange={(e) => onMaxStepsChange(e.value[0])}
                        border="2px solid"
                        borderColor={borderColor}
                        borderRadius="sm"
                      >
                        <Select.Trigger>
                          <Select.ValueText placeholder="Select effort" />
                        </Select.Trigger>

                        {/* Create portal to move the DOM node outside the sidebar. */}
                        <Portal>
                          <Select.Positioner>
                            <Select.Content>
                              {optimizationEfforts.items.map((item) => (
                                <Select.Item item={item} key={item.value}>
                                  {item.label}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Box>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>

          <Separator />

          {/* Action Section */}
          <Box>
            <Button
              colorPalette="blue"
              width="100%"
              onClick={onGenerate}
              loading={isGenerating}
              loadingText="Annealing..."
            >
              Generate New Schedule
            </Button>

            {isGenerating && (
              <Box mt={2}>
                <Flex justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">Optimization Progress</Text>
                  <Text fontSize="xs" fontWeight="bold">{genProgress}%</Text>
                </Flex>
                <Progress.Root size="xs" value={genProgress} colorPalette="blue" max={100}>
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            )}
          </Box>
          <Separator />

          {/* History Section */}
          <Box>
            <Heading size="sm" mb={3} textTransform="uppercase" color="gray.500">Draft History</Heading>
            <Stack gap={2}>
              {draftSummaries.map((draft) => (
                <Box key={draft.public_id}
                     p={3}
                     bg={cardBg}
                     border="1px solid"
                     borderColor={selectedDraftId === draft.public_id ? activeCardBorder : borderColor}
                     borderLeftWidth={selectedDraftId === draft.public_id ? "4px" : "1px"}
                     borderRadius="md" cursor="pointer"
                     onClick={() => onDraftSelect(draft.public_id)}
                     _hover={{ borderColor: "blue.300" }}
                     shadow="sm">
                  <Flex justify="space-between" align="center" mb={1}>
                    <Text fontWeight="bold" fontSize="sm">Draft {convertToLocalTime(draft.created_at)}</Text>
                    <Badge colorPalette={draft.score < 50 ? "green" : "orange"}>Score: {draft.score}</Badge>
                  </Flex>
                </Box>
              ))}
            </Stack>
          </Box>
        </VStack>
      </Box>
  );
};

export default BuilderSidebar;