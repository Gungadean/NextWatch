/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * theme.ts
 *
 * Configuration for defining default themes for application (currently not used).
 */

import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

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

export const system = createSystem(defaultConfig, customConfig);