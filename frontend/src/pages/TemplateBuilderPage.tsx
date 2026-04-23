/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * TemplateBuilderPage.tsx
 *
 * Page for building and assigning templates.
 */

import {useEffect, useState} from "react";
import {Box, Flex, Text, Button, Input, Badge, Spinner, Grid} from "@chakra-ui/react";
import { useColorModeValue } from "@/components/ui/color-mode.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {getErrorMessage} from "@/utils/errorUtils.ts";
import {
  createPositionRequirement,
  deletePositionRequirement,
  getPositionList,
  type PositionRequirementCreate,
  type PositionRequirementRead,
  type PositionWithRequirementsRead
} from "@/features/position/positionApi.ts";
import {
  createShiftTemplate, deleteShiftTemplate,
  getShiftTemplates,
  type ShiftTemplateCreate,
  type ShiftTemplateRead
} from "@/features/schedule/scheduleApi.ts";

interface DayOption {
  label: string;
  value: number;
}

const DAYS_OF_WEEK: DayOption[] = [
  { label: "M", value: 0 },
  { label: "T", value: 1 },
  { label: "W", value: 2 },
  { label: "T", value: 3 },
  { label: "F", value: 4 },
  { label: "S", value: 5 },
  { label: "S", value: 6 },
];

/**
 * Main component for template builder page.
 */
export default function TemplateBuilderPage() {
  const background = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const itemBg = useColorModeValue("gray.50", "gray.700");
  const hoverBg = useColorModeValue("gray.100", "gray.600");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const mutedText = useColorModeValue("gray.500", "gray.400");
  const subText = useColorModeValue("gray.600", "gray.300");
  const textColor = useColorModeValue("black", "white");

  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<ShiftTemplateRead[]>([]);
  const [positions, setPositions] = useState<PositionWithRequirementsRead[]>([]);

  const [isTimeBlockModalOpen, setTimeBlockModalOpen] = useState(false);
  const [newTimeBlock, setNewTimeBlock] = useState<ShiftTemplateCreate>({
    name: "",
    start_time: "",
    end_time: ""
  });

  const [isReqModalOpen, setReqModalOpen] = useState(false);
  const [activePositionId, setActivePositionId] = useState<number | null>(null);

  const [newReq, setNewReq] = useState({
    shift_template_id: "",
    count: 1,
    applies_on_days: [0, 1, 2, 3, 4] as number[],
    is_fixed: false
  });

  useEffect(() => {
    const fetchTemplateData = async () => {
      setIsLoading(true);
      try {
         const [templateData, positionData] = await Promise.all([
           getShiftTemplates(),
           getPositionList()
        ]);
        setTemplates(templateData);
        setPositions(positionData);
      } catch (error) {
        toaster.create({
          title: "Failed to load templates",
          description: getErrorMessage(error, "An error has occurred while fetching backend data."),
          type: "error" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplateData();
  }, []);

  /**
   * Perform checks on user data and then add the template using the backend endpoint.
   */
  const handleSaveTimeBlock = async () => {
    if (!newTimeBlock.name || !newTimeBlock.start_time || !newTimeBlock.end_time) {
      toaster.create({
        title: "Validation Error",
        description: "Please fill out all fields.",
        type: "warning" });
      return;
    }

    try {
      const savedBlock = await createShiftTemplate(newTimeBlock);
      setTemplates([...templates, savedBlock]);

      setTimeBlockModalOpen(false);
      setNewTimeBlock({ name: "", start_time: "", end_time: "" });
      toaster.create({
        title: "Time Block Saved",
        type: "success"
      });
    } catch (error) {
      toaster.create({
        title: "Save Failed",
        description: getErrorMessage(error, "An error occurred causing the time block saving to fail."),
        type: "error"
      });
    }
  };

  /**
   * Assign a requirement of a specific timeblock to a position.
   */
  const handleSaveRequirement = async () => {
    if (!activePositionId || !newReq.shift_template_id) {
      toaster.create({
        title: "Validation Error",
        description: "Please select a time block.",
        type: "warning"
      });
      return;
    }

    if (newReq.applies_on_days.length === 0) {
      toaster.create({
        title: "Validation Error",
        description: "Shift must apply to at least one day of the week.",
        type: "warning"
      });
      return;
    }

    const apiPayload: PositionRequirementCreate = {
      shift_template_id: Number(newReq.shift_template_id),
      count: newReq.is_fixed ? 1 : newReq.count,
      applies_on_days: newReq.applies_on_days,
      is_fixed: newReq.is_fixed
    };

    try {
      const savedReq = await createPositionRequirement(activePositionId, apiPayload);

      setPositions(positions.map(pos => {
        if (pos.id === activePositionId) {
          return { ...pos, requirements: [...pos.requirements, savedReq as PositionRequirementRead] };
        }
        return pos;
      }));

      setReqModalOpen(false);
      setNewReq({ shift_template_id: "", count: 1, applies_on_days: [0, 1, 2, 3, 4], is_fixed: false });
      toaster.create({
        title: "Requirement Added",
        type: "success"
      });
    } catch (error) {
      toaster.create({
        title: "Save Failed",
        description: getErrorMessage(error, ""),
        type: "error"
      });
    }
  };

  /**
   * Handle removing a requirement for a position.
   */
  const handleDeleteRequirement = async (posId: number, reqId: number) => {
    try {
      await deletePositionRequirement(posId, reqId);

      setPositions(positions.map(pos => {
        if (pos.id === posId) return { ...pos, requirements: pos.requirements.filter(r => r.id !== reqId) };
        return pos;
      }));
    } catch (error) {
       toaster.create({
         title: "Delete Failed",
         description: getErrorMessage(error, ""),
         type: "error"
       });
    }
  }

  /**
   * Handle deleting a time block.
   */
  const handleDeleteTemplate = async (temId: number) => {
    if (positions.some(pos => pos.requirements.some(req => req.shift_template_id === temId))) {
      toaster.create({
        title: "Delete Template",
        description: "You cannot delete a template that is in use.",
        type: "error"
      })
      return;
    }

    try {
      await deleteShiftTemplate(temId);
      setTemplates(templates.filter(tem => tem.id !== temId));
    } catch (error) {
      toaster.create({
        title: "Delete Failed",
        description: getErrorMessage(error, ""),
        type: "error"
      })
    }
  };

  /**
   * Toggle individual days in the new requirement array.
   */
  const handleToggleDay = (dayValue: number): void => {
    setNewReq((prev) => {
      const currentDays = prev.applies_on_days;
      if (currentDays.includes(dayValue)) {
        return { ...prev, applies_on_days: currentDays.filter(d => d !== dayValue) };
      } else {
        return { ...prev, applies_on_days: [...currentDays, dayValue].sort() };
      }
    });
  };

  /**
   * Determine correct badge to render based on the days array and is_fixed flag.
   */
  const renderBadges = (req: PositionRequirementRead) => {
      const reqDays: number[] = req.applies_on_days || [];
      const isFixed: boolean = req.is_fixed || false;

      let daysLabel = "No Days";
      if (reqDays.length === 7) daysLabel = "Everyday";
      else if (reqDays.length === 5 && reqDays.every(d => [0,1,2,3,4].includes(d))) daysLabel = "Weekdays";
      else if (reqDays.length === 2 && reqDays.every(d => [5,6].includes(d))) daysLabel = "Weekends";
      else if (reqDays.length > 0) daysLabel = reqDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ");

      return (
        <Flex gap={2}>
          <Badge colorPalette="blue" variant="subtle">{daysLabel}</Badge>
          {isFixed && <Badge colorPalette="purple" variant="solid">Fixed Schedule</Badge>}
        </Flex>
      );
  };

  if (isLoading) {
    return <Flex h="100%" w="100%" align="center" justify="center"><Spinner size="xl" /></Flex>;
  }

  return (
    <Box h="100%" w="100%" p={6} overflowY="auto" bg={background}>

      {/* Grid layout for two columns */}
      <Grid templateColumns={{ base: "1fr", lg: "350px 1fr" }} gap={8} alignItems="start" h="100%" maxW="1600px" mx="auto">

        {/* Shift Time Blocks Library */}
        <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" p={6} bg={cardBg} shadow="sm" h="fit-content" position="sticky" top="6">
          <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>Time Blocks</Text>
              <Text color={mutedText} fontSize="sm">Standard schedule periods.</Text>
            </Box>
            <Button colorPalette="blue" size="sm" onClick={() => setTimeBlockModalOpen(true)}>
              + New Block
            </Button>
          </Flex>

          <Flex direction="column" gap={3}>
            {templates.length === 0 && <Text color={mutedText} fontSize="sm" fontStyle="italic">No time blocks created yet.</Text>}
            {templates.map((tpl) => (
              <Flex key={tpl.id} borderWidth="1px" borderColor={borderColor} borderRadius="md" p={3} justify="space-between" align="center" bg={itemBg}>
                <Box>
                  <Text fontWeight="semibold" color={textColor}>{tpl.name}</Text>
                  <Text color={subText} fontSize="sm">{tpl.start_time} - {tpl.end_time}</Text>
                </Box>
                <Button colorPalette="red" size="sm" onClick={() => handleDeleteTemplate(tpl.id)}>X</Button>
              </Flex>
            ))}
          </Flex>
        </Box>

        {/* Position Configuration */}
        <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" p={6} bg={cardBg} shadow="sm" minH="500px">
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Text fontSize="xl" fontWeight="bold" color={textColor}>Position Requirements</Text>
              <Text color={mutedText} fontSize="sm">Map your time blocks to specific positions to build the shift skeleton.</Text>
            </Box>
          </Flex>

          <Flex direction="column" gap={6}>
            {positions.map((pos) => {
              return (
                <Box key={pos.id} borderWidth="1px" borderColor={borderColor} borderRadius="md" overflow="hidden">
                  <Flex
                    bg={`${pos.color}.50`}
                    _dark={{bg: `${pos.color}.900`}}
                    p={4}
                    justify="space-between"
                    align="center"
                    borderBottomWidth="1px"
                    borderColor={borderColor}>
                    <Flex align="center" gap={3}>
                      <Box w={3} h={3} borderRadius="full" bg={`${pos.color}.500`} />
                      <Text fontWeight="bold" fontSize="lg" color={textColor}>{pos.name}</Text>
                    </Flex>
                    <Button size="xs" variant="outline" colorPalette="gray" onClick={() => { setActivePositionId(pos.id); setReqModalOpen(true); }}>
                      + Add Requirement
                    </Button>
                  </Flex>

                  <Box p={0} bg={cardBg}>
                    {pos.requirements.length === 0 ? (
                      <Box p={4}>
                         <Text color={mutedText} fontSize="sm" fontStyle="italic">No shifts assigned to this position yet.</Text>
                      </Box>
                    ) : (
                      <Flex direction="column">
                        {pos.requirements.map((req, index) => {
                          const tpl = templates.find(t => t.id === req.shift_template_id);
                          // Determine if this requirement is a fixed schedule
                          const isFixed = req.is_fixed || false;

                          return (
                            <Flex
                                key={req.id}
                                justify="space-between"
                                align="center"
                                p={4}
                                borderBottom={index === pos.requirements.length - 1 ? "none" : "1px solid"}
                                borderColor={borderColor}
                                _hover={{ bg: hoverBg }}
                                transition="background 0.2s"
                            >
                              <Box>
                                <Flex align="center" gap={3}>
                                    <Text fontWeight="bold" color={textColor}>{tpl?.name || "Unknown Shift"}</Text>
                                    {renderBadges(req)}
                                </Flex>
                                <Text fontSize="sm" color={mutedText} mt={1}>{tpl?.start_time} - {tpl?.end_time}</Text>
                              </Box>

                              <Flex align="center" gap={6}>
                                <Flex align="center" gap={3}>
                                  {!isFixed && (
                                    <>
                                      <Text fontSize="sm" fontWeight="medium" color={subText}>Headcount:</Text>
                                      <Badge size="lg" colorPalette="gray" px={3}>{req.count}</Badge>
                                    </>
                                  )}
                                </Flex>
                                <Button size="xs" colorPalette="red" variant="ghost" onClick={() => handleDeleteRequirement(pos.id, req.id)}>Remove</Button>
                              </Flex>
                            </Flex>
                          );
                        })}
                      </Flex>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Flex>
        </Box>
      </Grid>

      {/* Time Block Modal */}
      {isTimeBlockModalOpen && (
        <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.600" zIndex="1000" display="flex" alignItems="center" justifyContent="center">
          <Box bg={cardBg} p={6} borderRadius="md" w="400px" shadow="lg" borderWidth="1px" borderColor={borderColor}>
            <Text fontSize="xl" fontWeight="bold" mb={4} color={textColor}>Create Shift Time Block</Text>
            <Flex direction="column" gap={4}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Block Name</Text>
                <Input placeholder="e.g. Midwatch" value={newTimeBlock.name} onChange={(e) => setNewTimeBlock({...newTimeBlock, name: e.target.value})} borderColor={borderColor} color={textColor} />
              </Box>
              <Flex gap={4}>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Start Time</Text>
                  <Input type="time" value={newTimeBlock.start_time} onChange={(e) => setNewTimeBlock({...newTimeBlock, start_time: e.target.value})} borderColor={borderColor} color={textColor} />
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>End Time</Text>
                  <Input type="time" value={newTimeBlock.end_time} onChange={(e) => setNewTimeBlock({...newTimeBlock, end_time: e.target.value})} borderColor={borderColor} color={textColor} />
                </Box>
              </Flex>
            </Flex>
            <Flex justify="flex-end" mt={6} gap={2}>
              <Button variant="ghost" onClick={() => setTimeBlockModalOpen(false)} color={textColor}>Cancel</Button>
              <Button colorPalette="blue" onClick={handleSaveTimeBlock}>Save Block</Button>
            </Flex>
          </Box>
        </Box>
      )}

      {/* Requirement Modal */}
      {isReqModalOpen && (
        <Box position="fixed" top="0" left="0" w="100vw" h="100vh" bg="blackAlpha.600" zIndex="1000" display="flex" alignItems="center" justifyContent="center">
          <Box bg={cardBg} p={6} borderRadius="md" w="400px" shadow="lg" borderWidth="1px" borderColor={borderColor}>
            <Text fontSize="xl" fontWeight="bold" mb={4} color={textColor}>Add Shift to Position</Text>
            <Flex direction="column" gap={4}>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Select Time Block</Text>
                <select
                  style={{ width: '100%', padding: '8px', border: `1px solid var(--chakra-colors-${borderColor.replace('.', '-')})`, borderRadius: '6px', backgroundColor: 'transparent', color: 'inherit' }}
                  value={newReq.shift_template_id}
                  onChange={(e) => setNewReq({...newReq, shift_template_id: e.target.value})}
                >
                  <option value="" disabled style={{ color: 'gray' }}>Select a block...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.name} ({t.start_time} - {t.end_time})</option>
                  ))}
                </select>
              </Box>

              {/* Conditionally render Headcount */}
              {!newReq.is_fixed && (
                <Flex gap={4}>
                  <Box flex="1">
                      <Text fontSize="sm" fontWeight="medium" mb={1} color={textColor}>Headcount</Text>
                      <Input type="number" min={1} value={newReq.count} onChange={(e) => setNewReq({...newReq, count: Number(e.target.value)})} borderColor={borderColor} color={textColor} />
                  </Box>
                </Flex>
              )}

              {/* Active Days Toggles */}
              <Box mt={2}>
                  <Text fontSize="sm" fontWeight="medium" mb={2} color={textColor}>Active Days</Text>
                  <Flex gap={2}>
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={`${day.label}-${day.value}`}
                        size="sm"
                        variant={newReq.applies_on_days.includes(day.value) ? "solid" : "outline"}
                        colorPalette={newReq.applies_on_days.includes(day.value) ? "blue" : "gray"}
                        onClick={() => handleToggleDay(day.value)}
                        borderRadius="full"
                        width="36px"
                        height="36px"
                        padding={0}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </Flex>
              </Box>

              {/* Fixed Schedule Toggle */}
              <Box mt={2}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', color: textColor }}>
                  <input
                    type="checkbox"
                    checked={newReq.is_fixed}
                    onChange={(e) => setNewReq({...newReq, is_fixed: e.target.checked})}
                    style={{ width: '16px', height: '16px', marginTop: '4px' }}
                  />
                  <Box>
                    <Text fontWeight="bold">Fixed Schedule</Text>
                    <Text fontSize="xs" color={mutedText}>
                      Checking this assigns everyone in this role directly, bypassing optimization.
                    </Text>
                  </Box>
                </label>
              </Box>

            </Flex>
            <Flex justify="flex-end" mt={6} gap={2}>
              <Button variant="ghost" onClick={() => setReqModalOpen(false)} color={textColor}>Cancel</Button>
              <Button colorPalette="blue" onClick={handleSaveRequirement}>Assign Shift</Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  );
}