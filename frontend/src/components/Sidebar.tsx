/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * Sidebar.tsx
 *
 * Display collapsible sidebar with navigation buttons.
 */

import {Box, Flex, IconButton, Text, VStack} from "@chakra-ui/react";
import {useColorModeValue} from "./ui/color-mode.tsx";
import SidebarItem from "./SidebarItem.tsx";
import {
  LuHouse,
  LuCalendar,
  LuClock,
  LuUsers,
  LuSettings,
  LuMenu,
  LuAward
} from "react-icons/lu";
import {useState} from "react";

const LINK_ITEMS = [
  { name: 'Dashboard', icon: LuHouse, path: '/' },
  { name: 'Schedule Builder', icon: LuCalendar, path: '/builder' },
  { name: 'Leave Requests', icon: LuClock, path: '/requests' },
  { name: 'Personnel', icon: LuUsers, path: '/personnel' },
  { name: 'Qualifications', icon: LuAward, path: '/qualifications' },
  { name: 'Settings', icon: LuSettings, path: '/settings' },
];

/**
 * Main application sidebar.
 * Contains buttons for navigating the different pages.
 */
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const background = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box
      width={isCollapsed ? "80px" : "240px"}
      transition="width 0.2s ease"
      height="100%"
      background={background}
      padding="4"
      borderRight="1px solid"
      borderColor={borderColor}
      overflowX="hidden">

      <Flex direction="column" h="100%" px={2}>

        <Flex
          align="stretch"
          justify={isCollapsed ? "center" : "space-between"}
          marginBottom={8}
          paddingX={isCollapsed ? 0 : 2}>
          {!isCollapsed && (
            <Text fontSize="xl" fontWeight="extrabold" color="blue.500">
              NextWatch
            </Text>
          )}

          <IconButton
            aria-label="Toggle Sidebar"
            size="sm"
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}>
            <LuMenu />
          </IconButton>
        </Flex>

        <VStack>
          {LINK_ITEMS.map((link) => (
            <SidebarItem
              key={link.name}
              icon={link.icon}
              to={link.path}
              isCollapsed={isCollapsed}
            >
              {link.name}
            </SidebarItem>
          ))}
        </VStack>
      </Flex>
    </Box>
  )
};

export default Sidebar;