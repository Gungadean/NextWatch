/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * SidebarItem.tsx
 *
 * Navigation link elements for displaying in sidebar.
 */

import {NavLink} from "react-router";
import {useColorModeValue} from "./ui/color-mode.tsx";
import {Flex, Icon, Text} from "@chakra-ui/react";
import type {IconType} from "react-icons";
import {Tooltip} from "./ui/tooltip.tsx";

interface SidebarItemProps {
  icon: IconType;
  children: string;
  to: string;
  isCollapsed: boolean;
}

/**
 * Main sidebar navigation item.
 * Handles dynamically creating nav buttons that are collapsible.
 * @param icon Page icon
 * @param to Path to direct to
 * @param children Children elements to be displayed inside
 * @param isCollapsed If the sidebar is currently collapsed.
 */
const SidebarItem = ({ icon, to, children, isCollapsed }: SidebarItemProps ) => {
  const activeBackground = useColorModeValue("blue.100", "blue.900")
  const activeColor = useColorModeValue("blue.700", "blue.200")
  const hoverBackground = useColorModeValue("gray.100", "whiteAlpha.200")

  return (
    <NavLink to={to} style={{ textDecoration: 'none', width: '100%' }}>
      {({ isActive }) => (
        <Tooltip content={isCollapsed ? children : undefined} disabled={!isCollapsed}>
          <Flex
            align="center"
            p={3}
            mx="auto"
            borderRadius="md"
            cursor="pointer"
            bg={isActive ? activeBackground : "transparent"}
            color={isActive ? activeColor : "inherit"}
            _hover={{ bg: isActive ? activeBackground : hoverBackground }}
            justify={isCollapsed ? "center" : "flex-start"}
            transition="all 0.2s"
          >
            <Icon
              as={icon}
              fontSize="20"
              mr={isCollapsed ? 0 : 4}/>

            {!isCollapsed && (
              <Text fontWeight="medium" whiteSpace="nowrap">
                {children}
              </Text>
            )}
          </Flex>
        </Tooltip>
      )}
    </NavLink>
  );
};

export default SidebarItem;