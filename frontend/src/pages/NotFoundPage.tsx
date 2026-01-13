/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * NotFoundPage.tsx
 *
 * Simple 404 page.
 */

import {AbsoluteCenter, Button, Heading, VStack} from "@chakra-ui/react";

/**
 * Basic 404 page with redirect button back to dashboard.
 */
const NotFoundPage = () => {
  return (
    <AbsoluteCenter>
      <VStack>
        <Heading size="7xl" fontWeight="bold" paddingBottom="20px">404 :)</Heading>
        <Button asChild>
          <a href="/">Return to Dashboard</a>
        </Button>
      </VStack>
    </AbsoluteCenter>
  );
}

export default NotFoundPage;