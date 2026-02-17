/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * theme.ts
 *
 * Global Design System Configuration.
 *
 * This file extends the default Chakra UI system to provide custom semantic tokens,
 * global styles, and component overrides.
 *
 * NOT IN USE
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

/**
 * Custom Configuration Object.
 * Merged with Chakra's defaults to create the final design system.
 */
const customConfig = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        'bg': {
          value: {
            _white: '{colors.white}',
            _dark: '{colors.gray.900}'
          },
        },
      },
    },
  },
});

/**
 * The exported System object.
 * To be passed to the <ChakraProvider> at the application root.
 */
export const system = createSystem(defaultConfig, customConfig);