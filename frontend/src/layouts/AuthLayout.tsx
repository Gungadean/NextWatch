/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AuthLayout.tsx
 *
 * Defines layout for the login and register pages.
 */

import React from 'react';
import {
  Flex,
  Box,
  Stack,
  Heading, IconButton,
} from '@chakra-ui/react';
import {useColorMode, useColorModeValue} from "../components/ui/color-mode.tsx";
import {LuMoon, LuSun} from "react-icons/lu";

/**
 * Props that will be passed to the Forms.
 */
interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Main auth layout component.
 * Wraps register and login forms for uniformity.
 */
export const AuthLayout = ({ title, children }: AuthLayoutProps) => {
  const { toggleColorMode, colorMode } = useColorMode();

  const cardBackground = useColorModeValue("white", "gray.900");

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
    >
      <Box position="absolute" top={4} right={4}>
        <IconButton
          onClick={toggleColorMode}
          variant="outline"
          size="sm">
          {colorMode === "light" ? <LuSun /> : <LuMoon />}
        </IconButton>
      </Box>

      <Stack gap="8" mx="auto" maxW="lg" paddingY="12" paddingX="6">
        <Stack align="center">
          <Heading size="2xl">{title}</Heading>
        </Stack>

        <Box
          rounded="lg"
          background={cardBackground}
          boxShadow="lg"
          padding="8"
          minW={{ base: "90vw", md: "400px" }}
        >
          {children}
        </Box>
      </Stack>
    </Flex>
  );
};

export default AuthLayout;