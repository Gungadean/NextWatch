/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * timeUtils.ts
 *
 * Utilities for performing conversions and formatting of time strings.
 */

/**
 * Convert time string (in ISO 8601 format) to a locale string with end user's timezone.
 * @param timeString
 */
export const convertToLocalTime = (timeString: string) => {
  const date = new Date(timeString);

  return date.toLocaleString();
}