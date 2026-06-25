/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * App.tsx
 *
 * The Application Router.
 *
 * Defines the URL hierarchy and maps paths to specific Page components.
 * It utilizes nested routes to apply Authentication Guards (`AuthRoute`)
 * and UI Layouts (`AppLayout`) to specific sections of the app.
 */

import { Route, Routes } from 'react-router';

// Layouts & Guards
import AppLayout from './layouts/AppLayout.tsx';
import AuthRoute from "./routes/AuthRoute.tsx";
import AdminRoute from "./routes/AdminRoute.tsx";

// Public Pages
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

// Protected Pages
import CalendarPage from './pages/CalendarPage.tsx';
import BuilderPage from './pages/BuilderPage.tsx';
import RequestPage from './pages/RequestPage.tsx';
import PersonnelPage from './pages/PersonnelPage.tsx';
import PositionsPage from "./pages/PositionsPage.tsx";
import SettingsPage from './pages/SettingsPage.tsx';
import TemplateBuilderPage from "@/pages/TemplateBuilderPage.tsx";
import UserManagementPage from "@/pages/UserManagementPage.tsx";

/**
 * Main Application Component.
 */
const App = () => {
  return (
    <Routes>
      {/* --- Public Routes --- */}
      {/* Accessible without a session token */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* --- Protected Routes --- */}
      {/* Wrapped in AuthRoute to enforce login */}
      {/* Wrapped in AppLayout to provide Sidebar/Header */}
      <Route element={<AuthRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<CalendarPage />} />
          <Route path="requests" element={<RequestPage />} />
          <Route path="personnel" element={<PersonnelPage />} />
          <Route path="positions" element={<PositionsPage />} />

          {/* --- Admin Only Routes --- */}
          <Route element={<AdminRoute />}>
            <Route path="builder" element={<BuilderPage />} />
            <Route path="templates" element={<TemplateBuilderPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Route>

      {/* --- Fallback --- */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
};

export default App;
