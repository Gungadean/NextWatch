/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * main.tsx
 *
 * Entry point of the React application.
 * Bootstraps the React root and wraps the app in global contexts.
 */

import { Provider } from './components/ui/provider'
import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router';
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import {AuthProvider} from "./context/AuthProvider.tsx";
import {Toaster} from "./components/ui/toaster.tsx";
import { ScheduleGenerationProvider } from './features/schedule/context/ScheduleGenerationProvider.tsx';
import { GenerationProgressOverlay } from './features/schedule/components/GenerationProgressOverlay.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <AuthProvider>
        <BrowserRouter>
          <ScheduleGenerationProvider>
            <App />
            <Toaster />
            <GenerationProgressOverlay />
          </ScheduleGenerationProvider>
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  </StrictMode>,
)