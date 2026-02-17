/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * Header.tsx
 *
 * Renders the header component with global app actions and color mode toggle.
 */

import {HStack, IconButton} from "@chakra-ui/react";
import {useColorMode} from "./ui/color-mode.tsx";
import {LuMoon, LuSun, LuLogOut, LuUser} from "react-icons/lu";
import {toaster} from "./ui/toaster.tsx";
import {useNavigate} from "react-router";
import {useAuth} from "../hooks/useAuth.ts";

/**
 * Header Component
 *
 * Displays the top navigation bar containing global application actions
 */
const Header = () => {
  const { toggleColorMode, colorMode } = useColorMode()
  const navigate = useNavigate();
  const { logout } = useAuth();

  /**
   * Placeholder handler for profile interactions.
   * Currently just triggers a toast notification for feedback.
   */
  const showProfile = async () => {
    // TODO: Replace this with actual profile modal.
    toaster.create({
      title: "This will show a profile modal eventually.",
      type: "success"
    });
  }

  /**
   * Handles logout process.
   */
  const handleLogout = async () => {
    logout();
    navigate("/login");
  }

  return (
    <HStack justify="right" gap="2">
      {/* Button for toggling color mode (light/dark) */}
      <IconButton aria-label="Toggle Theme" onClick={toggleColorMode} variant="outline" size="sm">
        {colorMode === "light" ? <LuSun /> : <LuMoon />}
      </IconButton>

      <IconButton aria-label="Show Profile" onClick={showProfile} variant="outline" size="sm">
        <LuUser />
      </IconButton>

      <IconButton aria-label="Logout User" onClick={handleLogout} variant="outline" size="sm">
        <LuLogOut />
      </IconButton>
    </HStack>
  )
}

export default Header;