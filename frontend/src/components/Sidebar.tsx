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
  LuAward,
  LuPinOff
} from "react-icons/lu";
import {useState} from "react";
import {Footer} from "@/components/Footer.tsx";
import {useCurrentUser} from "@/hooks/useAuth.ts";

/**
 * Configuration for sidebar navigation links.
 * maps display names to their respective icons and route paths.
 */
const LINK_ITEMS = [
  { name: 'Dashboard', icon: LuHouse, path: '/' },
  {
    name: 'Schedule Tools',
    icon: LuCalendar,
    adminOnly: true,
    subItems: [
      { name: 'Schedule Generator', path: '/builder' },
      { name: 'Template Settings', path: '/templates' }
    ]
  },
  { name: 'Time-Off Requests', icon: LuClock, path: '/requests' },
  { name: 'Personnel', icon: LuUsers, path: '/personnel' },
  { name: 'Positions', icon: LuAward, path: '/positions' },
  { name: 'User Management', icon: LuUsers, path: '/users', adminOnly: true },
  { name: 'Settings', icon: LuSettings, path: '/settings', adminOnly: true },
];

/**
 * Main application sidebar navigation with collapsible state.
 */
const Sidebar = () => {
  const [isPinned, setIsPinned] = useState(false); // Defaults to slim mode
  const [isHovered, setIsHovered] = useState(false);
  const currentUser = useCurrentUser();

  const isExpanded = isPinned || isHovered;

  const background = useColorModeValue("white", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box
      width={isPinned ? "240px" : "80px"}
      transition="width 0.2s ease"
      height="100%"
      flexShrink={0}
      position="relative"
      zIndex={100}
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        height="100%"
        width={isExpanded ? "240px" : "80px"}
        transition="width 0.2s ease"
        background={background}
        padding="4"
        borderRight="1px solid"
        borderColor={borderColor}
        overflowX="hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        boxShadow={!isPinned && isHovered ? "xl" : "none"}
      >

        <Flex direction="column" h="100%" px={2}>

          {/* Header Section: Logo & Toggle Button */}
          <Flex
            align="stretch"
            justify={isExpanded ? "space-between" : "center"}
            marginBottom={8}
            paddingX={isExpanded ? 2 : 0}>
            {isExpanded && (
              <Text fontSize="xl" fontWeight="extrabold" color="blue.500" whiteSpace="nowrap">
                NextWatch
              </Text>
            )}

            <IconButton
              aria-label={isPinned ? "Unpin Sidebar" : "Pin Sidebar"}
              size="sm"
              variant="ghost"
              onClick={() => setIsPinned(!isPinned)}>
              {isPinned ? <LuPinOff /> : <LuMenu />}
            </IconButton>
          </Flex>

          {/* Navigation Links */}
          <VStack align="stretch" gap={2}>
            {LINK_ITEMS.filter(link => !link.adminOnly || currentUser.role === 'admin').map((link) => (
              <SidebarItem
                key={link.name}
                icon={link.icon}
                to={link.path}
                subItems={link.subItems}
                isCollapsed={!isExpanded}
                onExpandSidebar={() => setIsPinned(true)}
              >
                {link.name}
              </SidebarItem>
            ))}
          </VStack>

          {/* Footer Section */}
          <Box mt="auto" p={4} overflow="hidden">

            {/* Only render the full footer if the sidebar is open */}
            {isExpanded && (
                <Footer />
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
};

export default Sidebar;