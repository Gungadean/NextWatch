/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * AppLayout.tsx
 *
 * Defines the main application structure.
 */

import { Outlet } from 'react-router';
import Sidebar from '../components/Sidebar';
import { Container, HStack, VStack} from "@chakra-ui/react";
import Header from "../components/Header.tsx";

/**
 * Main layout component.
 * Wraps all authenticated app pages with sidebar and header.
 * Renders the active route via the outlet.
 */
const AppLayout = () => {
  return (
    <Container padding="0" height="100vh" maxWidth="1920px">
      <HStack height="100%" alignItems="stretch">
        {/* Adds collapsible sidebar on left of screen */}
        <Sidebar />

        {/* Adds header at top and the active route on the rest of the page */}
        <VStack flex="1" alignItems="stretch" padding="2" width="100%">
          <Header />
          <Outlet />
        </VStack>
      </HStack>
    </Container>
  )
};

export default AppLayout;