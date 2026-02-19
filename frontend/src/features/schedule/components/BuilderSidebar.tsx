/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Progress,
  Separator,
  Stack,
  Text,
  VStack
} from "@chakra-ui/react";
import {useColorModeValue} from "@/components/ui/color-mode.tsx";
import {type DraftSummary} from "@/features/schedule/scheduleApi.ts";
import {convertToLocalTime} from "@/utils/timeUtils.ts";

/**
 * BuilderSidebar.tsx
 *
 * Configuration sidebar for builder component.
 */

/**
 * Props for the Builder Sidebar.
 */
interface BuilderSidebarProps {
  mainBg: string;
  borderColor: string;

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