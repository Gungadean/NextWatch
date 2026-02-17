/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * RequestPage.tsx
 *
 * The central hub for Leave Management.
 * Allows users to submit time-off requests and Managers/Admins to approve or deny them.
 * Supports both a List view (for processing) and a Timeline view (for conflict checking).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Spinner,
  Table,
  Badge,
  Text,
  VStack,
  Tabs,
  Separator,
  IconButton
} from "@chakra-ui/react";
import { useColorModeValue } from "../components/ui/color-mode";
import { Tooltip } from "../components/ui/tooltip";
import { FaList, FaCalendarAlt } from "react-icons/fa";
import {TimelineGrid, type TimelineItem, type TimelineRow} from "@/components/TimelineGrid.tsx";
import {approveRequest, denyRequest, getRequests, type TimeOffResponse} from "@/features/requests/requestsApi.ts";
import {type Employee, getEmployees} from "@/features/personnel/personnelApi.ts";
import {useCurrentUser} from "@/hooks/useAuth.ts";
import AddRequestModal from "@/features/requests/components/AddRequestModal.tsx";
import {toaster} from "@/components/ui/toaster.tsx";
import {toSimpleDate} from "@/utils/timeUtils.ts";

/**
 * Main Request Management Page.
 */
const RequestPage = () => {
  const [requests, setRequests] = useState<TimeOffResponse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = useCurrentUser();

  const [isSubmitRequestModalOpen, setIsSubmitRequestModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const [viewDate, setViewDate] = useState(new Date());

  const [activeTab, setActiveTab] = useState<string>(
      user.role === 'admin' || user.role === 'manager' ? "Pending" : "My Requests"
  );

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const toggleBg = useColorModeValue("gray.100", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");

  /**
   * Initialization Effect.
   * Loads Employees and Requests in parallel.
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empData, reqData] = await Promise.all([
          getEmployees(),
          getRequests()
        ]);
        setEmployees(empData);
        setRequests(reqData);
      } catch (err: any) {
        toaster.create({
          title: "Fetching Page Data Failed",
          description: err.message,
          type: "error"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Filters requests based on the Active Tab and User Role.
   */
  const filteredRequests = useMemo(() => {
     // Timeline view usually shows everything to spot conflicts, unless user restricts it.
     if (viewMode === "timeline" && activeTab !== "My Requests") {
       return requests.filter(request => request.status === "Approved" || request.status === "Pending");
     }

     switch (activeTab) {
        case "My Requests": return requests.filter(r => r.employee.id === user.id);
        case "Pending": return requests.filter(r => r.status === "Pending");
        case "Approved": return requests.filter(r => r.status === "Approved");
        case "Denied": return requests.filter(r => r.status === "Denied");
        case "All": return requests;
        default: return requests;
     }
  }, [viewMode, activeTab, requests, user.id]);

  /**
   * Generates rows for the Timeline view based on filtered employees.
   */
  const timelineRows: TimelineRow[] = useMemo(() => {
    const uniqueIds = Array.from(new Set(filteredRequests.map(request => request.employee.id)));

    return uniqueIds.map(id => {
        const request = filteredRequests.find(r => r.employee.id === id);
        return {
          id: id,
          label: request?.employee.last_name +
            ", " + request?.employee.first_name + " "
            + request?.employee.middle_name || "Unknown"
        };
    });
  }, [filteredRequests]);

  /**
   * Generates styled items for the Timeline view.
   */
  const timelineItems: TimelineItem[] = useMemo(() => {
    return filteredRequests.map(request => {
        let color = "gray";
        if (request.status === "Approved") color = "green";
        if (request.status === "Pending") color = "orange";
        if (request.status === "Denied") color = "red";

        return {
            id: request.id,
            rowId: request.employee.id,
            start: request.start_date,
            end: request.end_date,
            label: `${request.request_type}`,
            color: color
        };
    });
  }, [filteredRequests]);

  /**
   * Helper to map status strings to Chakra UI color schemes.
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "green";
      case "Denied": return "red";
      case "Pending": return "orange";
      default: return "gray";
    }
  };

  /**
   * Handles Approve/Deny actions.
   * Optimistically updates local state to reflect the change immediately.
   */
  const handleAction = async (id: number, action: "Approved" | "Denied") => {
    try {
      if (action === "Approved") {
        await approveRequest(id);
      } else {
        await denyRequest(id);
      }

      // Optimistic Update
      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, status: action } : req
      ));

      toaster.create({ title: `Request ${action}`, type: "success" });
    } catch (error: any) {
      toaster.create({ title: "Action Failed", description: error.message, type: "error" });
    }
  };

  /**
   * Moves the timeline view window by one month.
   */
  const handleMonthChange = (direction: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setViewDate(newDate);
  };

  /**
   * Calculate start/end dates for the TimelineGrid based on current viewDate
   */
  const timelineRange = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    return {
      start: toSimpleDate(start),
      end: toSimpleDate(end)
    };
  }, [viewDate]);

  if (isLoading) {
    return (
      <Center h="100vh" bg={pageBg}>
        <VStack>
          <Spinner size="xl" color="blue.500"/>
          <Text color="gray.500">Loading Requests...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box bg={pageBg} h="calc(100vh - 64px)" p={6} overflow="hidden">
      <VStack gap={4} h="100%" align="stretch">

        {/* Header Toolbar */}
        <Flex
          justify="space-between"
          align="center"
          bg={cardBg}
          p={2}
          px={4}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          shadow="sm"
        >
          <HStack gap={4}>
             <Heading size="md">Leave Tracker</Heading>
             <Separator orientation="vertical" h="20px" />

             {/* Workflow Tabs */}
             <Tabs.Root value={activeTab} onValueChange={(d) => setActiveTab(d.value)} variant="plain">
                <Tabs.List bg="transparent">
                  {/* Only show these filters in the list view */}
                  {viewMode === "list" && (
                    <>
                      <Tabs.Trigger value="Pending" _selected={{ color: "orange.600", fontWeight: "bold" }}>
                        Inbox ({requests.filter(r => r.status === "Pending").length})
                      </Tabs.Trigger>
                      <Tabs.Trigger value="Approved" _selected={{ color: "green.600", fontWeight: "bold" }}>
                        Approved
                      </Tabs.Trigger>
                      <Tabs.Trigger value="Denied" _selected={{ color: "red.600", fontWeight: "bold" }}>
                        Denied
                      </Tabs.Trigger>
                      <Tabs.Trigger value="All" _selected={{ color: "blue.600", fontWeight: "bold" }}>
                        All
                      </Tabs.Trigger>
                    </>
                  )}

                  {/* Show "My Requests" in both views */}
                  <Tabs.Trigger
                    value="My Requests"
                    _selected={{ color: "purple.600", fontWeight: "bold" }}
                    onClick={(e) => {
                      // If we are in timeline view AND this tab is already active...
                      if (viewMode === 'timeline' && activeTab === 'My Requests') {
                        // Stop the Tabs component from doing its normal logic
                        e.preventDefault();
                        // "Deselect" by switching back to 'All' (which shows the full team timeline)
                        setActiveTab("All");
                      }
                    }}
                  >
                    My Requests
                  </Tabs.Trigger>
                </Tabs.List>
             </Tabs.Root>
          </HStack>

          <HStack>
             {/* View Switcher (List vs Timeline) */}
             <HStack gap={0} bg={toggleBg} p={1} borderRadius="md" mr={2}>
                <IconButton
                    aria-label="List View"
                    size="sm"
                    variant={viewMode === "list" ? "solid" : "ghost"}
                    colorPalette={viewMode === "list" ? "blue" : "gray"}
                    onClick={() => setViewMode("list")}
                >
                    <FaList />
                </IconButton>
                <IconButton
                    aria-label="Timeline View"
                    size="sm"
                    variant={viewMode === "timeline" ? "solid" : "ghost"}
                    colorPalette={viewMode === "timeline" ? "blue" : "gray"}
                    onClick={() => setViewMode("timeline")}
                >
                    <FaCalendarAlt />
                </IconButton>
            </HStack>

            <Button size="sm" colorPalette="blue" onClick={() => setIsSubmitRequestModalOpen(true)}>
                New Request
            </Button>
          </HStack>
        </Flex>

        {/* Main Content Area */}
        <Box
          flex="1"
          bg={cardBg}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
          shadow="sm"
          p={viewMode === 'timeline' ? 4 : 0}
        >

          {viewMode === 'list' ? (
            // List View
            <Table.ScrollArea h="100%">
                <Table.Root size="sm" stickyHeader interactive>
                <Table.Header>
                    <Table.Row bg={tableHeaderBg}>
                    <Table.ColumnHeader>Member</Table.ColumnHeader>
                    <Table.ColumnHeader>Dates</Table.ColumnHeader>
                    <Table.ColumnHeader>Type</Table.ColumnHeader>
                    <Table.ColumnHeader>Reason</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {filteredRequests.length === 0 ? (
                        <Table.Row>
                            <Table.Cell colSpan={6} textAlign="center" py={10} color="gray.500">
                                No {activeTab.toLowerCase()} requests found.
                            </Table.Cell>
                        </Table.Row>
                    ) : (
                        filteredRequests.map((request) => (
                        <Table.Row key={request.id}>
                            <Table.Cell fontWeight="bold">
                              {request.employee.last_name}, {request.employee.first_name}
                            </Table.Cell>
                            <Table.Cell>
                                <VStack align="start" gap={0}>
                                    <Text>{request.start_date} <Text as="span" color="gray.400">→</Text> {request.end_date}</Text>
                                </VStack>
                            </Table.Cell>
                            <Table.Cell>
                                <Badge variant="outline">{request.request_type}</Badge>
                            </Table.Cell>
                            <Table.Cell maxW="300px" truncate>
                                {request.request_type || "-"}
                            </Table.Cell>
                            <Table.Cell>
                                <Badge colorPalette={getStatusColor(request.status)} variant="subtle">
                                    {request.status}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                                {request.status === "Pending" && (user.role === 'admin' || user.role === 'manager') ? (
                                    <HStack justify="end" gap={2}>
                                        <Tooltip content="Approve Request">
                                            <Button
                                              size="xs"
                                              colorPalette="green"
                                              variant="surface"
                                              onClick={() => handleAction(request.id, "Approved")}
                                            >
                                              Approve
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Deny Request">
                                            <Button
                                              size="xs"
                                              colorPalette="red"
                                              variant="ghost"
                                              onClick={() => handleAction(request.id, "Denied")}
                                            >
                                              Deny
                                            </Button>
                                        </Tooltip>
                                    </HStack>
                                ) : (
                                    <Text fontSize="xs" color="gray.400">
                                      {request.status === "Pending" ? "Pending Review" : "Archived"}
                                    </Text>
                                )}
                            </Table.Cell>
                        </Table.Row>
                        ))
                    )}
                </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
          ) : (
            // --- TIMELINE VIEW ---
            <VStack align="stretch" h="100%">
                {/* Month Controls */}
                <Flex justify="center" align="center" mb={2}>
                    <Button size="xs" variant="ghost" onClick={() => handleMonthChange(-1)}>Prev</Button>
                    <Text fontWeight="bold" mx={4} w="150px" textAlign="center">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Button size="xs" variant="ghost" onClick={() => handleMonthChange(1)}>Next</Button>
                </Flex>

                <Box flex="1" overflowY="auto">
                    <TimelineGrid
                        rangeStart={timelineRange.start}
                        rangeEnd={timelineRange.end}
                        rows={timelineRows}
                        items={timelineItems}
                    />
                </Box>
            </VStack>
          )}
        </Box>
      </VStack>

      {/* Modals */}
      <AddRequestModal
        isOpen={isSubmitRequestModalOpen}
        onOpenChange={(e) => setIsSubmitRequestModalOpen(e.open)}
        employees={employees}
        requests={requests}
        onRequestsChange={setRequests}
      />
    </Box>
  );
};

export default RequestPage;