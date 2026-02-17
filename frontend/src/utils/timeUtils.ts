/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * timeUtils.ts
 *
 * A collection of stateless utility functions for normalizing, parsing,
 * and formatting date strings across the application.
 */

/**
 * Converts a UTC timestamp string into the user's local browser time string.
 * Handles cases where the backend might omit the 'Z' timezone indicator.
 */
export const convertToLocalTime = (timeString: string) => {
  let date: Date;

  // Append 'Z' if missing to force UTC conversion
  if (!timeString.endsWith("Z")) {
    date = new Date(timeString + "Z");
  } else {
    date = new Date(timeString);
  }

  return date.toLocaleString();
}

/**
 * Parses a YYYY-MM-DD string into a JavaScript Date object.
 * Explicitly splits the string to avoid browser inconsistencies with date parsing
 * (which might interpret hyphens as UTC and slashes as Local).
 */
export const parseDate = (str: string) => {
    const [y, m, d] = str.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
};

/**
 * Formats a Date object into a simple ISO date string (YYYY-MM-DD).
 * Useful for setting the value of <input type="date"> elements.
 */
export const toSimpleDate = (date: Date) => {
  const year = date.getFullYear();
  // Pad month with leading zero (remembering to add +1 for 0-indexing)
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);

  return `${year}-${month}-${day}`;
}

/**
 * Deconstructs an ISO date string into its numeric components.
 * Useful for calendar grid calculations where you need raw numbers.
 */
export const parseISODate = (dateStr: string) => {
  const cleanStr = String(dateStr).split('T')[0];
  const [y, m, d] = cleanStr.split('-').map(Number);
  return { year: y, month: m, day: d };
};