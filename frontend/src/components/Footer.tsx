/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * Footer.tsx
 *
 * Footer for displaying version info.
 */

import {Box, Text} from "@chakra-ui/react";

/**
 * Main footer component
 */
export const Footer = () => {
  // In Vite: import.meta.env
  // In Create-React-App: process.env
  const version = import.meta.env.VITE_APP_VERSION;

  return (
    <Box as="footer" py={4} textAlign="center" color="gray.500" fontSize="xs">
      <Text>© 2026 Ryan Huston. NextWatch v{version}</Text>
    </Box>
  );
};