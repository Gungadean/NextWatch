/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * NotFoundPage.tsx
 *
 * A fallback UI displayed when the user navigates to a URL that does not exist.
 */

import {AbsoluteCenter, Button, Heading, VStack, Text} from "@chakra-ui/react";

/**
 * Renders a 404 Not Found error message.
 */
const NotFoundPage = () => {
  return (
    <AbsoluteCenter>
      <VStack gap={4}>
        <Heading size="7xl" fontWeight="bold">
          404
        </Heading>
        <Text fontSize="lg" color="gray.500">
          Page not found :)
        </Text>

        {/* Use Link to prevent full page reload */}
        <Button asChild colorPalette="blue" variant="surface">
          <a href="/">Return to Dashboard</a>
        </Button>
      </VStack>
    </AbsoluteCenter>
  );
}

export default NotFoundPage;