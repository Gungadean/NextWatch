/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ScheduleResponse, ScheduleDraft } from '../scheduleApi.ts';

interface ScheduleGenerationState {
  isGenerating: boolean;
  genProgress: number;
  genStep: number;
  genTotal: number;
  genScore: number;
  isOverlayMinimized: boolean;
  currentDraftData: ScheduleResponse | ScheduleDraft | null;
  selectedDraftId: string | null;
  setIsGenerating: (isGen: boolean) => void;
  setGenProgress: (progress: number) => void;
  setGenStep: (step: number) => void;
  setGenTotal: (total: number) => void;
  setGenScore: (score: number) => void;
  setIsOverlayMinimized: (isMin: boolean) => void;
  setCurrentDraftData: (data: ScheduleResponse | ScheduleDraft | null) => void;
  setSelectedDraftId: (id: string | null) => void;
}

const ScheduleGenerationContext = createContext<ScheduleGenerationState | undefined>(undefined);

export const ScheduleGenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genScore, setGenScore] = useState(0);
  const [isOverlayMinimized, setIsOverlayMinimized] = useState(false);
  const [currentDraftData, setCurrentDraftData] = useState<ScheduleResponse | ScheduleDraft | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  return (
    <ScheduleGenerationContext.Provider value={{
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
    }}>
      {children}
    </ScheduleGenerationContext.Provider>
  );
};

export const useScheduleGenerationContext = () => {
  const context = useContext(ScheduleGenerationContext);
  if (!context) throw new Error('useScheduleGenerationContext must be used within a ScheduleGenerationProvider');
  return context;
};
