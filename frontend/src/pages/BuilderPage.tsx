/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * BuilderPage.tsx
 *
 * Page for building schedules.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Progress,
  Stack,
  Tabs,
  Text,
  VStack,
  Badge,
  Separator, Spinner,
} from "@chakra-ui/react";
import { useColorModeValue } from "../components/ui/color-mode";
import {
  generateScheduleStream,
  type ScheduleResponse,
  getScheduleDraftSummaries, getScheduleDraftSchedule, type DraftSummary, type ScheduleDraft, type Watchstander
} from "../features/schedule/scheduleApi.ts";
import {getEmployeesWithTimeOff, type EmployeeWithTimeOff, type Position} from "../features/personnel/personnelApi";
import {type CalendarEvent, CalendarGrid} from "@/components/CalendarGrid.tsx";
import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {convertToLocalTime, parseDate, toSimpleDate} from "@/utils/timeUtils.ts";
import {getPositionList} from "@/features/position/positionApi.ts";
import ConfirmPublishDraftModal from "@/features/schedule/components/ConfirmPublishDraftModal.tsx";
import ConfirmDeleteDraftModal from "@/features/schedule/components/ConfirmDeleteDraftModal.tsx";
import {toaster} from "@/components/ui/toaster.tsx";

const BuilderPage = () => {
  const [viewMode, setViewMode] = useState<string>("calendar");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  const [isConfirmPublishModalOpen, setConfirmPublishModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);

  const [employees, setEmployees] = useState<EmployeeWithTimeOff[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [draftSummaries, setDraftSummaries] = useState<DraftSummary[]>([]);
  const [currentDraftData, setCurrentDraftData] = useState<ScheduleResponse | ScheduleDraft | null>();
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const nextStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return toSimpleDate(nextStart);
  });

  // Default start date to the first day of next month
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const nextEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return toSimpleDate(nextEnd);
  });

  // Default end date to the last day of next month
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  });

  const sidebarBg = useColorModeValue("gray.50", "gray.900");
  const mainBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "gray.700");
  const buttonBG = useColorModeValue("gray.100", "gray.700");
  const activeCardBorder = "blue.500";

  /**
   * Fetch the data (Personnel, Positions, Draft History) on mount.
   */
  useEffect(() => {
    const parts = startDate.split('-').map(Number);
    setCalendarViewDate(new Date(parts[0], parts[1] - 1, 1));

    const fetchEmployees = async () => {
      try {
        const data = await getEmployeesWithTimeOff();

        setEmployees(data);
      } catch (error) {
        console.error("Failed to load employees", error);
      }
    }

    const fetchDraftSummaries = async () => {
      try {
        const data = await getScheduleDraftSummaries();

        setDraftSummaries(data);
      } catch (error) {
        console.error("Failed to load employees", error);
      }
    }

    const fetchPositions = async () => {
      try {
        const data = await getPositionList();
        setPositions(data);
      } catch (error) {
        console.error("Failed to load positions", error);
      }
    }

    fetchEmployees();
    fetchDraftSummaries();
    fetchPositions();
  }, []);

  const handleGenerate = async () => {
    if (positions.length === 0) {
      toaster.create({ title: "No positions defined. Cannot generate.", type: "error" });
      return;
    }

    setIsGenerating(true);
    setGenProgress(0);
    setCurrentDraftData(null);

    try {
      const requestData = {
        start_date: startDate,
        end_date: endDate,
        position_ids: positions.map(p => p.id),
        min_days_off: 1,
        max_steps: 5000
      };

      await generateScheduleStream(
        requestData,
        (progress) => setGenProgress(progress.percent),
        (result) => {
          setCurrentDraftData(result);

          const newSummary: DraftSummary = {
              public_id: result.draft_id || "Undefined",
              created_at: result.created_at || new Date().toISOString(),
              start_date: startDate,
              end_date: endDate,
              score: result.final_score || -1
          };

          setDraftSummaries(prev => [newSummary, ...prev]);
          setSelectedDraftId(newSummary.public_id);
          setIsGenerating(false);

          setCalendarViewDate(parseDate(startDate));
          toaster.create({ title: "Schedule Generated!", type: "success" });
        },
        (error) => {
          setIsGenerating(false);
          toaster.create({ title: "Generation Error", description: error.message, type: "error" });
        }
      );
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  /**
   * Loads a specific draft from history into the main view.
   */
  const loadDraftDetails = async (id: string) => {
    if (id === selectedDraftId) return; // Don't reload if already selected

    setSelectedDraftId(id);
    setIsLoadingDraft(true);
    setCurrentDraftData(null);

    try {
      const draft_data = await getScheduleDraftSchedule(id);
      setCurrentDraftData(draft_data);

      setStartDate(draft_data.start_date);
      setEndDate(draft_data.end_date);
      setCalendarViewDate(parseDate(draft_data.start_date));
    } catch {
      toaster.create({ title: "Could not load draft details", type: "error" });
    } finally {
      setIsLoadingDraft(false);
    }
  }

  /**
   * Navigates the Calendar view by month.
   */
  const navMonth = (dir: number) => {
      const newDate = new Date(calendarViewDate);
      newDate.setMonth(newDate.getMonth() + dir);

      // Prevent navigating forward/back if there's no data for those months.
      if (parseDate(startDate).getMonth() <= newDate.getMonth()
         && parseDate(endDate).getMonth() >= newDate.getMonth())
      {
        setCalendarViewDate(newDate);
      }
  };

  /**
   * Convert draft data into calendar events for display on CalendarGrid.
   */
  const builderEvents: CalendarEvent[] = useMemo(() => {
    return (currentDraftData?.assignments || []).map(a => ({
        id: `${a.date}-${a.watchstation.id}`,
        date: a.date,
        label: a.watchstation.name.substring(0,3),
        text: (a.watchstander as Watchstander).name || "Unknown",
        color: a.watchstation.color
    }));
  }, [currentDraftData]);

  /**
   * Convert draft data into timeline rows for display on TimelineGrid.
   */
  const timelineRows: TimelineRow[] = useMemo(() => {
    return employees.map(emp => ({
      id: emp.id,
      label: `${emp.last_name}, ${emp.first_name.charAt(0)}.`,
    }));
  }, [employees]);

  /**
   * Convert draft data into timeline items for display on TimelineGrid.
   */
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add time off requests
    employees.forEach(emp => {
      (emp.time_off_requests || [])
        .filter(req => req.status !== "Denied")
        .forEach((req, i) => {
        items.push({
          id: `time-off-${emp.id}-${i}`,
          rowId: emp.id,
          start: req.start_date,
          end: req.end_date,
          label: `Time-Off: ${req.request_type} ${req.status}`,
          color: req.status === "Approved" ? "green" : "gray"
        });
      });
    });

    // Add draft assignments
    if (currentDraftData?.assignments) {
      currentDraftData.assignments.forEach((assign, i) => {
        items.push({
          id: `shift-${i}`,
          rowId: assign.watchstander.id,
          start: assign.date,
          end: assign.date,
          label: `Shift: ${assign.watchstation.name}`,
          color: assign.watchstation.color
        });
      });
    }

    return items;
  }, [employees, currentDraftData]);

  return (
    <Flex h="calc(100vh - 64px)" overflow="hidden" borderRadius="md">
      {/* Left Sidebar: Config and History */}
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
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (startDate > endDate) {
                        setEndDate(e.target.value)
                      }
                    }}
                    bg={mainBg}/>
                  <Text>-</Text>
                  <Input
                    type="date"
                    size="sm"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (endDate < startDate) {
                        setStartDate(e.target.value)
                      }
                    }}
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
              onClick={handleGenerate}
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
                     onClick={() => loadDraftDetails(draft.public_id)}
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

      {/* Main Stage */}
      <Flex flex="1" direction="column" bg={mainBg} overflow="hidden">
        <Flex h="60px" borderBottom="1px solid" borderColor={borderColor} align="center" px={6} justify="space-between">
          <Tabs.Root value={viewMode} onValueChange={(d) => setViewMode(d.value)} variant="plain">
             <Tabs.List bg={buttonBG} p={1} borderRadius="md">
              <Tabs.Trigger
                value="calendar"
                px={3}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">Calendar</Tabs.Trigger>
              <Tabs.Trigger
                value="timeline"
                px={3}
                py={1}
                _selected={{ bg: "white", color: "blue.600", shadow: "sm" }}
                borderRadius="sm">Timeline</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>


          {/* Month Navigation (Calendar Mode Only) */}
          {viewMode === "calendar" && (
            <HStack>
              <Button
                border="1px solid"
                background={buttonBG}
                size="xs"
                variant="ghost"
                onClick={() => navMonth(-1)}>Prev</Button>
              <Text fontWeight="bold" w="120px" textAlign="center">
                  {calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <Button
                border="1px solid"
                background={buttonBG}
                size="xs"
                variant="ghost"
                onClick={() => navMonth(1)}>Next</Button>
            </HStack>
          )}

          {/* Action Buttons */}
          <HStack gap={3}>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="red"
              onClick={() => setConfirmDeleteModalOpen(true)}>Delete Draft</Button>
            <Button
              size="sm"
              colorPalette="green"
              disabled={!selectedDraftId}
              onClick={() => setConfirmPublishModalOpen(true)}>Publish Selected</Button>
          </HStack>
        </Flex>

        {/* Content Area */}
        <Box flex="1" overflow="auto" p={6}>
          {isLoadingDraft ? (
            <Flex h="100%" justify="center" align="center" direction="column">
              <Spinner size="xl" mb={4} />
              <Text color="gray.500">Loading Schedule...</Text>
          </Flex>
          ) : !currentDraftData && viewMode === 'calendar' ? (
             <Flex h="100%" justify="center" align="center" direction="column" color="gray.400">
                <Heading size="md" mb={2}>Ready to Build</Heading>
                <Text>Select date range and generate.</Text>
             </Flex>
          ) : viewMode === "calendar" ? (
             <CalendarGrid
                year={calendarViewDate.getFullYear()}
                month={calendarViewDate.getMonth() + 1}
                events={builderEvents}
              />
          ) : (
             <TimelineGrid
                rangeStart={startDate}
                rangeEnd={endDate}
                rows={timelineRows}
                items={timelineItems}
            />
          )}
        </Box>
      </Flex>

      {/* Modals */}
      <ConfirmPublishDraftModal
        isOpen={isConfirmPublishModalOpen}
        onOpenChange={(e) => setConfirmPublishModalOpen(e.open)}
        draft_id={selectedDraftId ? selectedDraftId : ""}
        drafts={draftSummaries}
        onDraftChange={setDraftSummaries}
        onDraftViewChange={setCurrentDraftData}
      />

      <ConfirmDeleteDraftModal
        isOpen={isConfirmDeleteModalOpen}
        onOpenChange={(e) => setConfirmDeleteModalOpen(e.open)}
        draft_id={selectedDraftId ? selectedDraftId : ""}
        drafts={draftSummaries}
        onDraftChange={setDraftSummaries}
        onDraftViewChange={setCurrentDraftData}
        onSelectedChange={setSelectedDraftId}
        onSetViewChange={setViewMode}
      />
    </Flex>
  );
};

export default BuilderPage;