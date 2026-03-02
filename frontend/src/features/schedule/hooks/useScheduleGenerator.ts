/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) 2026. Ryan Huston
 */

/**
 * useScheduleGenerator.ts
 *
 * Hook to handle create SSE stream for generate/regenerate functions.
 */

import React, { useState } from "react";
import { toaster } from "@/components/ui/toaster.tsx";
import { parseDate } from "@/utils/timeUtils.ts";
import {
  type ScheduleResponse,
  type ScheduleDraft,
  type DraftSummary,
  type Assignment,
  type ScheduleRequest,
  generateScheduleStream,
  generateRegenStream,
  getScheduleDraftSchedule,
  updateDraft, type GenerationProgress, type StreamError
} from "../scheduleApi.ts";


export interface GenerateConfig {
  startDate: string;
  endDate: string;
  positionIds: number[];
  minDaysOff: number;
  maxSteps: number;
}

export const useScheduleGenerator = (
  setDraftSummaries: React.Dispatch<React.SetStateAction<DraftSummary[]>>,
  setCalendarViewDate: React.Dispatch<React.SetStateAction<Date>>,
  setStartDate: React.Dispatch<React.SetStateAction<string>>,
  setEndDate: React.Dispatch<React.SetStateAction<string>>
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [currentDraftData, setCurrentDraftData] = useState<ScheduleResponse | ScheduleDraft | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  /**
   * Handle generating a new draft schedule.
   */
  const generateSchedule = async (
    config: GenerateConfig,
    isRegen: boolean = false,
    regenDates: string[] = []
  ): Promise<void> => {
    if (config.positionIds.length === 0) {
      toaster.create({ title: "No positions selected. Cannot generate.", type: "error" });
      return;
    }

    // If regenerating, ensure we actually have a draft and dates to work with
    if (isRegen && (!currentDraftData || regenDates.length === 0)) {
      toaster.create({ title: "Cannot regenerate without a valid draft and selected dates.", type: "error" });
      return;
    }

    setIsGenerating(true);
    setGenProgress(0);

    // Only clear the current data if it's a brand-new generation
    if (!isRegen) {
      setCurrentDraftData(null);
    }

    try {
      // Build the frozen assignments array
      let frozenAssignments: Assignment[] = [];
      if (isRegen && currentDraftData) {
        // Keep every assignment except the selected regen dates.
        frozenAssignments = currentDraftData.assignments.filter(
          (assignment) => !regenDates.includes(assignment.date)
        );
      }

      const requestData: ScheduleRequest = {
        start_date: config.startDate,
        end_date: config.endDate,
        position_ids: config.positionIds,
        min_days_off: config.minDaysOff || 1,
        max_steps: config.maxSteps || 10000,
        frozen_assignments: frozenAssignments
      };

      const streamFunction = (requestData: ScheduleRequest,
        onProgress: (data: GenerationProgress) => void,
        onResult: (data: ScheduleResponse) => void,
        onError: (err: StreamError) => void
      ) => isRegen
            ? generateRegenStream(selectedDraftId!, requestData, onProgress, onResult, onError)
            : generateScheduleStream(requestData, onProgress, onResult, onError);

      await streamFunction(
        requestData,
        (progress) => setGenProgress(progress.percent),
        (result) => {
          setCurrentDraftData(result);

          const newSummary: DraftSummary = {
            public_id: result.draft_id || "Undefined",
            created_at: result.created_at || new Date().toISOString(),
            start_date: config.startDate,
            end_date: config.endDate,
            score: result.final_score || -1
          };

          // Update draft summaries based on if it's a new draft or a regen
          if (isRegen) {
            // If the backend overwrites the existing draft, just update the summary in the list
            setDraftSummaries(prev => prev.map(draft => draft.public_id === result.draft_id ? newSummary : draft));
          } else {
            // If it's a brand-new generation, add it to the top of the list
            setDraftSummaries(prev => [newSummary, ...prev]);
          }

          setSelectedDraftId(newSummary.public_id);
          setIsGenerating(false);
          setCalendarViewDate(parseDate(config.startDate));
          toaster.create({ title: isRegen ? "Schedule Regenerated!" : "Schedule Generated!", type: "success" });
        },
        (error) => {
          setIsGenerating(false);
          toaster.create({ title: "Generation Error", description: error.message, type: "error" });
        }
      );
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  /**
   * Loads a specific draft from history into the main view.
   */
  const selectDraft = async (id: string) => {
    if (id === selectedDraftId) return; // Don't reload if already selected

    setSelectedDraftId(id);
    setIsLoadingDraft(true);
    setCurrentDraftData(null);

    try {
      const draft_data = await getScheduleDraftSchedule(id);
      setCurrentDraftData(draft_data);

      setStartDate(draft_data.start_date);
      setEndDate(draft_data.end_date);
      setCalendarViewDate(parseDate(draft_data.start_date));
    } catch {
      toaster.create({ title: "Could not load draft details", type: "error" });
    } finally {
      setIsLoadingDraft(false);
    }
  };

  /**
   * Intercepts edits from the DayEditModal, updates the UI,
   * and saves the changes to the backend database.
   */
  const updateCurrentDraft = async (updatedDraft: ScheduleResponse | ScheduleDraft | null | undefined) => {
    if (!updatedDraft || !selectedDraftId) return;

    const previousData = currentDraftData;

    setCurrentDraftData(updatedDraft);

    try {
      await updateDraft(selectedDraftId, updatedDraft.assignments);
    } catch {
      toaster.create({
        title: "Failed to save draft changes",
        description: "Your changes couldn't be saved to the database.",
        type: "error"
      });
      setCurrentDraftData(previousData);
    }
  };

  return {
    isGenerating,
    genProgress,
    isLoadingDraft,
    currentDraftData,
    setCurrentDraftData,
    selectedDraftId,
    setSelectedDraftId,
    generateSchedule,
    selectDraft,
    updateCurrentDraft
  };
};