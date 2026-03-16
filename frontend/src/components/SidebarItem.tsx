/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * SidebarItem.tsx
 *
 * Navigation link elements for displaying in sidebar.
 * Supports adding sub-menus with accordion behavior.
 */

import {NavLink, useLocation} from "react-router";
import {useColorModeValue} from "./ui/color-mode.tsx";
import {Box, Collapsible, Flex, Icon, Text} from "@chakra-ui/react";
import type {IconType} from "react-icons";
import {Tooltip} from "./ui/tooltip.tsx";
import {useState} from "react";
import {LuChevronDown, LuChevronRight} from "react-icons/lu";

/**
 * Props for the SidebarItem component.
 */
interface SidebarItemProps {
  icon: IconType;
  children: string;
  to?: string;
  isCollapsed: boolean;
  subItems?: SubItem[];
  onExpandSidebar?: () => void;
}

export interface SubItem {
  name: string;
  path: string;
}

/**
 * A single navigation link within the Sidebar.
 *
 * Behavior:
 * - **Expanded**: Displays Icon + Text Label.
 * - **Collapsed**: Displays Icon only. Shows a Tooltip with the label on hover.
 * - **Active State**: Highlights with a brand color background when the current route matches `to`.
 */
const SidebarItem = ({ icon, to, children, isCollapsed, subItems, onExpandSidebar }: SidebarItemProps ) => {
  const location = useLocation();

  const isSubItemActive = subItems?.some(sub => location.pathname === sub.path) || false;

  const [isOpen, setIsOpen] = useState(isSubItemActive);

  const displayOpen = isOpen && !isCollapsed;

  const activeBackground = useColorModeValue("blue.100", "blue.900")
  const activeColor = useColorModeValue("blue.700", "blue.200")
  const hoverBackground = useColorModeValue("gray.100", "whiteAlpha.200")

  const treeLineColor = useColorModeValue("gray.200", "gray.700");

  const handleGroupClick = () => {
    if (isCollapsed && onExpandSidebar) {
      onExpandSidebar();
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const renderContent = (isActive: boolean) => (
    <Flex
      align="center"
      p={3}
      mx="auto"
      borderRadius="md"
      cursor="pointer"
      bg={isActive ? activeBackground : "transparent"}
      color={isActive ? activeColor : "inherit"}
      _hover={{ bg: isActive ? activeBackground : hoverBackground }}
      justify={isCollapsed ? "center" : "space-between"}
      transition="all 0.2s"
    >
      <Flex align="center" justify={isCollapsed ? "center" : "flex-start"}>
        <Icon as={icon} fontSize="20" mr={isCollapsed ? 0 : 4}/>
        {!isCollapsed && (
          <Text fontWeight="medium" whiteSpace="nowrap">
            {children}
          </Text>
        )}
      </Flex>

      {/* Show Chevron for groups when sidebar is expanded */}
      {!isCollapsed && subItems && (
        <Icon as={isOpen ? LuChevronDown : LuChevronRight} fontSize="16" />
      )}
    </Flex>
  );

  {/* Create an item that expands with sub items of similar purpose */}
  if (subItems) {
    return (
      <Box w="100%">
        <Tooltip content={isCollapsed ? children : undefined} disabled={!isCollapsed}>
          <Box onClick={handleGroupClick}>
            {renderContent(isSubItemActive)}
          </Box>
        </Tooltip>

        <Collapsible.Root open={displayOpen}>
          <Collapsible.Content>
            <Flex
              direction="column"
              ml={6}
              pl={3}
              mt={1}
              gap={1}
              borderLeft="1px solid"
              borderColor={treeLineColor}
            >
              {subItems.map((sub) => (
                <NavLink key={sub.path} to={sub.path} style={{ textDecoration: 'none', width: '100%' }}>
                  {({ isActive }) => (
                    <Flex
                      align="center"
                      p={2}
                      borderRadius="md"
                      cursor="pointer"
                      bg={isActive ? activeBackground : "transparent"}
                      color={isActive ? activeColor : "gray.500"}
                      _hover={{ bg: isActive ? activeBackground : hoverBackground }}
                      transition="all 0.2s"
                    >
                      <Text fontSize="sm" fontWeight={isActive ? "bold" : "medium"}>
                        {sub.name}
                      </Text>
                    </Flex>
                  )}
                </NavLink>
              ))}
            </Flex>
          </Collapsible.Content>
        </Collapsible.Root>
      </Box>
    );
  }

  return (
    <NavLink to={to || "#"} style={{ textDecoration: 'none', width: '100%' }}>
      {({ isActive }) => (
        <Tooltip content={isCollapsed ? children : undefined} disabled={!isCollapsed}>
          <Box>{renderContent(isActive)}</Box>
        </Tooltip>
      )}
    </NavLink>
  );
};

export default SidebarItem;