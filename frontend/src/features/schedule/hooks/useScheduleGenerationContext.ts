/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { ScheduleResponse, ScheduleDraft } from '../scheduleApi.ts';

export interface ScheduleGenerationState {
  isGenerating: boolean;
  genProgress: number;
  genStep: number;
  genTotal: number;
  genScore: number;
  isOverlayMinimized: boolean;
  currentDraftData: ScheduleResponse | ScheduleDraft | null;
  selectedDraftId: string | null;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;
  setGenProgress: Dispatch<SetStateAction<number>>;
  setGenStep: Dispatch<SetStateAction<number>>;
  setGenTotal: Dispatch<SetStateAction<number>>;
  setGenScore: Dispatch<SetStateAction<number>>;
  setIsOverlayMinimized: Dispatch<SetStateAction<boolean>>;
  setCurrentDraftData: Dispatch<SetStateAction<ScheduleResponse | ScheduleDraft | null>>;
  setSelectedDraftId: Dispatch<SetStateAction<string | null>>;
}

export const ScheduleGenerationContext = createContext<ScheduleGenerationState | undefined>(undefined);

export const useScheduleGenerationContext = () => {
  const context = useContext(ScheduleGenerationContext);
  if (!context) throw new Error('useScheduleGenerationContext must be used within a ScheduleGenerationProvider');
  return context;
};
