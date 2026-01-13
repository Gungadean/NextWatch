/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * Header.tsx
 *
 * Display top bar with theme toggle and account actions.
 */

import {HStack, IconButton} from "@chakra-ui/react";
import {useColorMode} from "./ui/color-mode.tsx";
import {LuMoon, LuSun, LuLogOut, LuUser} from "react-icons/lu";
import {toaster} from "./ui/toaster.tsx";
import {useNavigate} from "react-router";
import {useAuth} from "../hooks/useAuth.ts";

/**
 * Main application header.
 * Allows toggling theme, viewing profile, and logging the user out.
 */
const Header = () => {
  const { toggleColorMode, colorMode } = useColorMode()
  const navigate = useNavigate();
  const { logout } = useAuth();

  const showProfile = async () => {
    // TODO: Replace this with actual profile modal.
    toaster.create({ title: "This will show a profile modal eventually.", type: "success" });
  }

  const handleLogout = async () => {
    logout();
    navigate("/login");
  }

  return (
    <HStack justify="right" gap="2">
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