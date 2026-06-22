/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import React, { useState, type ReactNode } from 'react';
import type { ScheduleResponse, ScheduleDraft } from '../scheduleApi.ts';
import { ScheduleGenerationContext } from '../hooks/useScheduleGenerationContext.ts';

export const ScheduleGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genScore, setGenScore] = useState(0);
  const [isOverlayMinimized, setIsOverlayMinimized] = useState(false);
  const [currentDraftData, setCurrentDraftData] = useState<ScheduleResponse | ScheduleDraft | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const contextValue = React.useMemo(() => ({
      isGenerating,
      genProgress,
      genStep,
      genTotal,
      genScore,
      isOverlayMinimized,
      currentDraftData,
      selectedDraftId,
      setIsGenerating,
      setGenProgress,
      setGenStep,
      setGenTotal,
      setGenScore,
      setIsOverlayMinimized,
      setCurrentDraftData,
      setSelectedDraftId
  }), [
    isGenerating, genProgress, genStep, genTotal, genScore, 
    isOverlayMinimized, currentDraftData, selectedDraftId
  ]);

  return (
    <ScheduleGenerationContext.Provider value={contextValue}>
      {children}
    </ScheduleGenerationContext.Provider>
  );
};
