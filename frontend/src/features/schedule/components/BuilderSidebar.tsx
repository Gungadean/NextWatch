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
  IconButton,
  Input,
  Portal,
  Select,
  Separator,
  Stack,
  Text,
  VStack
} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {type DraftSummary, type ScheduleDraft, type ScheduleResponse} from "@/features/schedule/scheduleApi.ts";
import {convertToLocalTime} from "@/utils/timeUtils.ts";
import {LuChevronDown, LuChevronUp, LuPanelLeftClose, LuPanelLeftOpen, LuSettings2} from "react-icons/lu";
import {useMemo, useState} from "react";
import type {Position} from "@/features/personnel/personnelApi.ts";

/**
 * BuilderSidebar.tsx
 *
 * Configuration sidebar for builder component.
 */

/**
 * Max step optimization levels for dropdown.
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
  maxDaysOff: number | string;
  maxSteps: number | string;
  positions: Position[];
  selectAllPositions: boolean;
  selectIgnorePending: boolean;
  selectedPositions: string[];

  onMaxStepsChange: (rawSteps: string) => void;
  onMinDaysOffChange: (rawDays: string) => void;
  onMaxDaysOffChange: (rawDays: string) => void;
  onSelectAllPositionsChange: (isSelected: boolean) => void;
  onSelectIgnorePendingChange: (isSelected: boolean) => void;
  onSelectedPositionsChange: (position_strings: string[]) => void;

  draftSummaries: DraftSummary[];
  selectedDraftId: string | null;
  startDate: string;
  endDate: string;

  isGenerating: boolean;

  onStartDateChange: (start: string) => void;
  onEndDateChange: (end: string) => void;
  onDraftSelect: (draftId: string) => void;

  onBuildSkeleton: () => void;
  currentDraftData: ScheduleResponse | ScheduleDraft | null;
}

/**
 * Configuration sidebar component for schedule builder page.
 */
const BuilderSidebar = ({
  mainBg,
  borderColor,
  minDaysOff,
  maxDaysOff,
  maxSteps,
  positions,
  currentDraftData,
  selectAllPositions,
  selectIgnorePending,
  selectedPositions,
  onSelectAllPositionsChange,
  onSelectIgnorePendingChange,
  onSelectedPositionsChange,
  onMinDaysOffChange,
  onMaxDaysOffChange,
  onMaxStepsChange,
  draftSummaries,
  selectedDraftId,
  startDate,
  endDate,
  isGenerating,
  onStartDateChange,
  onEndDateChange,
  onDraftSelect,
  onBuildSkeleton
}: BuilderSidebarProps) => {
  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.700");
  const headingColor = useColorModeValue("gray.700", "gray.200");
  const accordionBg = useColorModeValue("gray.100", "gray.800");
  const hoverBg = useColorModeValue("gray.200", "gray.700");
  const activeCardBorder = "blue.500";

  const [isCollapsed, setIsCollapsed] = useState(false);
  // State to toggle the advanced configuration menu
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const positionCollection = useMemo(() => createListCollection({
    items: positions.map(p => ({ label: p.name, value: String(p.id) }))
  }), [positions]);

  const hasSkeleton = currentDraftData && currentDraftData.assignments.length > 0;

  return (
    <Box
      w={isCollapsed ? "60px" : "350px"}
      transition="all 0.2s ease-in-out"
      bg={sidebarBg}
      borderRight="1px solid"
      borderColor={borderColor}
      p={isCollapsed ? 2 : 4}
      overflowY="auto"
      overflowX="hidden"
      flexShrink={0}
      cursor={isCollapsed ? "pointer" : "default"}
      onClick={() => {
        if (isCollapsed) setIsCollapsed(false);
      }}
      _hover={isCollapsed ? { bg: hoverBg } : {}}
    >

      {/* Header & Toggle Button */}
      <Flex justify={isCollapsed ? "center" : "space-between"} align="center" mb={4}>
        {!isCollapsed && <Heading size="md" color={headingColor}>Builder Config</Heading>}
        <IconButton
          aria-label="Toggle Sidebar"
          variant="ghost"
          size="sm"
          color="gray.500"
          _hover={{ bg: hoverBg }}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          {isCollapsed ? <LuPanelLeftOpen size="18px" /> : <LuPanelLeftClose size="18px" />}
        </IconButton>
      </Flex>

      {/* Hide all the heavy content when collapsed */}
      {!isCollapsed && (
        <VStack gap={6} align="stretch" opacity={isCollapsed ? 0 : 1} transition="opacity 0.2s">

          {/* Configuration Section */}
          <Box>
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
                  bg={accordionBg}
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  _hover={{ bg: hoverBg }}
                >
                  <HStack gap={2}>
                    <LuSettings2 size="14px" />
                    <Text fontSize="xs" fontWeight="bold">Advanced Configuration</Text>
                  </HStack>
                  {isAdvancedOpen ? <LuChevronUp size="14px" /> : <LuChevronDown size="14px" />}
                </Flex>

                {/* Collapsible Advanced Settings */}
                {isAdvancedOpen && (
                  <Stack p={3} gap={3} borderTop="1px solid" borderColor={borderColor}>
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={2}>Included Positions</Text>
                      <VStack align="stretch" gap={2}>
                        {/* Select All Positions Checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={selectAllPositions}
                            onChange={(e) => onSelectAllPositionsChange(e.target.checked)}
                            style={{ marginRight: '8px', cursor: 'pointer' }}
                          />
                          Generate for ALL positions
                        </label>

                        {/* Drop Down for Position Sections */}
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

                    {/* Ignore Pending Time Off Requests Checkbox */}
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectIgnorePending}
                        onChange={(e) => onSelectIgnorePendingChange(e.target.checked)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      Ignore Pending Time Off Requests?
                    </label>

                    {/* Settings for Minimum Days Off */}
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

                    {/* Settings for Maximum Days Off */}
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1} color="gray.500">Max Days Off Between Duty</Text>
                      <Input
                        type="number"
                        size="sm"
                        min={0}
                        max={10}
                        value={maxDaysOff}
                        onChange={(e) => onMaxDaysOffChange(e.target.value)}
                        border="2px solid"
                        borderColor={borderColor}
                        borderRadius="sm"
                      />
                    </Box>

                    {/* Settings for max steps for annealing process to perform */}
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

          {/* Action Section */}
          <Box display="flex" flexDirection="column" gap={3}>
            <Button
              colorPalette="blue"
              variant="outline"
              w="100%"
              onClick={onBuildSkeleton}
              loading={isGenerating}
              disabled={isGenerating}
            >
              Build Skeleton
            </Button>

            {hasSkeleton && (
                <Text fontSize="xs" color="gray.500" textAlign="center">
                  Modify parameters to build a new skeleton.
                </Text>
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
      )}
    </Box>
  );
};

export default BuilderSidebar;